import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Tabs,
  Tab,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Avatar,
  InputAdornment,
  IconButton,
  CircularProgress,
  Fade,
  Chip
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Restaurant,
  AdminPanelSettings,
  Person
} from '@mui/icons-material';
import { useMutation } from '@apollo/client';
import { LOGIN_RESTAURANT, LOGIN_ADMIN, LOGIN_STAFF } from '../graphql';
import { client } from '../apollo/client';
import { TabPanel, a11yProps } from '../components/common';

type UserType = 'restaurant' | 'admin' | 'staff';

interface LoginFormData {
  email: string;
  password: string;
}

interface DemoCredentials {
  email: string;
  password: string;
  description: string;
}

const demoCredentials: Record<UserType, DemoCredentials> = {
  restaurant: {
    email: 'demo@restaurant.com',
    password: 'demo123',
    description: 'Restaurant Owner Access'
  },
  admin: {
    email: 'admin@platform.com',
    password: 'admin123',
    description: 'Platform Administrator'
  },
  staff: {
    email: 'staff@restaurant.com',
    password: 'staff123',
    description: 'Restaurant Staff Member'
  }
};

export default function UnifiedLogin() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: ''
  });

  const userTypes: UserType[] = ['restaurant', 'admin', 'staff'];
  const currentUserType = userTypes[activeTab];

  // Mutations for each user type
  const [loginRestaurant, { loading: restaurantLoading }] = useMutation(LOGIN_RESTAURANT, {
    onCompleted: async (data) => {
      localStorage.setItem('restaurantToken', data.loginRestaurant.token);
      localStorage.setItem('restaurant', JSON.stringify(data.loginRestaurant.restaurant));
      
      // Clear Apollo Client cache to ensure fresh data with new auth
      await client.clearStore();
      
      navigate('/restaurant/dashboard');
    },
    onError: (error) => {
      setError(error.message);
    }
  });

  const [loginAdmin, { loading: adminLoading }] = useMutation(LOGIN_ADMIN, {
    onCompleted: async (data) => {
      localStorage.setItem('adminToken', data.loginAdmin.token);
      localStorage.setItem('admin', JSON.stringify(data.loginAdmin.admin));
      
      // Clear Apollo Client cache to ensure fresh data with new auth
      await client.clearStore();
      
      navigate('/admin/dashboard');
    },
    onError: (error) => {
      setError(error.message);
    }
  });

  const [loginStaff, { loading: staffLoading }] = useMutation(LOGIN_STAFF, {
    onCompleted: async (data) => {
      localStorage.setItem('staffToken', data.loginStaff.token);
      localStorage.setItem('staff', JSON.stringify(data.loginStaff.staff));
      localStorage.setItem('restaurant', JSON.stringify(data.loginStaff.restaurant));
      
      // Clear Apollo Client cache to ensure fresh data with new auth
      await client.clearStore();
      
      navigate('/staff/dashboard');
    },
    onError: (error) => {
      setError(error.message);
    }
  });

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    setError('');
    setFormData({ email: '', password: '' });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      switch (currentUserType) {
        case 'restaurant':
          await loginRestaurant({
            variables: { email: formData.email, password: formData.password }
          });
          break;
        case 'admin':
          await loginAdmin({
            variables: { email: formData.email, password: formData.password }
          });
          break;
        case 'staff':
          await loginStaff({
            variables: { email: formData.email, password: formData.password }
          });
          break;
      }
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const fillDemoCredentials = () => {
    const demo = demoCredentials[currentUserType];
    setFormData({
      email: demo.email,
      password: demo.password
    });
  };

  const getTabIcon = (userType: UserType) => {
    switch (userType) {
      case 'restaurant':
        return <Restaurant />;
      case 'admin':
        return <AdminPanelSettings />;
      case 'staff':
        return <Person />;
    }
  };

  const getTabLabel = (userType: UserType) => {
    switch (userType) {
      case 'restaurant':
        return 'Restaurant';
      case 'admin':
        return 'Admin';
      case 'staff':
        return 'Staff';
    }
  };

  const getGradientColors = (userType: UserType) => {
    switch (userType) {
      case 'restaurant':
        return 'linear-gradient(135deg, #ff6b6b 0%, #ffa500 100%)';
      case 'admin':
        return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
      case 'staff':
        return 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
    }
  };

  const isLoading = restaurantLoading || adminLoading || staffLoading;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: getGradientColors(currentUserType),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2,
        transition: 'background 0.3s ease-in-out'
      }}
    >
      <Container maxWidth="md">
        <Paper
          elevation={24}
          sx={{
            borderRadius: 4,
            overflow: 'hidden',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}
        >
          {/* Header */}
          <Box
            sx={{
              background: getGradientColors(currentUserType),
              color: 'white',
              textAlign: 'center',
              py: 4,
              px: 3,
              transition: 'background 0.3s ease-in-out'
            }}
          >
            <Avatar
              sx={{
                width: 80,
                height: 80,
                mx: 'auto',
                mb: 2,
                bgcolor: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)',
                border: '2px solid rgba(255,255,255,0.3)'
              }}
            >
              {getTabIcon(currentUserType)}
            </Avatar>
            <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
              Restaurant Management Platform
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              Choose your access level to continue
            </Typography>
          </Box>

          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              aria-label="login type tabs"
              variant="fullWidth"
              sx={{
                '& .MuiTab-root': {
                  py: 2,
                  fontWeight: 600,
                  textTransform: 'none',
                  fontSize: '1rem'
                },
                '& .Mui-selected': {
                  color: 'primary.main'
                }
              }}
            >
              {userTypes.map((userType, index) => (
                <Tab
                  key={userType}
                  icon={getTabIcon(userType)}
                  iconPosition="start"
                  label={getTabLabel(userType)}
                  {...a11yProps(index)}
                />
              ))}
            </Tabs>
          </Box>

          {/* Tab Content */}
          <CardContent sx={{ p: 4 }}>
            <TabPanel value={activeTab} index={activeTab} sx={{ pt: 3 }}>
              <Fade in={true} timeout={300}>
                <Box>
                  {/* User Type Description */}
                  <Box sx={{ textAlign: 'center', mb: 3 }}>
                    <Chip
                      icon={getTabIcon(currentUserType)}
                      label={demoCredentials[currentUserType].description}
                      variant="outlined"
                      sx={{ mb: 2 }}
                    />
                  </Box>

                  {/* Error Alert */}
                  {error && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                      {error}
                    </Alert>
                  )}

                  {/* Login Form */}
                  <Box component="form" onSubmit={handleSubmit}>
                    <TextField
                      fullWidth
                      label={`${getTabLabel(currentUserType)} Email`}
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      margin="normal"
                      required
                      disabled={isLoading}
                      variant="outlined"
                      sx={{ mb: 2 }}
                    />

                    <TextField
                      fullWidth
                      label="Password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={handleInputChange}
                      margin="normal"
                      required
                      disabled={isLoading}
                      variant="outlined"
                      sx={{ mb: 3 }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowPassword(!showPassword)}
                              edge="end"
                              disabled={isLoading}
                            >
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        )
                      }}
                    />

                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      size="large"
                      disabled={isLoading}
                      sx={{
                        py: 1.5,
                        background: getGradientColors(currentUserType),
                        '&:hover': {
                          background: getGradientColors(currentUserType),
                          filter: 'brightness(0.9)'
                        },
                        '&:disabled': {
                          background: 'rgba(0,0,0,0.12)'
                        }
                      }}
                    >
                      {isLoading ? (
                        <CircularProgress size={24} color="inherit" />
                      ) : (
                        'Sign In'
                      )}
                    </Button>
                  </Box>

                  {/* Demo Credentials */}
                  <Box sx={{ mt: 4, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Demo Credentials:
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={fillDemoCredentials}
                      disabled={isLoading}
                      sx={{ mb: 2 }}
                    >
                      Fill Demo Data
                    </Button>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Email: {demoCredentials[currentUserType].email}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Password: {demoCredentials[currentUserType].password}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Fade>
            </TabPanel>
          </CardContent>

          {/* Footer */}
          <Box sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.50' }}>
            <Typography variant="caption" color="text.secondary">
              © 2024 Restaurant Management Platform. All rights reserved.
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
