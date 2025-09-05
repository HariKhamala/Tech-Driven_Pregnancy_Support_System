import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { smartwatchService } from '../services/smartwatchService';
import { CircularProgress, Typography, Box } from '@mui/material';

const GoogleFitCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Check if this is coming back from Google with success
        if (location.hash.includes('access_token')) {
          const success = smartwatchService.handleGoogleFitCallback();
          
          if (success) {
            // Verify the token immediately
            const isValid = await smartwatchService.validateGoogleFitToken();
            
            if (isValid) {
              navigate('/dashboard', { 
                state: { googleFitConnected: true },
                replace: true 
              });
              return;
            }
          }
        }
        
        // If we get here, something went wrong
        navigate('/dashboard', { 
          state: { error: 'google_fit_connection_failed' },
          replace: true
        });
        
      } catch (error) {
        console.error('Callback processing error:', error);
        navigate('/dashboard', { 
          state: { error: 'google_fit_error' },
          replace: true
        });
      }
    };

    processCallback();
  }, [navigate, location]);

  return (
    <Box sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh'
    }}>
      <Box sx={{ textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 3 }}>
          Finalizing Google Fit connection...
        </Typography>
      </Box>
    </Box>
  );
};

export default GoogleFitCallback;