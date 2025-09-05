import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Button,
  Chip,
  CircularProgress,
  Tabs,
  Tab,
  Snackbar,
  Alert,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl
} from '@mui/material';
import { 
  doc, 
  getDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  setDoc,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import Chatbot from '../chat/Chatbot';
import RealtimeMetrics from './RealtimeMetrics';
import DoctorReport from './DoctorReport';
import NutritionRecommendation from './NutritionRecommendation';
import { smartwatchService } from '../../services/smartwatchService';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import WatchIcon from '@mui/icons-material/Watch';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import EventIcon from '@mui/icons-material/Event';
import FavoriteIcon from '@mui/icons-material/Favorite';

const UserDashboard = () => {
  const { currentUser } = useAuth();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [currentMetrics, setCurrentMetrics] = useState(null);
  const [reportUrl, setReportUrl] = useState(null);
  const [hasSmartwatchData, setHasSmartwatchData] = useState(false);
  const [hasReport, setHasReport] = useState(false);
  const [riskMessage, setRiskMessage] = useState('');

  const [healthConnectAvailable, setHealthConnectAvailable] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  const [profileForm, setProfileForm] = useState({
    age: 25,
    systolicBP: 120,
    diastolicBP: 80,
    lastPeriodDate: '',
    cycleLength: 28,
    hormonalSymptoms: 'Moderate',
    bsBaseline: 5.0
  });
  const [googleFitConnected, setGoogleFitConnected] = useState(false);
  const [googleFitInitialized, setGoogleFitInitialized] = useState(false);
  const [googleFitStatus, setGoogleFitStatus] = useState('checking');

  useEffect(() => {
    const handleToken = async () => {
      if (window.location.hash.includes('access_token')) {
        const success = smartwatchService.handleGoogleFitCallback();
        if (success) {
          setGoogleFitStatus('connected');
          showSnackbar('Google Fit connected!', 'success');
          // Immediately fetch data after connection
          await handleFetchHealthData();
        }
      }
    };
    handleToken();
  }, []);

  useEffect(() => {
    // Handle the OAuth callback
    if (window.location.hash.includes('access_token')) {
      const success = smartwatchService.handleGoogleFitCallback();
      if (success) {
        setGoogleFitStatus('connected');
        showSnackbar('Google Fit connected!', 'success');
      }
    }
  }, []);

  useEffect(() => {
    const checkGoogleFit = async () => {
      try {
        if (!smartwatchService.isGoogleFitInitialized()) {
          await smartwatchService.initGoogleFit();
        }
        
        if (smartwatchService.isGoogleFitConnected()) {
          setGoogleFitStatus('connected');
        } else {
          setGoogleFitStatus('disconnected');
        }
      } catch (error) {
        console.error('Google Fit init error:', error);
        setGoogleFitStatus('disconnected');
      }
    };

    // Load Google API if not present
    if (!window.gapi) {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = checkGoogleFit;
      script.onerror = () => setGoogleFitStatus('disconnected');
      document.body.appendChild(script);
    } else {
      checkGoogleFit();
    }
  }, []);

  const handleConnectGoogleFit = async () => {
    try {
      setGoogleFitStatus('checking');
      await smartwatchService.connectGoogleFit();
      setGoogleFitStatus('connected');
      showSnackbar('Google Fit connected successfully!', 'success');
    } catch (error) {
      setGoogleFitStatus('disconnected');
      showSnackbar('Failed to connect Google Fit', 'error');
    }
  };

  useEffect(() => {
    const initializeDashboard = async () => {
      if (currentUser) {
        try {
          // Check Health Connect availability
          setHealthConnectAvailable(smartwatchService.isHealthConnectAvailable());
          
          // Fetch user data
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserData(data);
            setProfileForm(prev => ({
              ...prev,
              ...data,
              lastPeriodDate: data.lastPeriodDate || ''
            }));
            if (data.riskLevel) setRiskMessage(getRiskMessage(data.riskLevel));
          }

          // Check for existing smartwatch data
          const dataQuery = query(
            collection(db, 'smartwatchData'),
            where('userId', '==', currentUser.uid),
            orderBy('timestamp', 'desc'),
            limit(1)
          );
          const querySnapshot = await getDocs(dataQuery);
          setHasSmartwatchData(!querySnapshot.empty);
        } catch (error) {
          console.error('Initialization error:', error);
          showSnackbar('Error loading dashboard data', 'error');
        } finally {
          setLoading(false);
        }
      }
    };
    initializeDashboard();
  }, [currentUser]);
  // Add this new handler for Google Fit
const handleGoogleFitAuth = async () => {
  try {
    await smartwatchService.authenticateGoogleFit();
    setGoogleFitConnected(true);
    showSnackbar('Google Fit connected successfully!', 'success');
  } catch (error) {
    showSnackbar('Failed to connect Google Fit', 'error');
  }
};

  // Save profile data
  const handleSaveProfile = async () => {
    try {
      await setDoc(doc(db, 'users', currentUser.uid), {
        ...profileForm,
        lastUpdated: new Date()
      }, { merge: true });
      setUserData(profileForm);
      setProfileDialogOpen(false);
      showSnackbar('Profile updated successfully!', 'success');
    } catch (error) {
      showSnackbar('Error saving profile', 'error');
    }
  };

  // Fetch health data (updated for Health Connect)
  const handleFetchHealthData = async () => {
    try {
      const healthData = await smartwatchService.fetchGoogleFitData(); // Changed from fetchHealthData
      await smartwatchService.storeSmartwatchData(currentUser.uid, healthData);
      setHasSmartwatchData(true);
      showSnackbar('Health data fetched successfully!', 'success');
    } catch (error) {
      console.error("Fetch error:", error);
      showSnackbar('Failed to fetch data. Using mock data instead.', 'warning');
      // Fallback to mock data
      await handleGenerateMockData();
    }
  };


  const getRiskMessage = (riskLevel) => {
    switch (riskLevel.toLowerCase()) {
      case 'high':
        return 'Please consult your doctor immediately and follow the recommended precautions.';
      case 'medium':
        return 'Monitor your health regularly and follow the suggested nutrition plan.';
      case 'low':
        return 'Your risk factors are minimal. Maintain your healthy habits.';
      default:
        return 'Risk assessment not available. Please complete health analysis.';
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleProcessData = async () => {
    try {
      // Get the latest data (real or mock)
      const q = query(
        collection(db, 'smartwatchData'),
        where('userId', '==', currentUser.uid),
        orderBy('timestamp', 'desc'),
        limit(1)
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const latestData = snapshot.docs[0].data();
        const result = await smartwatchService.getPrediction(currentUser.uid, latestData);
        console.log("Analysis result:", result);
        showSnackbar('Analysis completed successfully!', 'success');
        
        // Generate nutrition recommendations
        const nutritionPlan = await smartwatchService.generateNutritionPlan(
          currentUser.uid,
          result.riskLevel,
          reportUrl
        );
        // You can now use the nutritionPlan as needed
      }
    } catch (error) {
      console.error("Error processing data:", error);
      showSnackbar('Error processing data', 'error');
    }
  };
  const showSnackbar = (message, severity) => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleGenerateMockData = async () => {
    try {
      await smartwatchService.generateMockData(currentUser.uid);
      setHasSmartwatchData(true); // Mark that we now have data
      showSnackbar('Mock data generated successfully!', 'success');
    } catch (error) {
      console.error("Error generating mock data:", error);
      showSnackbar('Error generating mock data', 'error');
    }
  };

  const handleReportUploadSuccess = (url) => {
    setReportUrl(url);
    setHasReport(true);
  };


  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  const renderHealthDataButton = () => {
    switch (googleFitStatus) {
      case 'connected':
        return (
          <Button
            variant="contained"
            startIcon={<HealthAndSafetyIcon />}
            onClick={handleFetchHealthData}
          >
            Refresh Health Data
          </Button>
        );
      case 'disconnected':
        return (
          <Button
            variant="contained"
            startIcon={<HealthAndSafetyIcon />}
            onClick={handleConnectGoogleFit}
          >
            Connect Google Fit
          </Button>
        );
      default:
        return (
          <Button disabled startIcon={<HealthAndSafetyIcon />}>
            Initializing...
          </Button>
        );
    }
  };


  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Profile Dialog */}
      <Dialog open={profileDialogOpen} onClose={() => setProfileDialogOpen(false)}>
        <DialogTitle>Update Health Profile</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Age"
                type="number"
                value={profileForm.age}
                onChange={(e) => setProfileForm({...profileForm, age: parseInt(e.target.value) || 25})}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Systolic BP"
                type="number"
                value={profileForm.systolicBP}
                onChange={(e) => setProfileForm({...profileForm, systolicBP: parseInt(e.target.value) || 120})}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Diastolic BP"
                type="number"
                value={profileForm.diastolicBP}
                onChange={(e) => setProfileForm({...profileForm, diastolicBP: parseInt(e.target.value) || 80})}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Period Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={profileForm.lastPeriodDate}
                onChange={(e) => setProfileForm({...profileForm, lastPeriodDate: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Cycle Length (days)"
                type="number"
                value={profileForm.cycleLength}
                onChange={(e) => setProfileForm({...profileForm, cycleLength: parseInt(e.target.value) || 28})}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Hormonal Symptoms</InputLabel>
                <Select
                  value={profileForm.hormonalSymptoms}
                  onChange={(e) => setProfileForm({...profileForm, hormonalSymptoms: e.target.value})}
                >
                  <MenuItem value="Mild">Mild</MenuItem>
                  <MenuItem value="Moderate">Moderate</MenuItem>
                  <MenuItem value="Severe">Severe</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProfileDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveProfile} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Main Dashboard Content */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} centered>
          <Tab label="Overview" />
          <Tab label="Smartwatch Data" />
          <Tab label="Nutrition" />
          <Tab label="Support Chat" />
        </Tabs>
      </Paper>

      {tabValue === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h5" gutterBottom>
              Health Profile
              </Typography>
              <Button 
                  variant="outlined" 
                  size="small"
                  onClick={() => setProfileDialogOpen(true)}
                >
                  Edit
                </Button>
              </Box>
              <Box sx={{ mt: 2 }}>
                <Typography><strong>Age:</strong> {userData?.age || 'Not set'}</Typography>
                <Typography><strong>Blood Pressure:</strong> {userData?.systolicBP || '--'}/{userData?.diastolicBP || '--'}</Typography>
                <Typography><strong>Cycle Length:</strong> {userData?.cycleLength || '--'} days</Typography>
                <Typography><strong>Last Period:</strong> {userData?.lastPeriodDate ? new Date(userData.lastPeriodDate).toLocaleDateString() : 'Not set'}</Typography>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h5" gutterBottom>
                Health Insights
              </Typography>
              <Typography variant="body1" sx={{ mt: 2 }}>
                {userData?.riskLevel === 'high' ? (
                  'Your recent health metrics indicate elevated risk factors that require attention.'
                ) : userData?.riskLevel === 'medium' ? (
                  'Your health metrics show some areas that could benefit from improvement.'
                ) : (
                  'Your health metrics are within normal ranges. Keep up the good work!'
                )}
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      )}


{tabValue === 1 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>Health Monitoring</Typography>
          
          <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          {renderHealthDataButton()}
  <Button
    variant="contained"
    color="secondary"
    startIcon={<ShuffleIcon />}
    onClick={handleGenerateMockData}
  >
    Generate Mock Data
  </Button>
</Stack>

          <Box mb={3}>
            <Typography variant="subtitle1" gutterBottom>Live Health Data</Typography>
            <RealtimeMetrics userId={currentUser?.uid} onDataUpdate={setCurrentMetrics} />
          </Box>

          <Box mb={3}>
            <Typography variant="subtitle1" gutterBottom>Upload Doctor's Report</Typography>
            <DoctorReport 
              userId={currentUser?.uid} 
              onUploadSuccess={(reportUrl) => setReportUrl(reportUrl)}
            />
          </Box>

          {(hasSmartwatchData && hasReport) ? (
  <Button
    variant="contained"
    color="primary"
    fullWidth
    onClick={handleProcessData}
    sx={{ mt: 2 }}
  >
    Analyze Health Data
  </Button>
) : (
  <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
    {!hasSmartwatchData && "Waiting for smartwatch data... "}
    {!hasReport && "Please upload doctor's report to enable analysis"}
  </Typography>
)}
        </Paper>
      )}

      {tabValue === 2 && (
        <Paper sx={{ p: 2 }}>
          <NutritionRecommendation userId={currentUser?.uid} />
        </Paper>
      )}

      {tabValue === 3 && (
        <Box display="flex" justifyContent="center">
          <Chatbot />
        </Box>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default UserDashboard;