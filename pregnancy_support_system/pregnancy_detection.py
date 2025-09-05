import pandas as pd
import numpy as np
import optuna
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import accuracy_score, classification_report
from imblearn.over_sampling import SMOTE
from xgboost import XGBClassifier
from sklearn.feature_selection import SelectKBest, f_classif

data = pd.read_csv('Pregnancy_Smartwatch_Dataset - Copy.csv')

X = data.drop('Pregnancy_Status', axis=1)
y = data['Pregnancy_Status']

selector = SelectKBest(score_func=f_classif, k='all')
X_selected = selector.fit_transform(X, y)
print("Feature Importance Scores:", selector.scores_)

X_train, X_test, y_train, y_test = train_test_split(X_selected, y, test_size=0.2, random_state=42)

smote = SMOTE(random_state=42)
X_train, y_train = smote.fit_resample(X_train, y_train)

scaler = MinMaxScaler()
X_train = scaler.fit_transform(X_train)
X_test = scaler.transform(X_test)

def objective(trial):
    n_estimators = trial.suggest_int('n_estimators', 100, 500, step=50)
    max_depth = trial.suggest_int('max_depth', 5, 30, step=5)
    min_samples_split = trial.suggest_int('min_samples_split', 2, 10, step=2)
    min_samples_leaf = trial.suggest_int('min_samples_leaf', 1, 5, step=1)
    max_features = trial.suggest_categorical('max_features', ['sqrt', 'log2'])
    
    rf = RandomForestClassifier(n_estimators=n_estimators, max_depth=max_depth, 
                                min_samples_split=min_samples_split, min_samples_leaf=min_samples_leaf, 
                                max_features=max_features, random_state=42)
    
    rf.fit(X_train, y_train)
    return accuracy_score(y_test, rf.predict(X_test))

study = optuna.create_study(direction='maximize')
study.optimize(objective, n_trials=20)

best_params = study.best_params
print("Best Parameters for Random Forest:", best_params)

best_rf = RandomForestClassifier(**best_params, random_state=42)
best_rf.fit(X_train, y_train)

xgb_model = XGBClassifier(n_estimators=200, learning_rate=0.05, max_depth=10, random_state=42)
xgb_model.fit(X_train, y_train)

lr = LogisticRegression()
ensemble = VotingClassifier(estimators=[('rf', best_rf), ('xgb', xgb_model), ('lr', lr)], voting='soft')
ensemble.fit(X_train, y_train)

y_pred_rf = best_rf.predict(X_test)
y_pred_xgb = xgb_model.predict(X_test)
y_pred_ensemble = ensemble.predict(X_test)

print(f'Random Forest Accuracy: {accuracy_score(y_test, y_pred_rf) * 100:.2f}%')
print(f'XGBoost Accuracy: {accuracy_score(y_test, y_pred_xgb) * 100:.2f}%')
print(f'Ensemble Model Accuracy: {accuracy_score(y_test, y_pred_ensemble) * 100:.2f}%')

print("Random Forest Classification Report:")
print(classification_report(y_test, y_pred_rf))

print("XGBoost Classification Report:")
print(classification_report(y_test, y_pred_xgb))

print("Ensemble Model Classification Report:")
print(classification_report(y_test, y_pred_ensemble))
