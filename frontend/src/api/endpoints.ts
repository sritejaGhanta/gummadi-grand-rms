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
  getActiveByTable: (tableId: string, subOrder?: string) =>
    apiClient.get(`/orders/table/${tableId}/active`, { params: { subOrder } }),
  getAllActiveByTable: (tableId: string) => apiClient.get(`/orders/table/${tableId}/active-all`),
  createOrder: (data: {
    tableId: string;
    items: Array<{ foodItemId: string; quantity: number; specialInstructions?: string }>;
    customerName?: string;
    notes?: string;
    subOrder?: string;
  }) => apiClient.post('/orders', data),
  markItemDelivered: (itemId: string) => apiClient.put(`/orders/items/${itemId}/deliver`),
  cancelItem: (itemId: string, reason?: string) => apiClient.put(`/orders/items/${itemId}/cancel`, { reason }),
  requestBill: (tableId: string, data?: { orderId?: string; subOrder?: string }) =>
    apiClient.post(`/orders/tables/${tableId}/request-bill`, data || {}),
  transferTable: (orderId: string, newTableId: string) =>
    apiClient.post(`/orders/${orderId}/transfer-table`, { newTableId }),
  mergeTable: (orderId: string, sourceTableId: string) =>
    apiClient.post(`/orders/${orderId}/merge-table`, { sourceTableId }),
};

export const kitchenApi = {
  getTasks: () => apiClient.get('/kitchen/tasks'),
  getHistory: (params?: { range?: string; chefId?: string; dietary?: string; search?: string }) =>
    apiClient.get('/kitchen/history', { params }),
  getChefs: () => apiClient.get('/kitchen/chefs'),
  acceptItem: (id: string, chefId?: string) => apiClient.put(`/kitchen/items/${id}/accept`, { chefId }),
  startPreparing: (id: string, chefId?: string) => apiClient.put(`/kitchen/items/${id}/prepare`, { chefId }),
  markReady: (id: string, chefId?: string) => apiClient.put(`/kitchen/items/${id}/ready`, { chefId }),
  assignChef: (id: string, chefId: string) => apiClient.put(`/kitchen/items/${id}/assign-chef`, { chefId }),
};

export const billingApi = {
  getBills: (status?: string) => apiClient.get('/billing', { params: { status } }),
  getBillById: (id: string) => apiClient.get(`/billing/${id}`),
  generateBill: (data: {
    orderId: string;
    discountAmount?: number;
    customerName?: string;
    customerPhone?: string;
    redeemPoints?: number;
  }) => apiClient.post('/billing/generate', data),
  recordPayment: (billId: string, data: { amount: number; paymentMethod: string; transactionReference?: string; notes?: string }) =>
    apiClient.post(`/billing/${billId}/payment`, data),
  getWhatsAppBill: (billId: string) => apiClient.get(`/billing/${billId}/whatsapp`),
  lookupCustomer: (phone: string) => apiClient.get('/billing/customers/lookup', { params: { phone } }),
  getTopCustomers: () => apiClient.get('/billing/customers/top'),
  getDaySummary: (date?: string) => apiClient.get('/billing/day-summary', { params: { date } }),
  recordDayClose: (data: { date?: string; actualCashCounted: number; notes?: string }) =>
    apiClient.post('/billing/day-close', data),
  getDayCloseHistory: () => apiClient.get('/billing/day-close/history'),
};

export const inventoryApi = {
  getItems: (category?: string) => apiClient.get('/inventory', { params: { category } }),
  getAlerts: () => apiClient.get('/inventory/alerts'),
  getItem: (id: string) => apiClient.get(`/inventory/${id}`),
  createItem: (data: any) => apiClient.post('/inventory', data),
  updateItem: (id: string, data: any) => apiClient.patch(`/inventory/${id}`, data),
  adjustStock: (id: string, data: { quantity: number; changeType: string; reason?: string }) =>
    apiClient.post(`/inventory/${id}/adjust`, data),
  getLogs: (inventoryItemId?: string) => apiClient.get('/inventory/logs', { params: { inventoryItemId } }),
  getRecipe: (foodItemId: string) => apiClient.get(`/inventory/recipes/${foodItemId}`),
  saveRecipe: (foodItemId: string, ingredients: Array<{ inventoryItemId: string; quantityRequired: number; unit?: string }>) =>
    apiClient.post(`/inventory/recipes/${foodItemId}`, { ingredients }),
};

export const reportsApi = {
  getAdminDashboard: () => apiClient.get('/reports/admin-dashboard'),
  getStaffPerformance: (range?: string, date?: string) =>
    apiClient.get('/reports/staff-performance', { params: { range, date } }),
  getStaffDetails: (userId: string, range = '7days') =>
    apiClient.get(`/reports/staff/${userId}`, { params: { range } }),
  getManagerDashboard: () => apiClient.get('/reports/manager-dashboard'),
  getChefDashboard: (range = 'today', chefId?: string) =>
    apiClient.get('/reports/chef-dashboard', { params: { range, chefId } }),
  getStaffDashboard: (range = 'today', staffId?: string) =>
    apiClient.get('/reports/staff-dashboard', { params: { range, staffId } }),
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

export const superAdminApi = {
  getMetrics: () => apiClient.get('/super-admin/metrics'),
  getRestaurants: () => apiClient.get('/super-admin/restaurants'),
  createRestaurant: (data: any) => apiClient.post('/super-admin/restaurants', data),
  updateStatus: (id: string, status: string) => apiClient.patch(`/super-admin/restaurants/${id}/status`, { status }),
  getPlans: () => apiClient.get('/super-admin/plans'),
  recordSubscription: (data: any) => apiClient.post('/super-admin/subscriptions/record', data),
  getStaff: (restaurantId: string) => apiClient.get(`/super-admin/restaurants/${restaurantId}/staff`),
  addStaff: (restaurantId: string, data: any) => apiClient.post(`/super-admin/restaurants/${restaurantId}/staff`, data),
  // Landing CMS & Leads
  getLandingCms: () => apiClient.get('/super-admin/landing-cms'),
  updateLandingCms: (data: any) => apiClient.patch('/super-admin/landing-cms', data),
  getLeads: () => apiClient.get('/super-admin/leads'),
  updateLeadStatus: (id: string, data: { status: string; notes?: string }) => apiClient.patch(`/super-admin/leads/${id}/status`, data),
  convertLead: (id: string) => apiClient.post(`/super-admin/leads/${id}/convert`),
  submitDemoInquiry: (data: any) => apiClient.post('/super-admin/demo-inquiry', data),
};
