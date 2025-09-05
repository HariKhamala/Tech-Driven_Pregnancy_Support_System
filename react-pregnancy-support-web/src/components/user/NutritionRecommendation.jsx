import React, { useState } from 'react';
import { db } from '../../firebase/config';
import { doc, collection, query, orderBy, limit, getDocs, setDoc, serverTimestamp, where } from 'firebase/firestore';
import { Button, Box, Typography, CircularProgress, Paper, Divider, Chip } from '@mui/material';
import { LocalDining, BreakfastDining, LunchDining, DinnerDining, Cake } from '@mui/icons-material';
import axios from 'axios';

const ML_API_URL = 'http://127.0.0.1:8000';

export default function NutritionRecommendation({ userId }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [recommendation, setRecommendation] = useState(null);
  const [error, setError] = useState(null);

  const getLatestPrediction = async (userId) => {
    const q = query(
      collection(db, `users/${userId}/predictions`),
      orderBy('timestamp', 'desc'),
      limit(1)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs[0]?.data() || null;
  };

  const getLatestReport = async (userId) => {
    const q = query(
      collection(db, `users/${userId}/reports`),
      orderBy('uploadedAt', 'desc'),
      limit(1)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs[0]?.data() || null;
  };

  const getLatestHealthData = async (userId) => {
    const q = query(
      collection(db, 'smartwatchData'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(1)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs[0]?.data() || null;
  };

  const storeRecommendation = async (userId, recommendation) => {
    const docRef = doc(collection(db, `users/${userId}/nutritionPlans`));
    await setDoc(docRef, {
      ...recommendation,
      timestamp: serverTimestamp()
    });
    return docRef.id;
  };

  const parseNutritionPlan = (planText) => {
    if (!planText) return {};
    
    // If the API returns structured data
    if (typeof planText === 'object') {
      return planText;
    }
    
    // Parse text response into structured format
    const result = {
      breakfast: '',
      lunch: '',
      dinner: '',
      snacks: '',
      recommendations: ''
    };

    // Split by meal markers
    const breakfastMatch = planText.match(/Breakfast:([\s\S]*?)(?=Lunch:|$)/i);
    const lunchMatch = planText.match(/Lunch:([\s\S]*?)(?=Dinner:|$)/i);
    const dinnerMatch = planText.match(/Dinner:([\s\S]*?)(?=Snacks:|Recommendations:|$)/i);
    const snacksMatch = planText.match(/Snacks:([\s\S]*?)(?=Recommendations:|$)/i);
    const recMatch = planText.match(/Recommendations:([\s\S]*)/i);

    if (breakfastMatch) result.breakfast = breakfastMatch[1].trim();
    if (lunchMatch) result.lunch = lunchMatch[1].trim();
    if (dinnerMatch) result.dinner = dinnerMatch[1].trim();
    if (snacksMatch) result.snacks = snacksMatch[1].trim();
    if (recMatch) result.recommendations = recMatch[1].trim();

    return result;
  };

  const generateRecommendation = async () => {
    if (!userId) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const prediction = await getLatestPrediction(userId);
      const report = await getLatestReport(userId);

      const requestData = {
        risk_level: prediction?.riskLevel || 'medium',
        doctor_notes: report?.text || ''
      };

      const response = await axios.post(
        `${ML_API_URL}/generate-nutrition-plan`,
        requestData,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        }
      );

      const parsedPlan = parseNutritionPlan(response.data.plan);
      
      const recommendation = {
        riskLevel: response.data.risk_level || requestData.risk_level,
        plan: parsedPlan,
        generatedAt: new Date().toISOString()
      };

      await storeRecommendation(userId, recommendation);
      setRecommendation(recommendation);

    } catch (error) {
      console.error('API Error:', error);
      setError(error.response?.data?.detail || 
              'Failed to generate recommendation. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const renderMealSection = (icon, title, content) => {
    if (!content) return null;
    
    return (
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          {icon}
          <Typography variant="h6" sx={{ ml: 1 }}>
            {title}
          </Typography>
        </Box>
        <Paper elevation={2} sx={{ p: 2, backgroundColor: '#f9f9f9' }}>
          <Typography>
            {content.split('\n').map((line, i) => (
              <span key={i}>
                {line}
                <br />
              </span>
            ))}
          </Typography>
        </Paper>
      </Box>
    );
  };

  return (
    <Box sx={{ p: 2 }}>
      <Button
        variant="contained"
        onClick={generateRecommendation}
        disabled={isGenerating}
        startIcon={isGenerating ? <CircularProgress size={20} /> : null}
        sx={{ mb: 3 }}
      >
        {isGenerating ? 'Generating...' : 'Generate Nutrition Plan'}
      </Button>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {recommendation && (
        <Paper elevation={3} sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <LocalDining color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h5" sx={{ ml: 1 }}>
              Your Nutrition Plan
            </Typography>
            <Chip 
              label={`${recommendation.riskLevel} risk`} 
              color={
                recommendation.riskLevel === 'high' ? 'error' : 
                recommendation.riskLevel === 'medium' ? 'warning' : 'success'
              } 
              sx={{ ml: 2 }}
            />
          </Box>

          <Divider sx={{ mb: 3 }} />

          {renderMealSection(<BreakfastDining color="primary" />, "Breakfast", recommendation.plan.breakfast)}
          {renderMealSection(<LunchDining color="primary" />, "Lunch", recommendation.plan.lunch)}
          {renderMealSection(<DinnerDining color="primary" />, "Dinner", recommendation.plan.dinner)}
          {renderMealSection(<Cake color="primary" />, "Snacks", recommendation.plan.snacks)}

          {recommendation.plan.recommendations && (
            <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid #eee' }}>
              <Typography variant="h6" sx={{ mb: 1 }}>Additional Recommendations</Typography>
              <Paper elevation={0} sx={{ p: 2, backgroundColor: '#f0f7ff' }}>
                <Typography>
                  {recommendation.plan.recommendations}
                </Typography>
              </Paper>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
}