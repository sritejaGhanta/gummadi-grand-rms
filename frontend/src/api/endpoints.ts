import { apiClient } from './client';

export const authApi = {
  login: (credentials: { username: string; password: string }) =>
    apiClient.post('/auth/login', credentials),
  logout: () => apiClient.post('/auth/logout'),
  getProfile: () => apiClient.get('/auth/profile'),
};

export const floorsApi = {
  getFloors: () => apiClient.get('/floors'),
  createFloor: (data: any) => apiClient.post('/floors', data),
  updateFloor: (id: string, data: any) => apiClient.put(`/floors/${id}`, data),
  deleteFloor: (id: string) => apiClient.delete(`/floors/${id}`),
};

export const tablesApi = {
  getTables: (floorId?: string) => apiClient.get('/tables', { params: { floorId } }),
  createTable: (data: any) => apiClient.post('/tables', data),
  updateTable: (id: string, data: any) => apiClient.put(`/tables/${id}`, data),
  updateStatus: (id: string, status: string) => apiClient.put(`/tables/${id}/status`, { status }),
  deleteTable: (id: string) => apiClient.delete(`/tables/${id}`),
};

export const menuApi = {
  getCategories: () => apiClient.get('/menu/categories'),
  createCategory: (data: any) => apiClient.post('/menu/categories', data),
  updateCategory: (id: string, data: any) => apiClient.put(`/menu/categories/${id}`, data),
  deleteCategory: (id: string) => apiClient.delete(`/menu/categories/${id}`),

  getItems: (categoryId?: string, activeOnly = false) =>
    apiClient.get('/menu/items', { params: { categoryId, activeOnly } }),
  createItem: (data: any) => apiClient.post('/menu/items', data),
  updateItem: (id: string, data: any) => apiClient.put(`/menu/items/${id}`, data),
  setAvailability: (id: string, isAvailable: boolean) =>
    apiClient.put(`/menu/items/${id}/availability`, { isAvailable }),
  deleteItem: (id: string) => apiClient.delete(`/menu/items/${id}`),
};

export const ordersApi = {
  getOrders: (status?: string) => apiClient.get('/orders', { params: { status } }),
  getActiveByTable: (tableId: string) => apiClient.get(`/orders/table/${tableId}/active`),
  createOrder: (data: {
    tableId: string;
    items: Array<{ foodItemId: string; quantity: number; specialInstructions?: string }>;
    customerName?: string;
    notes?: string;
  }) => apiClient.post('/orders', data),
  markItemDelivered: (itemId: string) => apiClient.put(`/orders/items/${itemId}/deliver`),
  cancelItem: (itemId: string, reason?: string) => apiClient.put(`/orders/items/${itemId}/cancel`, { reason }),
  requestBill: (tableId: string) => apiClient.post(`/orders/tables/${tableId}/request-bill`),
};

export const kitchenApi = {
  getTasks: () => apiClient.get('/kitchen/tasks'),
  getChefs: () => apiClient.get('/kitchen/chefs'),
  acceptItem: (id: string, chefId?: string) => apiClient.put(`/kitchen/items/${id}/accept`, { chefId }),
  startPreparing: (id: string, chefId?: string) => apiClient.put(`/kitchen/items/${id}/prepare`, { chefId }),
  markReady: (id: string, chefId?: string) => apiClient.put(`/kitchen/items/${id}/ready`, { chefId }),
  assignChef: (id: string, chefId: string) => apiClient.put(`/kitchen/items/${id}/assign-chef`, { chefId }),
};

export const billingApi = {
  getBills: (status?: string) => apiClient.get('/billing', { params: { status } }),
  getBillById: (id: string) => apiClient.get(`/billing/${id}`),
  generateBill: (orderId: string, discountAmount = 0) =>
    apiClient.post('/billing/generate', { orderId, discountAmount }),
  recordPayment: (billId: string, data: { amount: number; paymentMethod: string; transactionReference?: string; notes?: string }) =>
    apiClient.post(`/billing/${billId}/payment`, data),
};

export const reportsApi = {
  getAdminDashboard: () => apiClient.get('/reports/admin-dashboard'),
  getStaffPerformance: (date?: string) => apiClient.get('/reports/staff-performance', { params: { date } }),
  getStaffDetails: (userId: string, range = '7days') =>
    apiClient.get(`/reports/staff/${userId}`, { params: { range } }),
  getManagerDashboard: () => apiClient.get('/reports/manager-dashboard'),
  getChefDashboard: () => apiClient.get('/reports/chef-dashboard'),
  getStaffDashboard: () => apiClient.get('/reports/staff-dashboard'),
};

export const rolesApi = {
  getRoles: () => apiClient.get('/roles'),
  getPermissions: () => apiClient.get('/roles/permissions'),
  createRole: (data: any) => apiClient.post('/roles', data),
  updateRole: (id: string, data: any) => apiClient.put(`/roles/${id}`, data),
  deleteRole: (id: string) => apiClient.delete(`/roles/${id}`),
};

export const usersApi = {
  getUsers: () => apiClient.get('/users'),
  createUser: (data: any) => apiClient.post('/users', data),
  updateUser: (id: string, data: any) => apiClient.put(`/users/${id}`, data),
  toggleStatus: (id: string) => apiClient.put(`/users/${id}/toggle-status`),
  deleteUser: (id: string) => apiClient.delete(`/users/${id}`),
};

export const settingsApi = {
  getPublic: () => apiClient.get('/settings/public'),
  getAll: () => apiClient.get('/settings'),
  update: (data: Record<string, string>) => apiClient.put('/settings', data),
};

export const logsApi = {
  getLogs: (limit = 100, offset = 0) => apiClient.get('/activity-logs', { params: { limit, offset } }),
};
