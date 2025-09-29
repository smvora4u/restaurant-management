import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { client } from './apollo/client';

// Import pages
import ConsumerPage from './pages/ConsumerPage';
import OrderListPage from './pages/OrderListPage';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import RestaurantManagement from './pages/RestaurantManagement';
import RestaurantLogin from './pages/RestaurantLogin';
import RestaurantDashboard from './pages/RestaurantDashboard';
import MenuPage from './pages/MenuPage';
import TablesPage from './pages/TablesPage';
import ReservationsPage from './pages/ReservationsPage';
import QRCodeManagementPage from './pages/QRCodeManagementPage';

// Create theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

// Protected Route component for admin
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const adminToken = localStorage.getItem('adminToken');
  return adminToken ? <>{children}</> : <Navigate to="/admin/login" />;
};

// Protected Route component for restaurant
const ProtectedRestaurantRoute = ({ children }: { children: React.ReactNode }) => {
  const restaurantToken = localStorage.getItem('restaurantToken');
  return restaurantToken ? <>{children}</> : <Navigate to="/restaurant/login" />;
};

function App() {
  return (
    <ApolloProvider client={client}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <Routes>
            {/* Consumer Routes */}
            <Route path="/consumer/:restaurantSlug/:tableNumber" element={<ConsumerPage />} />
            <Route path="/consumer/:restaurantSlug/:tableNumber/:orderType" element={<ConsumerPage />} />
            <Route path="/parcel/:restaurantSlug/:orderType" element={<ConsumerPage />} />
            <Route path="/orders" element={<OrderListPage />} />
            
            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route 
              path="/admin/dashboard" 
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/restaurants" 
              element={
                <ProtectedRoute>
                  <RestaurantManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/restaurants/new" 
              element={
                <ProtectedRoute>
                  <RestaurantManagement />
                </ProtectedRoute>
              } 
            />
            
            {/* Restaurant Routes */}
            <Route path="/restaurant/login" element={<RestaurantLogin />} />
            <Route 
              path="/restaurant/dashboard" 
              element={
                <ProtectedRestaurantRoute>
                  <RestaurantDashboard />
                </ProtectedRestaurantRoute>
              } 
            />
            <Route 
              path="/menu" 
              element={
                <ProtectedRestaurantRoute>
                  <MenuPage />
                </ProtectedRestaurantRoute>
              } 
            />
            <Route 
              path="/tables" 
              element={
                <ProtectedRestaurantRoute>
                  <TablesPage />
                </ProtectedRestaurantRoute>
              } 
            />
            <Route 
              path="/orders" 
              element={
                <ProtectedRestaurantRoute>
                  <OrderListPage />
                </ProtectedRestaurantRoute>
              } 
            />
            <Route 
              path="/reservations" 
              element={
                <ProtectedRestaurantRoute>
                  <ReservationsPage />
                </ProtectedRestaurantRoute>
              } 
            />
            <Route 
              path="/qr-codes" 
              element={
                <ProtectedRestaurantRoute>
                  <QRCodeManagementPage />
                </ProtectedRestaurantRoute>
              } 
            />
            
            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/restaurant/login" />} />
            <Route path="*" element={<Navigate to="/restaurant/login" />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </ApolloProvider>
  );
}

export default App;