import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  Typography,
  Alert,
  CircularProgress,
  Grid,
  Tabs,
  Tab
} from '@mui/material';
import {
  Person,
  Settings,
  Payment
} from '@mui/icons-material';
import { useQuery } from '@apollo/client';
import StaffLayout from '../components/StaffLayout';
import SalaryPaymentTable from '../components/salary/SalaryPaymentTable';
import SalarySummaryCard from '../components/salary/SalarySummaryCard';
import {
  GET_STAFF_SALARY_CONFIG,
  GET_STAFF_SALARY_PAYMENTS,
  GET_STAFF_SALARY_SUMMARY
} from '../graphql';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`salary-tabpanel-${index}`}
      aria-labelledby={`salary-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function StaffSalaryView() {
  const navigate = useNavigate();
  const [staff, setStaff] = useState<any>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    const staffData = localStorage.getItem('staff');
    if (!staffData) {
      navigate('/login');
      return;
    }
    const parsedStaff = JSON.parse(staffData);
    setStaff(parsedStaff);
  }, [navigate]);

  // Queries
  const { data: configData, loading: configLoading } = useQuery(GET_STAFF_SALARY_CONFIG, {
    variables: { staffId: staff?.id },
    skip: !staff?.id
  });

  const { data: paymentsData, loading: paymentsLoading, refetch: refetchPayments } = useQuery(GET_STAFF_SALARY_PAYMENTS, {
    variables: { staffId: staff?.id, limit: rowsPerPage, offset: page * rowsPerPage },
    skip: !staff?.id
  });

  const { data: summaryData, loading: summaryLoading } = useQuery(GET_STAFF_SALARY_SUMMARY, {
    variables: { staffId: staff?.id },
    skip: !staff?.id
  });

  if (!staff) {
    return (
      <StaffLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress />
        </Box>
      </StaffLayout>
    );
  }

  const config = configData?.staffSalaryConfig;
  const payments = paymentsData?.staffSalaryPayments?.data || [];
  const totalCount = paymentsData?.staffSalaryPayments?.totalCount || 0;
  const summary = summaryData?.staffSalarySummary;

  return (
    <StaffLayout>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          My Salary Information
        </Typography>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
            <Tab icon={<Person />} label="Summary" />
            <Tab icon={<Settings />} label="Configuration" />
            <Tab icon={<Payment />} label="Payment History" />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          {summaryLoading ? (
            <CircularProgress />
          ) : summary ? (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <SalarySummaryCard summary={summary} />
              </Grid>
            </Grid>
          ) : (
            <Alert severity="info">No salary data available</Alert>
          )}
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          {configLoading ? (
            <CircularProgress />
          ) : config ? (
            <Card>
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>Salary Configuration</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">Salary Type</Typography>
                    <Typography variant="body1">{config.salaryType}</Typography>
                  </Grid>
                  {config.baseSalary && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">Base Salary</Typography>
                      <Typography variant="body1">{config.currency} {config.baseSalary.toFixed(2)}</Typography>
                    </Grid>
                  )}
                  {config.hourlyRate && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">Hourly Rate</Typography>
                      <Typography variant="body1">{config.currency} {config.hourlyRate.toFixed(2)}</Typography>
                    </Grid>
                  )}
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">Payment Frequency</Typography>
                    <Typography variant="body1">{config.paymentFrequency}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">Effective Date</Typography>
                    <Typography variant="body1">{new Date(config.effectiveDate).toLocaleDateString()}</Typography>
                  </Grid>
                  {config.notes && (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">Notes</Typography>
                      <Typography variant="body1">{config.notes}</Typography>
                    </Grid>
                  )}
                </Grid>
              </Box>
            </Card>
          ) : (
            <Alert severity="info">No salary configuration has been set yet.</Alert>
          )}
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <Card>
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Payment History</Typography>
              {paymentsLoading ? (
                <CircularProgress />
              ) : (
                <SalaryPaymentTable
                  payments={payments}
                  currency={config?.currency || 'USD'}
                  canManage={false}
                  page={page}
                  rowsPerPage={rowsPerPage}
                  totalCount={totalCount}
                  onPageChange={setPage}
                  onRowsPerPageChange={(newRowsPerPage) => {
                    setRowsPerPage(newRowsPerPage);
                    setPage(0);
                  }}
                />
              )}
            </Box>
          </Card>
        </TabPanel>
      </Box>
    </StaffLayout>
  );
}

