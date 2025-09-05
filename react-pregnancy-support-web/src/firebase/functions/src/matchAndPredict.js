const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');

admin.initializeApp();

exports.matchAndPredict = functions.firestore
  .document('smartwatchData/{docId}')
  .onCreate(async (snap, context) => {
    const watchData = snap.data();
    const userDoc = await admin.firestore()
      .doc(`users/${watchData.userId}`)
      .get();

    // Transform data - replace defaults with user profile where available
    const mlInput = {
      // Direct mappings from watch
      HeartRate: watchData.heartRate,
      HRV: watchData.hrv,
      Resp_Rate: watchData.respirationRate,
      SpO2: watchData.spo2,
      Sleep_Hours: watchData.sleepHours,
      Step_Count: watchData.stepCount,
      Caloric_Burn: watchData.caloricBurn,
      BodyTemp: watchData.bodyTemp,
      
      // From user profile (replace defaults if available)
      Age: userDoc.data()?.age || 25,
      SystolicBP: watchData.bloodPressure?.systolic || 120,
      DiastolicBP: watchData.bloodPressure?.diastolic || 80,
      Cycle_Length: userDoc.data()?.cycleLength || 28,
      Hormonal_Symptoms: userDoc.data()?.hormonalSymptoms || 'Moderate',
      BS: userDoc.data()?.bloodSugar || 5.0
    };

    try {
      // Call your ML API (using localhost during development)
      const mlResponse = await axios.post(
        'http://127.0.0.1:8000/predict-risk', // Your local FastAPI endpoint
        mlInput,
        { headers: { 'Content-Type': 'application/json' } }
      );

      // Store prediction
      await admin.firestore()
        .collection(`users/${watchData.userId}/predictions`)
        .add({
          ...mlResponse.data,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          inputFeatures: mlInput
        });
        
    } catch (error) {
      console.error('Prediction error:', error);
      // Store error for debugging
      await admin.firestore()
        .collection(`users/${watchData.userId}/predictionErrors`)
        .add({
          error: error.message,
          input: mlInput,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
    }
  });