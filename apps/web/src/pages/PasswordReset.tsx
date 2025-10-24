import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Card,
  CardContent
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  LockReset,
  CheckCircle
} from '@mui/icons-material';
import { useMutation } from '@apollo/client';
import CryptoJS from 'crypto-js';
import { 
  RESET_ADMIN_PASSWORD, 
  RESET_RESTAURANT_PASSWORD, 
  RESET_STAFF_PASSWORD,
  UPDATE_ADMIN_PASSWORD,
  UPDATE_RESTAURANT_PASSWORD,
  UPDATE_STAFF_PASSWORD
} from '../graphql/passwordReset';

type UserType = 'admin' | 'restaurant' | 'staff';

// Hash password client-side for additional security
const hashPassword = (password: string): string => {
  return CryptoJS.SHA256(password).toString();
};

interface PasswordResetFormData {
  email: string;
  newPassword: string;
  confirmPassword: string;
}

export default function PasswordReset() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const userType = (searchParams.get('type') as UserType) || 'admin';
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState<PasswordResetFormData>({
    email: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Reset password mutations
  const [resetAdminPassword, { loading: adminResetLoading }] = useMutation(RESET_ADMIN_PASSWORD);
  const [resetRestaurantPassword, { loading: restaurantResetLoading }] = useMutation(RESET_RESTAURANT_PASSWORD);
  const [resetStaffPassword, { loading: staffResetLoading }] = useMutation(RESET_STAFF_PASSWORD);

  // Update password mutations
  const [updateAdminPassword, { loading: adminUpdateLoading }] = useMutation(UPDATE_ADMIN_PASSWORD);
  const [updateRestaurantPassword, { loading: restaurantUpdateLoading }] = useMutation(UPDATE_RESTAURANT_PASSWORD);
  const [updateStaffPassword, { loading: staffUpdateLoading }] = useMutation(UPDATE_STAFF_PASSWORD);

  const isLoading = adminResetLoading || restaurantResetLoading || staffResetLoading || 
                   adminUpdateLoading || restaurantUpdateLoading || staffUpdateLoading;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleResetPassword = async () => {
    if (!formData.email) {
      setError('Please enter your email address');
      return;
    }

    try {
      let result;
      switch (userType) {
        case 'admin':
          result = await resetAdminPassword({ variables: { email: formData.email } });
          break;
        case 'restaurant':
          result = await resetRestaurantPassword({ variables: { email: formData.email } });
          break;
        case 'staff':
          result = await resetStaffPassword({ variables: { email: formData.email } });
          break;
        default:
          throw new Error('Invalid user type');
      }

      if (result.data) {
        const response = result.data[`reset${userType.charAt(0).toUpperCase() + userType.slice(1)}Password`];
        if (response.success) {
          setSuccess(response.message);
          if (response.token) {
            // In development, show the token
            setSuccess(`${response.message} Token: ${response.token}`);
          }
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to reset password');
    }
  };

  const handleUpdatePassword = async () => {
    if (!formData.newPassword || !formData.confirmPassword) {
      setError('Please fill in all password fields');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    try {
      // Hash password before sending for additional security
      const hashedPassword = hashPassword(formData.newPassword);
      
      let result;
      switch (userType) {
        case 'admin':
          result = await updateAdminPassword({ 
            variables: { token: token!, newPassword: hashedPassword } 
          });
          break;
        case 'restaurant':
          result = await updateRestaurantPassword({ 
            variables: { token: token!, newPassword: hashedPassword } 
          });
          break;
        case 'staff':
          result = await updateStaffPassword({ 
            variables: { token: token!, newPassword: hashedPassword } 
          });
          break;
        default:
          throw new Error('Invalid user type');
      }

      if (result.data) {
        const response = result.data[`update${userType.charAt(0).toUpperCase() + userType.slice(1)}Password`];
        if (response.success) {
          setSuccess('Password updated successfully! You can now login with your new password.');
          setTimeout(() => {
            navigate('/login');
          }, 2000);
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update password');
    }
  };

  const getUserTypeLabel = () => {
    switch (userType) {
      case 'admin': return 'Admin';
      case 'restaurant': return 'Restaurant';
      case 'staff': return 'Staff';
      default: return 'User';
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Card>
        <CardContent>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <LockReset sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h4" component="h1" gutterBottom>
              Password Reset
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Reset password for {getUserTypeLabel()} account
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {success}
            </Alert>
          )}

          {!token ? (
            // Reset password request form
            <Box>
              <TextField
                fullWidth
                label="Email Address"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                margin="normal"
                required
                disabled={isLoading}
              />

              <Button
                fullWidth
                variant="contained"
                onClick={handleResetPassword}
                disabled={isLoading}
                sx={{ mt: 3, mb: 2 }}
                startIcon={isLoading ? <CircularProgress size={20} /> : <LockReset />}
              >
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </Button>

              <Button
                fullWidth
                variant="text"
                onClick={() => navigate('/login')}
                disabled={isLoading}
              >
                Back to Login
              </Button>
            </Box>
          ) : (
            // Update password form
            <Box>
              <TextField
                fullWidth
                label="New Password"
                name="newPassword"
                type={showPassword ? 'text' : 'password'}
                value={formData.newPassword}
                onChange={handleInputChange}
                margin="normal"
                required
                disabled={isLoading}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                label="Confirm New Password"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleInputChange}
                margin="normal"
                required
                disabled={isLoading}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        edge="end"
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                fullWidth
                variant="contained"
                onClick={handleUpdatePassword}
                disabled={isLoading}
                sx={{ mt: 3, mb: 2 }}
                startIcon={isLoading ? <CircularProgress size={20} /> : <CheckCircle />}
              >
                {isLoading ? 'Updating...' : 'Update Password'}
              </Button>

              <Button
                fullWidth
                variant="text"
                onClick={() => navigate('/login')}
                disabled={isLoading}
              >
                Back to Login
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
