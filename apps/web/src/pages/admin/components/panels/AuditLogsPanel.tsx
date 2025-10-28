import React from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Alert,
  LinearProgress,
  Chip,
  Tooltip,
  IconButton
} from '@mui/material';
import { ContentCopy } from '@mui/icons-material';
import { useQuery as useGqlQuery, useSubscription, useLazyQuery } from '@apollo/client';
import { GET_AUDIT_LOGS } from '../../../../graphql/queries/admin';
import { AUDIT_LOG_CREATED_SUBSCRIPTION } from '../../../../graphql/subscriptions/admin';
import { formatDateTime } from '../../../../utils/dateFormatting';
import { GET_STAFF_BY_ID } from '../../../../graphql/queries/staff';
import { GET_RESTAURANT_BY_ID } from '../../../../graphql/queries/restaurant';
import { GET_ORDER_BY_ID } from '../../../../graphql/queries/orders';

export default function AuditLogsPanel() {
  const [action, setAction] = React.useState<string>('');
  const [entityType, setEntityType] = React.useState<string>('');
  const [restaurantIdFilter, setRestaurantIdFilter] = React.useState<string>('');
  const [actorRoleFilter, setActorRoleFilter] = React.useState<string>('');
  const [actorIdFilter, setActorIdFilter] = React.useState<string>('');
  const [searchText, setSearchText] = React.useState<string>('');
  const [page, setPage] = React.useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = React.useState<number>(25);

  const { data, loading, refetch } = useGqlQuery(GET_AUDIT_LOGS, {
    variables: { limit: rowsPerPage, offset: page * rowsPerPage, action: action || undefined, entityType: entityType || undefined, restaurantId: restaurantIdFilter || undefined },
    fetchPolicy: 'cache-and-network'
  });

  // Lightweight name caches for actors, restaurants, orders
  const [actorNameById, setActorNameById] = React.useState<Record<string, string>>({});
  const [restaurantNameById, setRestaurantNameById] = React.useState<Record<string, string>>({});
  const [entityNameById, setEntityNameById] = React.useState<Record<string, string>>({});
  const [loadStaffById] = useLazyQuery(GET_STAFF_BY_ID);
  const [loadRestaurantById] = useLazyQuery(GET_RESTAURANT_BY_ID);
  const [loadOrderById] = useLazyQuery(GET_ORDER_BY_ID);

  useSubscription(AUDIT_LOG_CREATED_SUBSCRIPTION, {
    onData: ({ data: subData }) => {
      const newLog = subData.data?.auditLogCreated;
      if (!newLog) return;
      // Only refresh when the new log matches filters
      const matches = (
        (!action || newLog.action === action) &&
        (!entityType || newLog.entityType === entityType) &&
        (!restaurantIdFilter || newLog.restaurantId === restaurantIdFilter)
      );
      if (matches) {
        void refetch();
      }
    }
  });

  const logs = data?.auditLogs || [];

  // Client-side refinement filters for actorRole/actorId/search without breaking server pagination
  const refinedLogs = logs.filter((l: any) => {
    const matchesActorRole = !actorRoleFilter || (l.actorRole || 'SYSTEM') === actorRoleFilter;
    const matchesActorId = !actorIdFilter || String(l.actorId || '').toLowerCase().includes(actorIdFilter.toLowerCase());
    const matchesSearch = !searchText ||
      String(l.reason || '').toLowerCase().includes(searchText.toLowerCase()) ||
      String(l.action || '').toLowerCase().includes(searchText.toLowerCase()) ||
      String(l.entityType || '').toLowerCase().includes(searchText.toLowerCase());
    return matchesActorRole && matchesActorId && matchesSearch;
  });

  // Resolve names for actors/restaurants/entities shown in current page
  React.useEffect(() => {
    const toResolveActorIds = new Set<string>();
    const toResolveRestaurantIds = new Set<string>();
    const toResolveEntityIds = new Set<string>();
    
    refinedLogs.forEach((l: any) => {
      if (l.actorRole === 'STAFF' && l.actorId && !actorNameById[String(l.actorId)]) {
        toResolveActorIds.add(String(l.actorId));
      }
      if (l.restaurantId && !restaurantNameById[String(l.restaurantId)]) {
        toResolveRestaurantIds.add(String(l.restaurantId));
      }
      // Some logs may have actorRole RESTAURANT and actorId holds restaurantId
      if (l.actorRole === 'RESTAURANT' && l.actorId && !restaurantNameById[String(l.actorId)]) {
        toResolveRestaurantIds.add(String(l.actorId));
      }
      // Resolve entity names (orders)
      if (l.entityType === 'ORDER' && l.entityId && !entityNameById[String(l.entityId)]) {
        toResolveEntityIds.add(String(l.entityId));
      }
    });

    // Resolve up to 20 per effect to avoid flooding
    Array.from(toResolveActorIds).slice(0, 20).forEach(async (id) => {
      try {
        const res = await loadStaffById({ variables: { id } });
        const name = res.data?.staffById?.name || '';
        if (name) setActorNameById(prev => ({ ...prev, [id]: name }));
      } catch {}
    });
    Array.from(toResolveRestaurantIds).slice(0, 20).forEach(async (id) => {
      try {
        const res = await loadRestaurantById({ variables: { id } });
        const name = res.data?.restaurantById?.name || '';
        if (name) setRestaurantNameById(prev => ({ ...prev, [id]: name }));
      } catch {}
    });
    // Resolve orders - use a simplified identifier (e.g., table number or customer name)
    Array.from(toResolveEntityIds).slice(0, 20).forEach(async (id) => {
      try {
        const res = await loadOrderById({ variables: { id } });
        const order = res.data?.order;
        if (order) {
          const label = order.tableNumber ? `Table ${order.tableNumber}` : (order.customerName || id.slice(-8));
          setEntityNameById(prev => ({ ...prev, [id]: label }));
        }
      } catch {}
    });
  }, [refinedLogs, actorNameById, restaurantNameById, entityNameById, loadStaffById, loadRestaurantById, loadOrderById]);

  const handleExportCsv = () => {
    const headers = ['createdAt', 'actorRole', 'actorId', 'action', 'entityType', 'entityId', 'reason', 'restaurantId'];
    const rows = logs.map((l: any) => [l.createdAt, l.actorRole || '', l.actorId || '', l.action, l.entityType, l.entityId, (l.reason || '').replace(/\n|\r/g, ' '), l.restaurantId || '']);
    const csv = [headers.join(','), ...rows.map((r: (string | number | boolean)[]) => r.map((f: string | number | boolean) => `"${String(f).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${new Date().toISOString()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="h6">Audit Logs</Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Action</InputLabel>
            <Select label="Action" value={action} onChange={(e) => { setAction(e.target.value); void refetch({ limit: rowsPerPage, offset: 0, action: e.target.value || undefined, entityType: entityType || undefined, restaurantId: restaurantIdFilter || undefined }); setPage(0); }}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="RESTAURANT_UPDATED">RESTAURANT_UPDATED</MenuItem>
              <MenuItem value="STAFF_ACTIVATED">STAFF_ACTIVATED</MenuItem>
              <MenuItem value="STAFF_DEACTIVATED">STAFF_DEACTIVATED</MenuItem>
              <MenuItem value="ORDER_UPDATED">ORDER_UPDATED</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Entity</InputLabel>
            <Select label="Entity" value={entityType} onChange={(e) => { setEntityType(e.target.value); void refetch({ limit: rowsPerPage, offset: 0, action: action || undefined, entityType: e.target.value || undefined, restaurantId: restaurantIdFilter || undefined }); setPage(0); }}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="RESTAURANT">RESTAURANT</MenuItem>
              <MenuItem value="STAFF">STAFF</MenuItem>
              <MenuItem value="ORDER">ORDER</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Actor Role</InputLabel>
            <Select label="Actor Role" value={actorRoleFilter} onChange={(e) => setActorRoleFilter(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="ADMIN">ADMIN</MenuItem>
              <MenuItem value="STAFF">STAFF</MenuItem>
              <MenuItem value="RESTAURANT">RESTAURANT</MenuItem>
              <MenuItem value="SYSTEM">SYSTEM</MenuItem>
            </Select>
          </FormControl>
          <TextField size="small" label="Actor ID" value={actorIdFilter} onChange={(e) => setActorIdFilter(e.target.value)} sx={{ width: 180 }} />
          <TextField size="small" label="Restaurant ID" value={restaurantIdFilter} onChange={(e) => setRestaurantIdFilter(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { void refetch({ limit: rowsPerPage, offset: 0, action: action || undefined, entityType: entityType || undefined, restaurantId: restaurantIdFilter || undefined }); setPage(0); } }} />
          <TextField size="small" label="Search text" value={searchText} onChange={(e) => setSearchText(e.target.value)} sx={{ width: 200 }} />
          <Button variant="outlined" onClick={() => { void refetch({ limit: rowsPerPage, offset: 0, action: action || undefined, entityType: entityType || undefined, restaurantId: restaurantIdFilter || undefined }); setPage(0); }}>Apply</Button>
          <Button variant="outlined" onClick={handleExportCsv}>Export CSV</Button>
          <Button variant="outlined" onClick={() => void refetch()}>Refresh</Button>
        </Box>
      </Box>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Time</TableCell>
              <TableCell>Actor</TableCell>
              <TableCell>Actor ID</TableCell>
              <TableCell>Restaurant</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Entity</TableCell>
              <TableCell>Reason</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5}><LinearProgress /></TableCell></TableRow>
            ) : refinedLogs.length === 0 ? (
              <TableRow><TableCell colSpan={5}><Alert severity="info">No logs</Alert></TableCell></TableRow>
            ) : (
              refinedLogs.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell>{formatDateTime(log.createdAt).date} {formatDateTime(log.createdAt).time}</TableCell>
                  <TableCell>
                    <Chip label={log.actorRole || 'SYSTEM'} size="small" sx={{ mr: 1 }} />
                    {(() => {
                      const id = String(log.actorId || '');
                      const role = log.actorRole || 'SYSTEM';
                      if (role === 'STAFF' && actorNameById[id]) return (
                        <Typography variant="caption">{actorNameById[id]}</Typography>
                      );
                      if (role === 'RESTAURANT') {
                        const rid = id || String(log.restaurantId || '');
                        if (restaurantNameById[rid]) return (
                          <Typography variant="caption">{restaurantNameById[rid]}</Typography>
                        );
                      }
                      return null;
                    })()}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Chip label={String(log.actorId || '-').slice(-8)} size="small" />
                      {(() => {
                        const id = String(log.actorId || '');
                        const role = log.actorRole || 'SYSTEM';
                        let label = '';
                        if (role === 'STAFF' && actorNameById[id]) label = actorNameById[id];
                        else if (role === 'RESTAURANT' && actorNameById[id]) label = actorNameById[id];
                        if (label) {
                          return <Chip label={label} size="small" color="primary" variant="outlined" />;
                        }
                        return null;
                      })()}
                      {log.actorId && (
                        <Tooltip title="Copy Actor ID">
                          <IconButton size="small" onClick={() => navigator.clipboard.writeText(String(log.actorId))}>
                            <ContentCopy fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {log.restaurantId && restaurantNameById[String(log.restaurantId)] && (
                      <Chip label={restaurantNameById[String(log.restaurantId)]} size="small" sx={{ mr: 1 }} />
                    )}
                    <Chip label={log.restaurantId ? String(log.restaurantId).slice(-8) : 'N/A'} size="small" sx={{ mr: 1 }} />
                    {log.restaurantId && (
                      <Tooltip title="Copy Restaurant ID">
                        <IconButton size="small" onClick={() => navigator.clipboard.writeText(String(log.restaurantId))}>
                          <ContentCopy fontSize="inherit" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell>{log.action}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                      <Chip label={log.entityType} size="small" />
                      <Chip label={`#${String(log.entityId).slice(-6)}`} size="small" />
                      {(() => {
                        const id = String(log.entityId || '');
                        if (log.entityType === 'ORDER' && entityNameById[id]) {
                          return <Chip label={entityNameById[id]} size="small" color="primary" variant="outlined" />;
                        }
                        return null;
                      })()}
                    </Box>
                  </TableCell>
                  <TableCell>{log.reason || '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        rowsPerPageOptions={[10, 25, 50]}
        count={-1}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(_, newPage) => { setPage(newPage); void refetch({ limit: rowsPerPage, offset: newPage * rowsPerPage, action: action || undefined, entityType: entityType || undefined, restaurantId: restaurantIdFilter || undefined }); }}
        onRowsPerPageChange={(e) => { const newRpp = parseInt(e.target.value, 10); setRowsPerPage(newRpp); setPage(0); void refetch({ limit: newRpp, offset: 0, action: action || undefined, entityType: entityType || undefined, restaurantId: restaurantIdFilter || undefined }); }}
      />
    </Box>
  );
}
