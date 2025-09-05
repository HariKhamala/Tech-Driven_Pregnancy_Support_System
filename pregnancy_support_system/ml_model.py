from imblearn.over_sampling import SMOTE
from xgboost import XGBClassifier
from sklearn.model_selection import GridSearchCV, train_test_split
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score, roc_curve
from sklearn.preprocessing import MinMaxScaler, LabelEncoder, OneHotEncoder
import pandas as pd
from sklearn.preprocessing import label_binarize
import numpy as np
import joblib
import traceback
import matplotlib.pyplot as plt


def train_and_save_model():
    try:
        data = pd.read_csv('Pregnancy_Risk_Prediction_Dataset.csv')

        label_encoder = LabelEncoder()
        data['RiskLevel'] = label_encoder.fit_transform(data['RiskLevel'])

        categorical_cols = data.select_dtypes(include=['object']).columns.tolist()
        if 'RiskLevel' in categorical_cols:
            categorical_cols.remove('RiskLevel')
        if 'Hormonal_Symptoms' in categorical_cols:
            categorical_cols.remove('Hormonal_Symptoms')

        data = data.drop(columns=['Hormonal_Symptoms'], errors='ignore')
        original_categorical_cols = categorical_cols.copy()

        onehot_encoder = OneHotEncoder(handle_unknown='ignore', sparse_output=False)
        if categorical_cols:
            encoded_features = onehot_encoder.fit_transform(data[categorical_cols])
            encoded_df = pd.DataFrame(encoded_features, columns=onehot_encoder.get_feature_names_out(categorical_cols))
            data = pd.concat([data.drop(columns=categorical_cols), encoded_df], axis=1)

        X = data.drop(columns=['RiskLevel'])
        y = data['RiskLevel']

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

        scaler = MinMaxScaler()
        X_train = pd.DataFrame(scaler.fit_transform(X_train), columns=X.columns)
        X_test = pd.DataFrame(scaler.transform(X_test), columns=X.columns)

        smote = SMOTE(random_state=42, sampling_strategy='auto')
        X_train, y_train = smote.fit_resample(X_train, y_train)

        class_weights = dict(zip(np.unique(y_train), np.bincount(y_train)))
        class_weights = {k: max(class_weights.values()) / v for k, v in class_weights.items()}

        param_grid = {
            'n_estimators': [100, 200, 300],
            'max_depth': [3, 5, 7],
            'learning_rate': [0.01, 0.1, 0.2],
            'subsample': [0.8, 1.0],
            'colsample_bytree': [0.8, 1.0],
        }
        xgb_model = GridSearchCV(
            XGBClassifier(random_state=42),
            param_grid,
            cv=5,
            scoring='f1_weighted',
            n_jobs=-1
        )
        xgb_model.fit(X_train, y_train)

        joblib.dump(xgb_model.best_estimator_, "pregnancy_risk_model.pkl")
        joblib.dump(onehot_encoder, "onehot_encoder.pkl")
        joblib.dump(label_encoder, "label_encoder.pkl")
        joblib.dump(scaler, "scaler.pkl")
        joblib.dump(original_categorical_cols, "categorical_cols.pkl")

        print("✅ Machine learning model trained and saved successfully.")

        y_pred = xgb_model.best_estimator_.predict(X_test)
        print("Classification Report:\n", classification_report(y_test, y_pred))
        print("Confusion Matrix:\n", confusion_matrix(y_test, y_pred))

        y_test_bin = label_binarize(y_test, classes=[0, 1, 2])
        y_prob = xgb_model.best_estimator_.predict_proba(X_test)
        fpr, tpr, roc_auc = {}, {}, {}
        for i in range(y_test_bin.shape[1]):
            fpr[i], tpr[i], _ = roc_curve(y_test_bin[:, i], y_prob[:, i])
            roc_auc[i] = roc_auc_score(y_test_bin[:, i], y_prob[:, i])

        plt.figure()
        for i in range(y_test_bin.shape[1]):
            plt.plot(fpr[i], tpr[i], label=f'Class {i} (AUC = {roc_auc[i]:.2f})')
        plt.plot([0, 1], [0, 1], linestyle='--', color='gray')
        plt.xlabel('False Positive Rate')
        plt.ylabel('True Positive Rate')
        plt.title('ROC Curve')
        plt.legend()
        plt.show()

        roc_auc_overall = roc_auc_score(y_test_bin, y_prob, multi_class='ovr', average='macro')
        print("Overall ROC AUC Score:", roc_auc_overall)

        return X_test

    except Exception as e:
        print("❌ Error training machine learning model:", e)
        traceback.print_exc()
        return None

def predict_risk_level(input_data):
    try:
        rf_model = joblib.load("pregnancy_risk_model.pkl")
        onehot_encoder = joblib.load("onehot_encoder.pkl")
        label_encoder = joblib.load("label_encoder.pkl")
        scaler = joblib.load("scaler.pkl")
        original_categorical_cols = joblib.load("categorical_cols.pkl")

        input_df = pd.DataFrame([input_data])

        missing_categorical_cols = set(original_categorical_cols) - set(input_df.columns)
        for col in missing_categorical_cols:
            input_df[col] = ""

        if original_categorical_cols:
            input_encoded = onehot_encoder.transform(input_df[original_categorical_cols])
            input_encoded_df = pd.DataFrame(input_encoded, columns=onehot_encoder.get_feature_names_out(original_categorical_cols))
            input_df = pd.concat([input_df.drop(columns=original_categorical_cols), input_encoded_df], axis=1)

        for col in scaler.feature_names_in_:
            if col not in input_df.columns:
                input_df[col] = 0
        input_df = input_df[scaler.feature_names_in_]
        print("Expected Features:", scaler.feature_names_in_)
        print("Actual Features:", input_df.columns)

        input_scaled = scaler.transform(input_df)

        prediction = rf_model.predict(input_scaled)
        predicted_label = label_encoder.inverse_transform(prediction)

        return predicted_label[0]

    except Exception as e:
        print("❌ Error predicting risk level:", e)
        traceback.print_exc()
        return None