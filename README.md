# 🤰 Tech-Driven Pregnancy Support System

An AI-powered pregnancy support platform that integrates **wearable IoT health data**, **machine learning algorithms**, and **personalized nutrition recommendations**.  
This system provides real-time pregnancy risk prediction, evidence-based nutrition guidance, and doctor dashboards for monitoring maternal health.

---

## 📌 Key Features

- **Wearable IoT Data Integration**  
  Connects to Samsung smartwatches via the **Samsung Health SDK** to collect vital signs:
  - Heart rate, HRV, BP (systolic/diastolic), body temperature, respiratory rate  
  - SpO₂, sleep hours, step count, caloric burn  

- **Pregnancy Risk Prediction (ML)**  
  - Trained with health + lifestyle features (13 key inputs).  
  - Handles imbalanced data with **SMOTE**.  
  - Uses **XGBoost classifier** with hyperparameter tuning.  
  - Achieves **87% accuracy** and **0.968 ROC-AUC**.  
  - Outputs **Low, Moderate, or High Risk** categories.  

- **Nutrition Recommendation Engine**  
  - Integrates **doctor’s reports + risk prediction results**.  
  - Uses **FAISS vector database** of medical literature for knowledge grounding.  
  - Generates customized diet/nutrition plans using:
    - Hugging Face **Blenderbot** (open-source)  
    - OpenRouter **GPT-3.5-turbo** API  
  - Provides vitamins/mineral guidance, macronutrient breakdown, structured meal plans, hydration advice.  

- **Doctor’s Web Dashboard (React.js)**  
  - View patient history, predictions, ROC curves, confusion matrices.  
  - Track nutrition plans and monitoring trends.  

- **Mobile App (Flutter)**  
  - User-friendly pregnancy companion.  
  - Displays daily health insights, nutrition recommendations, and reminders.  

---

## 🧪 Machine Learning Outputs (Results)

**Classification Report:**
- Precision: 0.83 – 0.91  
- Recall: 0.83 – 0.96  
- F1-score: 0.86 – 0.89  
- Accuracy: **87%**

**Confusion Matrix:**
[[343 4 10]
[ 24 602 95]
[ 48 55 651]]


**ROC-AUC:**  
- Macro Average: **0.968**

**Doctor Report Example (Prediction + Nutrition):**
- Predicted Risk: **Moderate**  
- Diagnosed: Mild Hypertension, Iron Deficiency  
- Recommendations: Iron-rich foods, omega-3 fatty acids, calcium, prenatal vitamins, low sodium diet.  
- Meal Plan: Spinach omelette, quinoa salad with chicken, salmon with broccoli, etc.  

---

## 🏗️ Tech Stack

**Machine Learning:**
- Python, Scikit-learn, XGBoost, SMOTE, FAISS, Hugging Face, OpenRouter API  

**Backend:**
- Flask (for ML deployment & APIs)  

**Frontend:**
- Flutter (mobile app)  
- React.js (doctor dashboard)  

**Database & Storage:**
- Firebase (user management, app data)  
- FAISS (vector database for research papers)  

---
