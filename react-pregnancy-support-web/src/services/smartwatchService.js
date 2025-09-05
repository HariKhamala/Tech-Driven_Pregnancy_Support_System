import axios from 'axios';
import { db } from '../firebase/config';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  doc,
  getDoc,
  serverTimestamp
} from 'firebase/firestore';

const ML_API_URL = 'http://127.0.0.1:8000';
const GOOGLE_FIT_SCOPES = [
  'https://www.googleapis.com/auth/fitness.activity.read',
  'https://www.googleapis.com/auth/fitness.body.read',
  'https://www.googleapis.com/auth/fitness.heart_rate.read',
  'https://www.googleapis.com/auth/fitness.sleep.read'
];
const GOOGLE_CLIENT_ID = '576168284006-gc3eju5v54k5hp3eo10dudo5sns0gucj.apps.googleusercontent.com';

export const smartwatchService = {
  // =====================
  // Google Fit Authentication
  // =====================
  async initGoogleFit() {
    return new Promise((resolve, reject) => {
      if (window.gapi) {
        window.gapi.load('client:auth2', () => {
          window.gapi.client.init({
            clientId: GOOGLE_CLIENT_ID,
            scope: GOOGLE_FIT_SCOPES.join(' ')
          }).then(() => {
            resolve();
          }).catch(reject);
        });
      } else {
        reject(new Error('Google API not loaded'));
      }
    });
  },

  isGoogleFitInitialized() {
    return !!window.gapi?.auth2?.getAuthInstance();
  },

  isGoogleFitConnected() {
    return window.gapi?.auth2?.getAuthInstance()?.isSignedIn?.get() || false;
  },

  async connectGoogleFit() {
    const clientId = '576168284006-gc3eju5v54k5hp3eo10dudo5sns0gucj.apps.googleusercontent.com';
    const scopes = [
      'https://www.googleapis.com/auth/fitness.activity.read',
      'https://www.googleapis.com/auth/fitness.body.read',
      'https://www.googleapis.com/auth/fitness.heart_rate.read',
      'https://www.googleapis.com/auth/fitness.sleep.read'
    ];
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent('http://localhost:3000/oauth2callback')}&` +
      `response_type=token&` +
      `scope=${encodeURIComponent(scopes.join(' '))}&` +
      `prompt=consent`;
    
    window.location.href = authUrl;
  },

  // Add this new method to handle the callback
  handleGoogleFitCallback() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const token = params.get('access_token');
    
    if (token) {
      localStorage.setItem('googleFitToken', token);
      // Clean the URL and redirect back to dashboard
      window.location.href = '/dashboard'; // Or your dashboard route
      return true;
    }
    return false;
  },


  async authenticateGoogleFit() {
    if (!window.gapi) await this.initGoogleFit();
    return window.gapi.auth2.getAuthInstance().signIn();
  },
  // =====================
  // Core Health Data Methods
  // =====================
  
  // Check if user has existing smartwatch data
  async hasExistingData(userId) {
    const q = query(
      collection(db, 'smartwatchData'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  },

  // Generate mock data if no real data exists
  async generateMockDataIfNeeded(userId) {
    const hasData = await this.hasExistingData(userId);
    if (!hasData) return this.generateMockData(userId);
    return null;
  },

  // =====================
  // Data Fetching (Google Fit + Mock Fallback)
  // =====================
  async fetchHealthData(userId) {
    try {
      if (window.gapi?.auth2?.getAuthInstance()?.isSignedIn?.get()) {
        return await this.fetchGoogleFitData();
      }
      return await this.generateMockData(userId);
    } catch (error) {
      console.error("Fetch failed:", error);
      return this.generateMockData(userId);
    }
  },


  async fetchGoogleFitData() {
    const now = Date.now();
    const oneDayAgo = now - 86400000;
    try {
      // Get the auth instance
      const accessToken = localStorage.getItem('googleFitToken');
      if (!accessToken) throw new Error("No access token available");
  
  
      const [heartRate, steps, sleep,calories] = await Promise.all([
        this._fetchGoogleFitMetric(accessToken, 'derived:com.google.heart_rate.bpm', oneDayAgo, now),
        this._fetchGoogleFitMetric(accessToken, 'derived:com.google.step_count.delta', oneDayAgo, now),
        this._fetchGoogleFitMetric(accessToken, 'derived:com.google.sleep.segment', oneDayAgo, now),
        this.fetchCaloriesBurned(accessToken, oneDayAgo, now)
      ]);
  
      return {
        heartRate: heartRate?.value || 0,
        stepCount: steps?.value || 0,
        sleepHours: this._calculateSleepHours(sleep),
        caloricBurn: calories,
        hrv: 60 - ((heartRate?.value || 72) / 2),
        respRate: ((heartRate?.value || 72) / 4) + (Math.random() * 4 - 2),
        spo2: 97,
        bodyTemp: 98.0,
        bloodPressure: { systolic: 120, diastolic: 80 },
        timestamp: new Date()
      };
    } catch (error) {
      console.error("Google Fit error:", error);
      throw error;
    }
  },
  
  _calculateAverageHeartRate(heartRateData) {
    if (!heartRateData || !heartRateData.point) return null;
    const values = heartRateData.point.map(p => p.value[0].fpVal);
    return values.reduce((a, b) => a + b, 0) / values.length;
  },
  
  async _fetchGoogleFitMetric(accessToken, dataType, start, end) {
    const response = await axios.get(
      `https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate`, {
        headers: { 
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          aggregateBy: [{
            dataTypeName: dataType,
          }],
          bucketByTime: { durationMillis: 86400000 }, // 1 day
          startTimeMillis: start,
          endTimeMillis: end
        }
      }
    );
    return response.data;
  },
  _calculateSleepHours(sleepData) {
    if (!sleepData) return 7; // Default
    // Calculate total sleep duration from sleep segments
    return sleepData.segment.reduce((total, segment) => {
      return total + (segment.endTimeNanos - segment.startTimeNanos) / 3.6e12;
    }, 0);
  },



  // =====================
  // Data Processing
  // =====================
  
  async prepareMLInput(userId, healthData) {
    const userData = await this.getUserProfileData(userId);
    
    return {
      // From Health Data
      HeartRate: healthData.heartRate,
      HRV: healthData.hrv,
      Resp_Rate: healthData.respRate,
      SpO2: healthData.spo2,
      Sleep_Hours: healthData.sleepHours,
      Step_Count: healthData.stepCount,
      Caloric_Burn: healthData.caloricBurn,
      BodyTemp: healthData.bodyTemp,
      SystolicBP: healthData.bloodPressure?.systolic || userData.systolicBP,
      DiastolicBP: healthData.bloodPressure?.diastolic || userData.diastolicBP,
      
      // From User Profile
      Age: userData.age,
      Cycle_Length: userData.cycleLength,
      Hormonal_Symptoms: userData.hormonalSymptoms,
      BS: this.adjustBS(userData)
    };
  },

  // =====================
  // User Profile Methods
  // =====================
  
  async getUserProfileData(userId) {
    const userDoc = await getDoc(doc(db, 'users', userId));
    const defaultData = {
      age: 25,
      systolicBP: 120,
      diastolicBP: 80,
      bodyTemp: 98.0,
      cycleLength: 28,
      lastPeriodDate: null,
      hormonalSymptoms: 'Moderate',
      bsBaseline: 5.0
    };
    return userDoc.exists() ? { ...defaultData, ...userDoc.data() } : defaultData;
  },

  calculateCyclePhase(userData) {
    if (!userData.lastPeriodDate) return null;
    const cycleDay = (Date.now() - new Date(userData.lastPeriodDate)) / (1000 * 60 * 60 * 24) % userData.cycleLength;
    if (cycleDay <= 5) return 'menstrual';
    if (cycleDay <= 14) return 'follicular';
    if (cycleDay <= 17) return 'ovulation';
    return 'luteal';
  },

  adjustBS(userData) {
    const phase = this.calculateCyclePhase(userData);
    const adjustments = { menstrual: -0.5, follicular: -1, ovulation: 0, luteal: 2 };
    return userData.bsBaseline + (adjustments[phase] || 0);
  },

  // =====================
  // Mock Data Generation
  // =====================
  
  async generateMockData(userId) {
    const mockData = {
      heartRate: 70 + Math.floor(Math.random() * 30),
      hrv: 40 + Math.random() * 20,
      respRate: 12 + Math.floor(Math.random() * 8),
      spo2: 95 + Math.floor(Math.random() * 5),
      sleepHours: 4 + Math.random() * 4,
      stepCount: 2000 + Math.floor(Math.random() * 8000),
      caloricBurn: 1500 + Math.floor(Math.random() * 1000),
      bodyTemp: 97 + Math.random() * 2.5,
      bloodPressure: {
        systolic: 110 + Math.floor(Math.random() * 30),
        diastolic: 70 + Math.floor(Math.random() * 20)
      },
      timestamp: new Date()
    };
    
    if (userId) await this.storeSmartwatchData(userId, mockData);
    return mockData;
  },

  // =====================
  // Storage & Prediction
  // =====================
  
  async storeSmartwatchData(userId, data) {
    const docRef = await addDoc(collection(db, 'smartwatchData'), {
      userId,
      ...data,
      timestamp: serverTimestamp()
    });
    return docRef.id;
  },

  async getPrediction(userId, data) {
    const mlInput = await this.prepareMLInput(userId, data);
    const response = await axios.post(`${ML_API_URL}/predict-risk`, mlInput);
    return response.data;
  },

  async generateNutritionPlan(userId, riskLevel, doctorNotes = '') {
    const response = await axios.post(`${ML_API_URL}/generate-nutrition-plan`, {
      risk_level: riskLevel,
      doctor_notes: doctorNotes
    });
    return response.data.plan;
  },

  // =====================
  // Compatibility Checks
  // =====================
  
  isHealthConnectAvailable() {
    return typeof window.HealthConnect !== 'undefined';
  },

  // Legacy HealthKit check (keep if needed for iOS)
  isHealthKitAvailable() {
    return typeof window.HealthKit !== 'undefined';
  }
};