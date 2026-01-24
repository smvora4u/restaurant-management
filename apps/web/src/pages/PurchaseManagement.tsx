import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  ArrowBack,
  Add,
  ShoppingCart,
  Store,
  Category as CategoryIcon
} from '@mui/icons-material';
import { useQuery, useMutation } from '@apollo/client';
import { getCurrencySymbolFromCode, getRestaurantCurrency } from '../utils/currency';
import { toTimestamp } from '../utils/dateFormatting';
import Layout from '../components/Layout';
import PurchaseForm from '../components/purchases/PurchaseForm';
import PurchaseTable from '../components/purchases/PurchaseTable';
import VendorForm from '../components/purchases/VendorForm';
import VendorTable from '../components/purchases/VendorTable';
import CategoryForm from '../components/purchases/CategoryForm';
import CategoryTable from '../components/purchases/CategoryTable';
import {
  GET_PURCHASE_CATEGORIES,
  GET_VENDORS,
  GET_PURCHASES,
  CREATE_PURCHASE_CATEGORY,
  UPDATE_PURCHASE_CATEGORY,
  DELETE_PURCHASE_CATEGORY,
  CREATE_VENDOR,
  UPDATE_VENDOR,
  DELETE_VENDOR,
  CREATE_PURCHASE,
  UPDATE_PURCHASE,
  DELETE_PURCHASE,
  SETTLE_PURCHASES
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
      id={`purchase-tabpanel-${index}`}
      aria-labelledby={`purchase-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function PurchaseManagement() {
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [activeTab, setActiveTab] = useState(0);
  
  // Purchase state
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [purchaseMode, setPurchaseMode] = useState<'create' | 'edit'>('create');
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null);
  const [purchasePage, setPurchasePage] = useState(0);
  const [purchaseRowsPerPage, setPurchaseRowsPerPage] = useState(10);
  const [selectedPurchaseIds, setSelectedPurchaseIds] = useState<string[]>([]);
  const [purchaseFilters, setPurchaseFilters] = useState({
    vendorId: '',
    categoryId: '',
    paymentStatus: '',
    startDate: '',
    endDate: ''
  });
  const [settleDialogOpen, setSettleDialogOpen] = useState(false);
  const [settleForm, setSettleForm] = useState({
    paymentMethod: '',
    paymentTransactionId: '',
    paidAt: ''
  });
  const [settleErrors, setSettleErrors] = useState<Record<string, string>>({});
  
  // Vendor state
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const [vendorMode, setVendorMode] = useState<'create' | 'edit'>('create');
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  
  // Category state
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categoryMode, setCategoryMode] = useState<'create' | 'edit'>('create');
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  
  // Delete dialogs
  const [deletePurchaseDialogOpen, setDeletePurchaseDialogOpen] = useState(false);
  const [deleteVendorDialogOpen, setDeleteVendorDialogOpen] = useState(false);
  const [deleteCategoryDialogOpen, setDeleteCategoryDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  
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

  useEffect(() => {
    setSelectedPurchaseIds([]);
  }, [
    purchaseFilters.vendorId,
    purchaseFilters.categoryId,
    purchaseFilters.paymentStatus,
    purchaseFilters.startDate,
    purchaseFilters.endDate
  ]);

  const restaurantId = restaurant?.id;

  // Queries
  const { data: categoriesData, loading: categoriesLoading, refetch: refetchCategories } = useQuery(GET_PURCHASE_CATEGORIES, {
    variables: { restaurantId },
    skip: !restaurantId
  });

  const { data: vendorsData, loading: vendorsLoading, refetch: refetchVendors } = useQuery(GET_VENDORS, {
    variables: { restaurantId },
    skip: !restaurantId
  });

  const { data: purchasesData, loading: purchasesLoading, refetch: refetchPurchases } = useQuery(GET_PURCHASES, {
    variables: {
      restaurantId,
      limit: purchaseRowsPerPage,
      offset: purchasePage * purchaseRowsPerPage,
      vendorId: purchaseFilters.vendorId || undefined,
      categoryId: purchaseFilters.categoryId || undefined,
      paymentStatus: purchaseFilters.paymentStatus || undefined,
      startDate: (() => {
        const value = toTimestamp(purchaseFilters.startDate);
        return value === null ? undefined : String(value);
      })(),
      endDate: (() => {
        const value = toTimestamp(purchaseFilters.endDate);
        return value === null ? undefined : String(value);
      })()
    },
    skip: !restaurantId
  });

  // Mutations
  const [createCategory, { loading: createCategoryLoading }] = useMutation(CREATE_PURCHASE_CATEGORY, {
    onCompleted: () => {
      setCategoryDialogOpen(false);
      refetchCategories();
      setSnackbar({
        open: true,
        message: 'Category created successfully!',
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

  const [updateCategory, { loading: updateCategoryLoading }] = useMutation(UPDATE_PURCHASE_CATEGORY, {
    onCompleted: () => {
      setCategoryDialogOpen(false);
      refetchCategories();
      setSnackbar({
        open: true,
        message: 'Category updated successfully!',
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

  const [deleteCategory, { loading: deleteCategoryLoading }] = useMutation(DELETE_PURCHASE_CATEGORY, {
    onCompleted: () => {
      setDeleteCategoryDialogOpen(false);
      setItemToDelete(null);
      refetchCategories();
      setSnackbar({
        open: true,
        message: 'Category deleted successfully!',
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

  const [createVendor, { loading: createVendorLoading }] = useMutation(CREATE_VENDOR, {
    onCompleted: () => {
      setVendorDialogOpen(false);
      refetchVendors();
      setSnackbar({
        open: true,
        message: 'Vendor created successfully!',
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

  const [updateVendor, { loading: updateVendorLoading }] = useMutation(UPDATE_VENDOR, {
    onCompleted: () => {
      setVendorDialogOpen(false);
      refetchVendors();
      setSnackbar({
        open: true,
        message: 'Vendor updated successfully!',
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

  const [deleteVendor, { loading: deleteVendorLoading }] = useMutation(DELETE_VENDOR, {
    onCompleted: () => {
      setDeleteVendorDialogOpen(false);
      setItemToDelete(null);
      refetchVendors();
      setSnackbar({
        open: true,
        message: 'Vendor deleted successfully!',
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

  const [createPurchase, { loading: createPurchaseLoading }] = useMutation(CREATE_PURCHASE, {
    onCompleted: () => {
      setPurchaseDialogOpen(false);
      refetchPurchases();
      setSnackbar({
        open: true,
        message: 'Purchase created successfully!',
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

  const [updatePurchase, { loading: updatePurchaseLoading }] = useMutation(UPDATE_PURCHASE, {
    onCompleted: () => {
      setPurchaseDialogOpen(false);
      setSelectedPurchase(null);
      refetchPurchases();
      setSnackbar({
        open: true,
        message: 'Purchase updated successfully!',
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

  const [deletePurchase, { loading: deletePurchaseLoading }] = useMutation(DELETE_PURCHASE, {
    onCompleted: () => {
      setDeletePurchaseDialogOpen(false);
      setItemToDelete(null);
      refetchPurchases();
      setSnackbar({
        open: true,
        message: 'Purchase deleted successfully!',
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

  const [settlePurchases, { loading: settlePurchasesLoading }] = useMutation(SETTLE_PURCHASES, {
    onCompleted: (data) => {
      const result = data?.settlePurchases;
      setSettleDialogOpen(false);
      setSelectedPurchaseIds([]);
      setSettleForm({
        paymentMethod: '',
        paymentTransactionId: '',
        paidAt: ''
      });
      setSettleErrors({});
      refetchPurchases();
      setSnackbar({
        open: true,
        message: `Settled ${result?.modifiedCount ?? 0} purchase(s)`,
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

  // Handlers
  const handleOpenPurchaseDialog = (mode: 'create' | 'edit', purchase?: any) => {
    setPurchaseMode(mode);
    setSelectedPurchase(purchase);
    setPurchaseDialogOpen(true);
  };

  const handleOpenSettleDialog = () => {
    const unpaidCount = purchasesData?.purchases?.unpaidCount ?? 0;
    if (selectedPurchaseIds.length === 0 && unpaidCount === 0) {
      setSnackbar({
        open: true,
        message: 'No unpaid purchases to settle',
        severity: 'info'
      });
      return;
    }
    setSettleForm({
      paymentMethod: '',
      paymentTransactionId: '',
      paidAt: ''
    });
    setSettleErrors({});
    setSettleDialogOpen(true);
  };

  const handleSettleSubmit = () => {
    const errors: Record<string, string> = {};
    if (!settleForm.paymentMethod) {
      errors.paymentMethod = 'Payment method is required';
    }

    let paidAtValue: number | null = null;
    if (settleForm.paidAt) {
      paidAtValue = toTimestamp(settleForm.paidAt);
      if (paidAtValue === null) {
        errors.paidAt = 'Paid date is invalid';
      }
    }

    if (Object.keys(errors).length > 0) {
      setSettleErrors(errors);
      return;
    }

    const input: any = {
      restaurantId,
      paymentMethod: settleForm.paymentMethod
    };

    if (settleForm.paymentTransactionId) {
      input.paymentTransactionId = settleForm.paymentTransactionId;
    }

    if (paidAtValue !== null) {
      input.paidAt = String(paidAtValue);
    }

    if (selectedPurchaseIds.length > 0) {
      input.purchaseIds = selectedPurchaseIds;
    } else {
      if (purchaseFilters.vendorId) input.vendorId = purchaseFilters.vendorId;
      if (purchaseFilters.categoryId) input.categoryId = purchaseFilters.categoryId;
      if (purchaseFilters.startDate) {
        const value = toTimestamp(purchaseFilters.startDate);
        if (value !== null) input.startDate = String(value);
      }
      if (purchaseFilters.endDate) {
        const value = toTimestamp(purchaseFilters.endDate);
        if (value !== null) input.endDate = String(value);
      }
    }

    settlePurchases({ variables: { input } });
  };

  const handlePurchaseSubmit = (data: any) => {
    if (purchaseMode === 'create') {
      createPurchase({
        variables: {
          input: {
            ...data,
            restaurantId
          }
        }
      });
    } else {
      updatePurchase({
        variables: {
          id: selectedPurchase.id,
          input: data
        }
      });
    }
  };

  const handleOpenVendorDialog = (mode: 'create' | 'edit', vendor?: any) => {
    setVendorMode(mode);
    setSelectedVendor(vendor);
    setVendorDialogOpen(true);
  };

  const handleVendorSubmit = (data: any) => {
    if (vendorMode === 'create') {
      createVendor({
        variables: {
          input: {
            ...data,
            restaurantId
          }
        }
      });
    } else {
      updateVendor({
        variables: {
          id: selectedVendor.id,
          input: data
        }
      });
    }
  };

  const handleOpenCategoryDialog = (mode: 'create' | 'edit', category?: any) => {
    setCategoryMode(mode);
    setSelectedCategory(category);
    setCategoryDialogOpen(true);
  };

  const handleCategorySubmit = (data: any) => {
    if (categoryMode === 'create') {
      createCategory({
        variables: {
          input: {
            ...data,
            restaurantId
          }
        }
      });
    } else {
      updateCategory({
        variables: {
          id: selectedCategory.id,
          input: data
        }
      });
    }
  };

  const handleDeletePurchase = (purchase: any) => {
    setItemToDelete(purchase);
    setDeletePurchaseDialogOpen(true);
  };

  const handleDeleteVendor = (vendor: any) => {
    setItemToDelete(vendor);
    setDeleteVendorDialogOpen(true);
  };

  const handleDeleteCategory = (category: any) => {
    setItemToDelete(category);
    setDeleteCategoryDialogOpen(true);
  };

  const confirmDeletePurchase = () => {
    if (itemToDelete) {
      deletePurchase({
        variables: {
          id: itemToDelete.id
        }
      });
    }
  };

  const confirmDeleteVendor = () => {
    if (itemToDelete) {
      deleteVendor({
        variables: {
          id: itemToDelete.id
        }
      });
    }
  };

  const confirmDeleteCategory = () => {
    if (itemToDelete) {
      deleteCategory({
        variables: {
          id: itemToDelete.id
        }
      });
    }
  };

  if (!restaurant) {
    return (
      <Layout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  const categories = categoriesData?.purchaseCategories || [];
  const vendors = vendorsData?.vendors || [];
  const purchases = purchasesData?.purchases?.data || [];
  const totalCount = purchasesData?.purchases?.totalCount || 0;
  const unpaidCount = purchasesData?.purchases?.unpaidCount ?? 0;
  const currency = restaurant ? getRestaurantCurrency(restaurant).symbol : getCurrencySymbolFromCode('USD');

  // Calculate summary (server-side aggregates across filtered records)
  const totalPurchases = purchasesData?.purchases?.totalAmountSum ?? 0;
  const unpaidAmount = purchasesData?.purchases?.unpaidAmountSum ?? 0;
  const settleTargetCount = selectedPurchaseIds.length > 0 ? selectedPurchaseIds.length : unpaidCount;
  const settleTargetLabel = selectedPurchaseIds.length > 0
    ? `${selectedPurchaseIds.length} selected unpaid purchase(s)`
    : `${unpaidCount} unpaid purchase(s) matching current filters`;

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/restaurant/dashboard')}
          >
            Back to Dashboard
          </Button>
          <Typography variant="h4">
            Purchase Management
          </Typography>
        </Box>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
            <Tab icon={<ShoppingCart />} label="Purchases" />
            <Tab icon={<Store />} label="Vendors" />
            <Tab icon={<CategoryIcon />} label="Categories" />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Summary Cards */}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <Card sx={{ p: 2 }}>
                  <Typography variant="body2" color="text.secondary">Total Purchases</Typography>
                  <Typography variant="h5">{currency} {totalPurchases.toFixed(2)}</Typography>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Card sx={{ p: 2 }}>
                  <Typography variant="body2" color="text.secondary">Unpaid Amount</Typography>
                  <Typography variant="h5" color="error">{currency} {unpaidAmount.toFixed(2)}</Typography>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Card sx={{ p: 2 }}>
                  <Typography variant="body2" color="text.secondary">Total Purchases Count</Typography>
                  <Typography variant="h5">{totalCount}</Typography>
                </Card>
              </Grid>
            </Grid>

            {/* Filters */}
            <Card sx={{ p: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>Vendor</InputLabel>
                    <Select
                      value={purchaseFilters.vendorId}
                      onChange={(e) => {
                        setPurchaseFilters({ ...purchaseFilters, vendorId: e.target.value });
                        setPurchasePage(0);
                      }}
                      label="Vendor"
                    >
                      <MenuItem value="">All</MenuItem>
                      {vendors.map((vendor: any) => (
                        <MenuItem key={vendor.id} value={vendor.id}>{vendor.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={purchaseFilters.categoryId}
                      onChange={(e) => {
                        setPurchaseFilters({ ...purchaseFilters, categoryId: e.target.value });
                        setPurchasePage(0);
                      }}
                      label="Category"
                    >
                      <MenuItem value="">All</MenuItem>
                      {categories.map((cat: any) => (
                        <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>Payment Status</InputLabel>
                    <Select
                      value={purchaseFilters.paymentStatus}
                      onChange={(e) => {
                        setPurchaseFilters({ ...purchaseFilters, paymentStatus: e.target.value });
                        setPurchasePage(0);
                      }}
                      label="Payment Status"
                    >
                      <MenuItem value="">All</MenuItem>
                      <MenuItem value="paid">Paid</MenuItem>
                      <MenuItem value="unpaid">Unpaid</MenuItem>
                      <MenuItem value="partial">Partial</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Start Date"
                    type="date"
                    value={purchaseFilters.startDate}
                    onChange={(e) => {
                      setPurchaseFilters({ ...purchaseFilters, startDate: e.target.value });
                      setPurchasePage(0);
                    }}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="End Date"
                    type="date"
                    value={purchaseFilters.endDate}
                    onChange={(e) => {
                      setPurchaseFilters({ ...purchaseFilters, endDate: e.target.value });
                      setPurchasePage(0);
                    }}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>
            </Card>

            {/* Purchase Table */}
            <Card sx={{ boxShadow: 3, borderRadius: 2 }}>
              <Box sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>Purchases</Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      color="success"
                      onClick={handleOpenSettleDialog}
                      disabled={settleTargetCount === 0}
                      sx={{ borderRadius: 2 }}
                    >
                      Settle Unpaid
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<Add />}
                      onClick={() => handleOpenPurchaseDialog('create')}
                      sx={{ borderRadius: 2 }}
                    >
                      Create Purchase
                    </Button>
                  </Box>
                </Box>

                {purchasesLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <PurchaseTable
                    purchases={purchases}
                    currency={currency}
                    onEdit={(purchase) => handleOpenPurchaseDialog('edit', purchase)}
                    onDelete={handleDeletePurchase}
                    canManage={true}
                    selectedIds={selectedPurchaseIds}
                    onSelectionChange={setSelectedPurchaseIds}
                    page={purchasePage}
                    rowsPerPage={purchaseRowsPerPage}
                    totalCount={totalCount}
                    onPageChange={setPurchasePage}
                    onRowsPerPageChange={(newRowsPerPage) => {
                      setPurchaseRowsPerPage(newRowsPerPage);
                      setPurchasePage(0);
                    }}
                  />
                )}
              </Box>
            </Card>
          </Box>
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <Card sx={{ boxShadow: 3, borderRadius: 2 }}>
            <Box sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>Vendors</Typography>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<Add />}
                  onClick={() => handleOpenVendorDialog('create')}
                  sx={{ borderRadius: 2 }}
                >
                  Create Vendor
                </Button>
              </Box>

              {vendorsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <VendorTable
                  vendors={vendors}
                  onEdit={(vendor) => handleOpenVendorDialog('edit', vendor)}
                  onDelete={handleDeleteVendor}
                />
              )}
            </Box>
          </Card>
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <Card sx={{ boxShadow: 3, borderRadius: 2 }}>
            <Box sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>Categories</Typography>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<Add />}
                  onClick={() => handleOpenCategoryDialog('create')}
                  sx={{ borderRadius: 2 }}
                >
                  Create Category
                </Button>
              </Box>

              {categoriesLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <CategoryTable
                  categories={categories}
                  onEdit={(category) => handleOpenCategoryDialog('edit', category)}
                  onDelete={handleDeleteCategory}
                />
              )}
            </Box>
          </Card>
        </TabPanel>

        {/* Dialogs */}
        <PurchaseForm
          open={purchaseDialogOpen}
          mode={purchaseMode}
          initialData={selectedPurchase}
          vendors={vendors}
          categories={categories}
          restaurant={restaurant}
          loading={createPurchaseLoading || updatePurchaseLoading}
          onClose={() => {
            setPurchaseDialogOpen(false);
            setSelectedPurchase(null);
          }}
          onSubmit={handlePurchaseSubmit}
        />

        <Dialog
          open={settleDialogOpen}
          onClose={() => setSettleDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Settle Unpaid Purchases</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              This will mark {settleTargetLabel} as paid. Only unpaid purchases will be updated.
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControl fullWidth size="small" error={!!settleErrors.paymentMethod}>
                <InputLabel>Payment Method</InputLabel>
                <Select
                  value={settleForm.paymentMethod}
                  onChange={(event) => {
                    setSettleForm((prev) => ({ ...prev, paymentMethod: event.target.value }));
                    if (settleErrors.paymentMethod) {
                      setSettleErrors((prev) => ({ ...prev, paymentMethod: '' }));
                    }
                  }}
                  label="Payment Method"
                >
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="card">Card</MenuItem>
                  <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                  <MenuItem value="online">Online</MenuItem>
                </Select>
                {settleErrors.paymentMethod && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                    {settleErrors.paymentMethod}
                  </Typography>
                )}
              </FormControl>
              <TextField
                fullWidth
                size="small"
                label="Transaction ID (Optional)"
                value={settleForm.paymentTransactionId}
                onChange={(event) => setSettleForm((prev) => ({ ...prev, paymentTransactionId: event.target.value }))}
                helperText="Leave blank if not applicable"
              />
              <TextField
                fullWidth
                size="small"
                label="Paid Date (Optional)"
                type="date"
                value={settleForm.paidAt}
                onChange={(event) => {
                  setSettleForm((prev) => ({ ...prev, paidAt: event.target.value }));
                  if (settleErrors.paidAt) {
                    setSettleErrors((prev) => ({ ...prev, paidAt: '' }));
                  }
                }}
                error={!!settleErrors.paidAt}
                helperText={settleErrors.paidAt || 'Defaults to today if left blank'}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setSettleDialogOpen(false)} disabled={settlePurchasesLoading}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={handleSettleSubmit}
              disabled={settlePurchasesLoading || settleTargetCount === 0}
            >
              {settlePurchasesLoading ? 'Settling...' : 'Settle Purchases'}
            </Button>
          </DialogActions>
        </Dialog>

        <VendorForm
          open={vendorDialogOpen}
          mode={vendorMode}
          initialData={selectedVendor}
          loading={createVendorLoading || updateVendorLoading}
          onClose={() => {
            setVendorDialogOpen(false);
            setSelectedVendor(null);
          }}
          onSubmit={handleVendorSubmit}
        />

        <CategoryForm
          open={categoryDialogOpen}
          mode={categoryMode}
          initialData={selectedCategory}
          loading={createCategoryLoading || updateCategoryLoading}
          onClose={() => {
            setCategoryDialogOpen(false);
            setSelectedCategory(null);
          }}
          onSubmit={handleCategorySubmit}
        />

        <ConfirmationDialog
          open={deletePurchaseDialogOpen}
          title="Delete Purchase"
          message="Are you sure you want to delete this purchase? This action cannot be undone."
          onConfirm={confirmDeletePurchase}
          onClose={() => {
            setDeletePurchaseDialogOpen(false);
            setItemToDelete(null);
          }}
          loading={deletePurchaseLoading}
        />

        <ConfirmationDialog
          open={deleteVendorDialogOpen}
          title="Delete Vendor"
          message="Are you sure you want to delete this vendor? This action cannot be undone."
          onConfirm={confirmDeleteVendor}
          onClose={() => {
            setDeleteVendorDialogOpen(false);
            setItemToDelete(null);
          }}
          loading={deleteVendorLoading}
        />

        <ConfirmationDialog
          open={deleteCategoryDialogOpen}
          title="Delete Category"
          message="Are you sure you want to delete this category? This action cannot be undone."
          onConfirm={confirmDeleteCategory}
          onClose={() => {
            setDeleteCategoryDialogOpen(false);
            setItemToDelete(null);
          }}
          loading={deleteCategoryLoading}
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

