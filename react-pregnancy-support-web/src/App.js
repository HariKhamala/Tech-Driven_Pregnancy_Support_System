import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import Login from './components/auth/Login';
import AdminDashboard from './components/admin/Dashboard';
import UserDashboard from './components/user/Dashboard';
import PrivateRoute from './components/auth/PrivateRoute';


const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route
            path="/admin/*"
            element={
              <PrivateRoute role="admin">
                <AdminDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/user/*"
            element={
              <PrivateRoute role="user">
                <UserDashboard />
              </PrivateRoute>
            }
          />
          <Route path="/dashboard" element={<UserDashboard />} />
          <Route path="/oauth2callback" element={<UserDashboard />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App; 