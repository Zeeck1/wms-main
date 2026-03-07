import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

// ─── Products ─────────────────────────────────────────
export const getProducts = (params) => api.get('/products', { params });
export const getProduct = (id) => api.get(`/products/${id}`);
export const createProduct = (data) => api.post('/products', data);
export const updateProduct = (id, data) => api.put(`/products/${id}`, data);
export const deleteProduct = (id) => api.delete(`/products/${id}`);
export const deleteAllProducts = (params) => api.delete('/products', { params });

// ─── Locations ────────────────────────────────────────
export const getLocations = () => api.get('/locations');
export const getLocation = (id) => api.get(`/locations/${id}`);
export const createLocation = (data) => api.post('/locations', data);
export const updateLocation = (id, data) => api.put(`/locations/${id}`, data);
export const deleteLocation = (id) => api.delete(`/locations/${id}`);
export const deleteAllLocations = () => api.delete('/locations');

// ─── Lots ─────────────────────────────────────────────
export const getLots = (params) => api.get('/lots', { params });
export const getLot = (id) => api.get(`/lots/${id}`);
export const createLot = (data) => api.post('/lots', data);
export const updateLot = (id, data) => api.put(`/lots/${id}`, data);
export const updateLotCsInDate = (id, cs_in_date) => api.patch(`/lots/${id}`, { cs_in_date });

// ─── Movements ────────────────────────────────────────
export const getMovements = (params) => api.get('/movements', { params });
export const stockIn = (data) => api.post('/movements/stock-in', data);
export const stockOut = (data) => api.post('/movements/stock-out', data);
export const adjustInventoryBalance = (data) => api.post('/movements/adjust', data);

// ─── Inventory ────────────────────────────────────────
export const getInventory = (params) => api.get('/inventory', { params });
export const getDashboard = () => api.get('/inventory/dashboard');
export const deleteAllStockData = (params) => api.delete('/inventory/all', { params });

// ─── Withdrawals ──────────────────────────────────────
export const getWithdrawals = (params) => api.get('/withdrawals', { params });
export const getWithdrawal = (id) => api.get(`/withdrawals/${id}`);
export const createWithdrawal = (data) => api.post('/withdrawals', data);
export const updateWithdrawalItems = (id, data) => api.put(`/withdrawals/${id}/items`, data);
export const updateWithdrawalStatus = (id, data) => api.put(`/withdrawals/${id}/status`, data);
export const cancelWithdrawal = (id) => api.delete(`/withdrawals/${id}`);

// ─── Upload ───────────────────────────────────────────
export const uploadExcel = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

export const uploadContainerExtra = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/upload/container-extra', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

// ─── Reports ─────────────────────────────────────────
export const getLowStockStocks = (params) => api.get('/reports/low-stock', { params });
export const getNoMovementStocks = (params) => api.get('/reports/no-movement', { params });
export const sendLineNotification = (data) => api.post('/reports/no-movement/send-line', data);
export const sendEmailReport = (data) => api.post('/reports/no-movement/send-email', data);

// ─── Settings ────────────────────────────────────────
export const getSettings = () => api.get('/settings');
export const saveSettings = (data) => api.put('/settings', data);

export default api;
