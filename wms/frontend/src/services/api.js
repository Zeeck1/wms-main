import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

// ─── Products ─────────────────────────────────────────
export const getProducts = () => api.get('/products');
export const getProduct = (id) => api.get(`/products/${id}`);
export const createProduct = (data) => api.post('/products', data);
export const updateProduct = (id, data) => api.put(`/products/${id}`, data);
export const deleteProduct = (id) => api.delete(`/products/${id}`);
export const deleteAllProducts = () => api.delete('/products');

// ─── Locations ────────────────────────────────────────
export const getLocations = () => api.get('/locations');
export const getLocation = (id) => api.get(`/locations/${id}`);
export const createLocation = (data) => api.post('/locations', data);
export const updateLocation = (id, data) => api.put(`/locations/${id}`, data);
export const deleteLocation = (id) => api.delete(`/locations/${id}`);
export const deleteAllLocations = () => api.delete('/locations');

// ─── Lots ─────────────────────────────────────────────
export const getLots = () => api.get('/lots');
export const getLot = (id) => api.get(`/lots/${id}`);
export const createLot = (data) => api.post('/lots', data);
export const updateLot = (id, data) => api.put(`/lots/${id}`, data);

// ─── Movements ────────────────────────────────────────
export const getMovements = (params) => api.get('/movements', { params });
export const stockIn = (data) => api.post('/movements/stock-in', data);
export const stockOut = (data) => api.post('/movements/stock-out', data);

// ─── Inventory ────────────────────────────────────────
export const getInventory = (params) => api.get('/inventory', { params });
export const getDashboard = () => api.get('/inventory/dashboard');

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

export default api;
