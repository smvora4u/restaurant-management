import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Card,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Snackbar,
  Tabs,
  Tab
} from '@mui/material';
import {
  ArrowBack,
  Add,
  Settings,
  Payment,
  Person,
  AccountBalanceWallet
} from '@mui/icons-material';
import { useQuery, useMutation } from '@apollo/client';
import { getCurrencySymbolFromCode, getRestaurantCurrency } from '../utils/currency';
import Layout from '../components/Layout';
import SalaryConfigForm from '../components/salary/SalaryConfigForm';
import SalaryPaymentForm from '../components/salary/SalaryPaymentForm';
import SalaryPaymentTable from '../components/salary/SalaryPaymentTable';
import SalarySummaryCard from '../components/salary/SalarySummaryCard';
import AdvancePaymentForm from '../components/salary/AdvancePaymentForm';
import AdvancePaymentTable from '../components/salary/AdvancePaymentTable';
import {
  GET_STAFF_BY_ID,
  GET_STAFF_SALARY_CONFIG,
  GET_STAFF_SALARY_PAYMENTS,
  GET_STAFF_SALARY_SUMMARY,
  GET_STAFF_ADVANCE_PAYMENTS,
  GET_STAFF_ADVANCE_SUMMARY,
  SET_STAFF_SALARY_CONFIG,
  UPDATE_STAFF_SALARY_CONFIG,
  CREATE_SALARY_PAYMENT,
  UPDATE_SALARY_PAYMENT,
  DELETE_SALARY_PAYMENT,
  CREATE_ADVANCE_PAYMENT,
  UPDATE_ADVANCE_PAYMENT,
  DELETE_ADVANCE_PAYMENT
} from '../graphql';
import ConfirmationDialog from '../components/common/ConfirmationDialog';

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

export default function SalaryManagement() {
  const navigate = useNavigate();
  const { staffId } = useParams<{ staffId: string }>();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [advanceDialogOpen, setAdvanceDialogOpen] = useState(false);
  const [configMode, setConfigMode] = useState<'create' | 'edit'>('create');
  const [paymentMode, setPaymentMode] = useState<'create' | 'edit'>('create');
  const [advanceMode, setAdvanceMode] = useState<'create' | 'edit'>('create');
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [selectedAdvance, setSelectedAdvance] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteAdvanceDialogOpen, setDeleteAdvanceDialogOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<any>(null);
  const [advanceToDelete, setAdvanceToDelete] = useState<any>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [advancePage, setAdvancePage] = useState(0);
  const [advanceRowsPerPage, setAdvanceRowsPerPage] = useState(10);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info'
  });

  useEffect(() => {
    const restaurantData = localStorage.getItem('restaurant');
    if (!restaurantData) {
      navigate('/login');
      return;
    }
    setRestaurant(JSON.parse(restaurantData));
  }, [navigate]);

  // Queries
  const { data: staffData, loading: staffLoading } = useQuery(GET_STAFF_BY_ID, {
    variables: { id: staffId },
    skip: !staffId
  });

  const { data: configData, loading: configLoading, refetch: refetchConfig } = useQuery(GET_STAFF_SALARY_CONFIG, {
    variables: { staffId },
    skip: !staffId
  });

  const { data: paymentsData, loading: paymentsLoading, refetch: refetchPayments } = useQuery(GET_STAFF_SALARY_PAYMENTS, {
    variables: { staffId, limit: rowsPerPage, offset: page * rowsPerPage },
    skip: !staffId
  });

  const { data: summaryData, loading: summaryLoading, refetch: refetchSummary } = useQuery(GET_STAFF_SALARY_SUMMARY, {
    variables: { staffId },
    skip: !staffId
  });

  const { data: advancesData, loading: advancesLoading, refetch: refetchAdvances } = useQuery(GET_STAFF_ADVANCE_PAYMENTS, {
    variables: { staffId, limit: advanceRowsPerPage, offset: advancePage * advanceRowsPerPage },
    skip: !staffId
  });

  const { data: advanceSummaryData, refetch: refetchAdvanceSummary } = useQuery(GET_STAFF_ADVANCE_SUMMARY, {
    variables: { staffId },
    skip: !staffId
  });

  // Mutations
  const [setSalaryConfig, { loading: setConfigLoading }] = useMutation(SET_STAFF_SALARY_CONFIG, {
    onCompleted: () => {
      setConfigDialogOpen(false);
      refetchConfig();
      refetchSummary();
      setSnackbar({
        open: true,
        message: 'Salary configuration set successfully!',
        severity: 'success'
      });
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: `Error: ${error.message}`,
        severity: 'error'
      });
    }
  });

  const [updateSalaryConfig, { loading: updateConfigLoading }] = useMutation(UPDATE_STAFF_SALARY_CONFIG, {
    onCompleted: () => {
      setConfigDialogOpen(false);
      refetchConfig();
      refetchSummary();
      setSnackbar({
        open: true,
        message: 'Salary configuration updated successfully!',
        severity: 'success'
      });
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: `Error: ${error.message}`,
        severity: 'error'
      });
    }
  });

  const [createPayment, { loading: createPaymentLoading }] = useMutation(CREATE_SALARY_PAYMENT, {
    onCompleted: () => {
      setPaymentDialogOpen(false);
      refetchPayments();
      refetchSummary();
      setSnackbar({
        open: true,
        message: 'Salary payment created successfully!',
        severity: 'success'
      });
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: `Error: ${error.message}`,
        severity: 'error'
      });
    }
  });

  const [updatePayment, { loading: updatePaymentLoading }] = useMutation(UPDATE_SALARY_PAYMENT, {
    onCompleted: () => {
      setPaymentDialogOpen(false);
      setSelectedPayment(null);
      refetchPayments();
      refetchSummary();
      refetchAdvances();
      refetchAdvanceSummary();
      setSnackbar({
        open: true,
        message: 'Salary payment updated successfully!',
        severity: 'success'
      });
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: `Error: ${error.message}`,
        severity: 'error'
      });
    }
  });

  const [deletePayment, { loading: deletePaymentLoading }] = useMutation(DELETE_SALARY_PAYMENT, {
    onCompleted: () => {
      setDeleteDialogOpen(false);
      setPaymentToDelete(null);
      refetchPayments();
      refetchSummary();
      setSnackbar({
        open: true,
        message: 'Salary payment deleted successfully!',
        severity: 'success'
      });
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: `Error: ${error.message}`,
        severity: 'error'
      });
    }
  });

  const [createAdvance, { loading: createAdvanceLoading }] = useMutation(CREATE_ADVANCE_PAYMENT, {
    onCompleted: () => {
      setAdvanceDialogOpen(false);
      refetchAdvances();
      refetchAdvanceSummary();
      refetchSummary();
      setSnackbar({
        open: true,
        message: 'Advance payment created successfully!',
        severity: 'success'
      });
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: `Error: ${error.message}`,
        severity: 'error'
      });
    }
  });

  const [updateAdvance, { loading: updateAdvanceLoading }] = useMutation(UPDATE_ADVANCE_PAYMENT, {
    onCompleted: () => {
      setAdvanceDialogOpen(false);
      setSelectedAdvance(null);
      refetchAdvances();
      refetchAdvanceSummary();
      setSnackbar({
        open: true,
        message: 'Advance payment updated successfully!',
        severity: 'success'
      });
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: `Error: ${error.message}`,
        severity: 'error'
      });
    }
  });

  const [deleteAdvance, { loading: deleteAdvanceLoading }] = useMutation(DELETE_ADVANCE_PAYMENT, {
    onCompleted: () => {
      setDeleteAdvanceDialogOpen(false);
      setAdvanceToDelete(null);
      refetchAdvances();
      refetchAdvanceSummary();
      setSnackbar({
        open: true,
        message: 'Advance payment deleted successfully!',
        severity: 'success'
      });
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: `Error: ${error.message}`,
        severity: 'error'
      });
    }
  });

  const handleOpenConfigDialog = (mode: 'create' | 'edit') => {
    setConfigMode(mode);
    setConfigDialogOpen(true);
  };

  const handleConfigSubmit = (data: any) => {
    if (configMode === 'create') {
      setSalaryConfig({
        variables: {
          input: {
            ...data,
            staffId,
            restaurantId: restaurant?.id
          }
        }
      });
    } else {
      updateSalaryConfig({
        variables: {
          id: configData?.staffSalaryConfig?.id,
          input: data
        }
      });
    }
  };

  const handleOpenPaymentDialog = (mode: 'create' | 'edit', payment?: any) => {
    setPaymentMode(mode);
    setSelectedPayment(payment);
    setPaymentDialogOpen(true);
  };

  const handlePaymentSubmit = (data: any) => {
    if (paymentMode === 'create') {
      createPayment({
        variables: {
          input: {
            ...data,
            staffId,
            restaurantId: restaurant?.id
          }
        }
      });
    } else {
      updatePayment({
        variables: {
          id: selectedPayment.id,
          input: data
        }
      });
    }
  };

  const handleDeletePayment = (payment: any) => {
    setPaymentToDelete(payment);
    setDeleteDialogOpen(true);
  };

  const confirmDeletePayment = () => {
    if (paymentToDelete) {
      deletePayment({
        variables: {
          id: paymentToDelete.id
        }
      });
    }
  };

  const handleOpenAdvanceDialog = (mode: 'create' | 'edit', advance?: any) => {
    setAdvanceMode(mode);
    setSelectedAdvance(advance);
    setAdvanceDialogOpen(true);
  };

  const handleAdvanceSubmit = (data: any) => {
    if (advanceMode === 'create') {
      createAdvance({
        variables: {
          input: {
            ...data,
            staffId,
            restaurantId: restaurant?.id
          }
        }
      });
    } else {
      updateAdvance({
        variables: {
          id: selectedAdvance.id,
          input: data
        }
      });
    }
  };

  const handleDeleteAdvance = (advance: any) => {
    setAdvanceToDelete(advance);
    setDeleteAdvanceDialogOpen(true);
  };

  const confirmDeleteAdvance = () => {
    if (advanceToDelete) {
      deleteAdvance({
        variables: {
          id: advanceToDelete.id
        }
      });
    }
  };

  if (staffLoading || !staffId) {
    return (
      <Layout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  const staff = staffData?.staffById;
  const config = configData?.staffSalaryConfig;
  const payments = paymentsData?.staffSalaryPayments?.data || [];
  const totalCount = paymentsData?.staffSalaryPayments?.totalCount || 0;
  const summary = summaryData?.staffSalarySummary;
  const advances = advancesData?.staffAdvancePayments?.data || [];
  const advanceTotalCount = advancesData?.staffAdvancePayments?.totalCount || 0;
  const advanceSummary = advanceSummaryData?.staffAdvanceSummary;

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/restaurant/staff-management')}
          >
            Back to Staff
          </Button>
          <Typography variant="h4">
            Salary Management - {staff?.name}
          </Typography>
        </Box>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
            <Tab icon={<Person />} label="Summary" />
            <Tab icon={<Settings />} label="Configuration" />
            <Tab icon={<Payment />} label="Payments" />
            <Tab icon={<AccountBalanceWallet />} label="Advance Payments" />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          {summaryLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : summary ? (
            <Box>
              <SalarySummaryCard 
                summary={{
                  ...summary,
                  currency: restaurant 
                    ? getRestaurantCurrency(restaurant).symbol 
                    : getCurrencySymbolFromCode(summary.currency)
                }} 
              />
            </Box>
          ) : (
            <Alert severity="info" sx={{ borderRadius: 2 }}>No salary data available</Alert>
          )}
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          {configLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Card sx={{ boxShadow: 3, borderRadius: 2 }}>
              <Box sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>Salary Configuration</Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={config ? <Settings /> : <Add />}
                    onClick={() => handleOpenConfigDialog(config ? 'edit' : 'create')}
                    sx={{ borderRadius: 2 }}
                  >
                    {config ? 'Update Configuration' : 'Set Configuration'}
                  </Button>
                </Box>

                {config ? (
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">Salary Type</Typography>
                      <Typography variant="body1">{config.salaryType}</Typography>
                    </Box>
                    {config.baseSalary && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">Base Salary</Typography>
                        <Typography variant="body1">
                          {restaurant 
                            ? getRestaurantCurrency(restaurant).symbol 
                            : getCurrencySymbolFromCode(config.currency)
                          } {config.baseSalary.toFixed(2)}
                        </Typography>
                      </Box>
                    )}
                    {config.hourlyRate && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">Hourly Rate</Typography>
                        <Typography variant="body1">
                          {restaurant 
                            ? getRestaurantCurrency(restaurant).symbol 
                            : getCurrencySymbolFromCode(config.currency)
                          } {config.hourlyRate.toFixed(2)}
                        </Typography>
                      </Box>
                    )}
                    <Box>
                      <Typography variant="body2" color="text.secondary">Payment Frequency</Typography>
                      <Typography variant="body1">{config.paymentFrequency}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">Effective Date</Typography>
                      <Typography variant="body1">{new Date(config.effectiveDate).toLocaleDateString()}</Typography>
                    </Box>
                    {config.notes && (
                      <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
                        <Typography variant="body2" color="text.secondary">Notes</Typography>
                        <Typography variant="body1">{config.notes}</Typography>
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Alert severity="info" sx={{ borderRadius: 2 }}>No salary configuration set. Please set one to start managing payments.</Alert>
                )}
              </Box>
            </Card>
          )}
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <Card sx={{ boxShadow: 3, borderRadius: 2 }}>
            <Box sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>Payment History</Typography>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<Add />}
                  onClick={() => handleOpenPaymentDialog('create')}
                  disabled={!config}
                  sx={{ borderRadius: 2 }}
                >
                  Create Payment
                </Button>
              </Box>

              {!config && (
                <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                  Please set a salary configuration before creating payments.
                </Alert>
              )}

              {paymentsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <SalaryPaymentTable
                  payments={payments}
                  currency={restaurant 
                    ? getRestaurantCurrency(restaurant).symbol 
                    : getCurrencySymbolFromCode(config?.currency || 'USD')
                  }
                  onEdit={(payment) => handleOpenPaymentDialog('edit', payment)}
                  onDelete={handleDeletePayment}
                  canManage={true}
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

        <TabPanel value={activeTab} index={3}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {advanceSummary && (
              <Card sx={{ boxShadow: 3, borderRadius: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                  <Box sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                      Advance Payment Summary
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' }, gap: 2 }}>
                      <Box>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>Total Advance</Typography>
                        <Typography variant="h6">
                          {restaurant 
                            ? getRestaurantCurrency(restaurant).symbol 
                            : getCurrencySymbolFromCode(advanceSummary.currency)
                          } {advanceSummary.totalAdvance.toFixed(2)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>Total Settled</Typography>
                        <Typography variant="h6">
                          {restaurant 
                            ? getRestaurantCurrency(restaurant).symbol 
                            : getCurrencySymbolFromCode(advanceSummary.currency)
                          } {advanceSummary.totalSettled.toFixed(2)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>Pending Settlement</Typography>
                        <Typography variant="h6" sx={{ color: advanceSummary.pendingSettlement > 0 ? 'warning.light' : 'inherit' }}>
                          {restaurant 
                            ? getRestaurantCurrency(restaurant).symbol 
                            : getCurrencySymbolFromCode(advanceSummary.currency)
                          } {advanceSummary.pendingSettlement.toFixed(2)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>Unsettled Count</Typography>
                        <Typography variant="h6">{advanceSummary.unsettledCount}</Typography>
                      </Box>
                    </Box>
                  </Box>
                </Card>
            )}
            <Card sx={{ boxShadow: 3, borderRadius: 2 }}>
              <Box sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>Advance Payment History</Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<Add />}
                    onClick={() => handleOpenAdvanceDialog('create')}
                    sx={{ borderRadius: 2 }}
                  >
                    Create Advance
                  </Button>
                </Box>

                {advancesLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <AdvancePaymentTable
                    advances={advances}
                    currency={restaurant 
                      ? getRestaurantCurrency(restaurant).symbol 
                      : getCurrencySymbolFromCode(config?.currency || 'USD')
                    }
                    onEdit={(advance) => handleOpenAdvanceDialog('edit', advance)}
                    onDelete={handleDeleteAdvance}
                    canManage={true}
                    page={advancePage}
                    rowsPerPage={advanceRowsPerPage}
                    totalCount={advanceTotalCount}
                    onPageChange={setAdvancePage}
                    onRowsPerPageChange={(newRowsPerPage) => {
                      setAdvanceRowsPerPage(newRowsPerPage);
                      setAdvancePage(0);
                    }}
                  />
                )}
              </Box>
            </Card>
          </Box>
        </TabPanel>

        <SalaryConfigForm
          open={configDialogOpen}
          mode={configMode}
          initialData={config}
          loading={setConfigLoading || updateConfigLoading}
          onClose={() => setConfigDialogOpen(false)}
          onSubmit={handleConfigSubmit}
        />

        <SalaryPaymentForm
          open={paymentDialogOpen}
          mode={paymentMode}
          initialData={selectedPayment}
          salaryConfig={config}
          unsettledAdvance={advanceSummary?.pendingSettlement || 0}
          restaurant={restaurant}
          loading={createPaymentLoading || updatePaymentLoading}
          onClose={() => {
            setPaymentDialogOpen(false);
            setSelectedPayment(null);
          }}
          onSubmit={handlePaymentSubmit}
        />

        <AdvancePaymentForm
          open={advanceDialogOpen}
          mode={advanceMode}
          initialData={selectedAdvance}
          currency={config?.currency || 'USD'}
          restaurant={restaurant}
          loading={createAdvanceLoading || updateAdvanceLoading}
          onClose={() => {
            setAdvanceDialogOpen(false);
            setSelectedAdvance(null);
          }}
          onSubmit={handleAdvanceSubmit}
        />

        <ConfirmationDialog
          open={deleteDialogOpen}
          title="Delete Payment"
          message={`Are you sure you want to delete this payment? This action cannot be undone.`}
          onConfirm={confirmDeletePayment}
          onClose={() => {
            setDeleteDialogOpen(false);
            setPaymentToDelete(null);
          }}
          loading={deletePaymentLoading}
        />

        <ConfirmationDialog
          open={deleteAdvanceDialogOpen}
          title="Delete Advance Payment"
          message={`Are you sure you want to delete this advance payment? This action cannot be undone.`}
          onConfirm={confirmDeleteAdvance}
          onClose={() => {
            setDeleteAdvanceDialogOpen(false);
            setAdvanceToDelete(null);
          }}
          loading={deleteAdvanceLoading}
        />

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          message={snackbar.message}
        />
      </Box>
    </Layout>
  );
}

