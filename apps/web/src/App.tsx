import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { client } from './apollo/client';

// Import pages
import ConsumerPage from './pages/ConsumerPage';
import OrderListPage from './pages/OrderListPage';
import AdminDashboard from './pages/AdminDashboard';
import RestaurantManagement from './pages/RestaurantManagement';
import RestaurantDashboard from './pages/RestaurantDashboard';
import MenuPage from './pages/MenuPage';
import TablesPage from './pages/TablesPage';
import ReservationsPage from './pages/ReservationsPage';
import QRCodeManagementPage from './pages/QRCodeManagementPage';
import StaffDashboard from './pages/StaffDashboard';
import StaffOrders from './pages/StaffOrders';
import StaffOrderManagement from './pages/StaffOrderManagement';
import StaffManagement from './pages/StaffManagement';
import UnifiedLogin from './pages/UnifiedLogin';

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
  return adminToken ? <>{children}</> : <Navigate to="/login" />;
};

// Protected Route component for restaurant
const ProtectedRestaurantRoute = ({ children }: { children: React.ReactNode }) => {
  const restaurantToken = localStorage.getItem('restaurantToken');
  return restaurantToken ? <>{children}</> : <Navigate to="/login" />;
};

// Protected Route component for staff
const ProtectedStaffRoute = ({ children }: { children: React.ReactNode }) => {
  const staffToken = localStorage.getItem('staffToken');
  return staffToken ? <>{children}</> : <Navigate to="/login" />;
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
            
            {/* Unified Login Route */}
            <Route path="/login" element={<UnifiedLogin />} />
            
            {/* Admin Routes */}
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
            <Route 
              path="/staff-management" 
              element={
                <ProtectedRestaurantRoute>
                  <StaffManagement />
                </ProtectedRestaurantRoute>
              } 
            />
            
            {/* Staff Routes */}
            <Route 
              path="/staff/dashboard" 
              element={
                <ProtectedStaffRoute>
                  <StaffDashboard />
                </ProtectedStaffRoute>
              } 
            />
            <Route 
              path="/staff/orders" 
              element={
                <ProtectedStaffRoute>
                  <StaffOrders />
                </ProtectedStaffRoute>
              } 
            />
            <Route 
              path="/staff/orders/:orderId" 
              element={
                <ProtectedStaffRoute>
                  <StaffOrderManagement />
                </ProtectedStaffRoute>
              } 
            />
            
            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/login" />} />
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </ApolloProvider>
  );
}

export default App;