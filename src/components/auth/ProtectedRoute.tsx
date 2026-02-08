import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Box, CircularProgress } from '@mui/material';
import { AuthUser } from '../../services/authService';
import { User } from 'firebase/auth';

const ProtectedRoute: React.FC = () => {
  const { currentUser, loading } = useAuth();

  console.log('ProtectedRoute - currentUser:', currentUser, 'loading:', loading);

  if (loading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh' 
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return currentUser ? <Outlet /> : <Navigate to="/login" />;
};

export default ProtectedRoute; 