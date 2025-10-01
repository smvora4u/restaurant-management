import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
  Paper,
  Avatar,
  InputAdornment,
  IconButton
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Restaurant
} from '@mui/icons-material';
import { useMutation } from '@apollo/client';
import { LOGIN_RESTAURANT } from '../graphql';

export default function RestaurantLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const [loginRestaurant, { loading }] = useMutation(LOGIN_RESTAURANT, {
    onCompleted: (data) => {
      localStorage.setItem('restaurantToken', data.loginRestaurant.token);
      localStorage.setItem('restaurant', JSON.stringify(data.loginRestaurant.restaurant));
      navigate('/restaurant/dashboard');
    },
    onError: (error) => {
      setError(error.message);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      await loginRestaurant({
        variables: { email, password }
      });
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #ff6b6b 0%, #ffa500 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={24}
          sx={{
            borderRadius: 3,
            overflow: 'hidden'
          }}
        >
          <Box
            sx={{
              background: 'linear-gradient(135deg, #ff6b6b 0%, #ffa500 100%)',
              color: 'white',
              textAlign: 'center',
              py: 4,
              px: 3
            }}
          >
            <Avatar
              sx={{
                width: 80,
                height: 80,
                mx: 'auto',
                mb: 2,
                bgcolor: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)'
              }}
            >
              <Restaurant sx={{ fontSize: 40 }} />
            </Avatar>
            <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
              Restaurant Portal
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              Manage Your Restaurant
            </Typography>
          </Box>

          <CardContent sx={{ p: 4 }}>
            <form onSubmit={handleSubmit}>
              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              <TextField
                fullWidth
                label="Restaurant Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                margin="normal"
                required
                variant="outlined"
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                margin="normal"
                required
                variant="outlined"
                sx={{ mb: 3 }}
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
                  )
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{
                  py: 1.5,
                  background: 'linear-gradient(135deg, #ff6b6b 0%, #ffa500 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #ff5252 0%, #ff9800 100%)',
                  }
                }}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>

            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Demo Credentials:
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Email: demo@restaurant.com
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Password: demo123
              </Typography>
            </Box>
          </CardContent>
        </Paper>
      </Container>
    </Box>
  );
}
