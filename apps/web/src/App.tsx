import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ConsumerPage from './pages/ConsumerPage';
import OrderListPage from './pages/OrderListPage';

export default function App(): JSX.Element {
  return (
    <Router>
      <Routes>
        <Route path="/" element={
          <Layout>
            <Dashboard />
          </Layout>
        } />
        <Route path="/orders" element={
          <Layout>
            <OrderListPage />
          </Layout>
        } />
        <Route path="/consumer/:tableNumber" element={<ConsumerPage />} />
        <Route path="/order/:orderId" element={<ConsumerPage />} />
        <Route path="/parcel/:orderType" element={<ConsumerPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}



