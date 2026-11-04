export {};

const BASE_URL = 'http://localhost:3000/api';

async function testAllApis() {
  console.log('🚀 ==========================================');
  console.log('🧪 Comprehensive API Testing: Valid & Invalid Data');
  console.log('🚀 ==========================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`❌ [FAIL] ${name}: ${err.message}`);
      failed++;
    }
  }

  async function req(endpoint: string, options: any = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const headers: any = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const res = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const status = res.status;
    let data = null;
    try {
      data = await res.json();
    } catch (e) {}
    return { status, data };
  }

  let adminToken = '';
  let waiterToken = '';
  let chefToken = '';
  let managerToken = '';

  // 1. AUTH TESTS
  console.log('--- 1. Authentication APIs ---');
  await test('Valid Admin Login', async () => {
    const { status, data } = await req('/auth/login', {
      method: 'POST',
      body: { username: 'admin', password: 'admin123' },
    });
    if (status !== 201 && status !== 200) throw new Error(`Status ${status}`);
    if (!data.success || !data.data.accessToken) throw new Error('No access token');
    adminToken = data.data.accessToken;
  });

  await test('Improper Login (Wrong Password) -> Should return 401', async () => {
    const { status } = await req('/auth/login', {
      method: 'POST',
      body: { username: 'admin', password: 'wrongpassword' },
    });
    if (status !== 401) throw new Error(`Expected 401, got ${status}`);
  });

  await test('Improper Login (Non-existent user) -> Should return 401', async () => {
    const { status } = await req('/auth/login', {
      method: 'POST',
      body: { username: 'ghost_user_999', password: 'pwd' },
    });
    if (status !== 401) throw new Error(`Expected 401, got ${status}`);
  });

  await test('Valid Waiter Login', async () => {
    const { status, data } = await req('/auth/login', {
      method: 'POST',
      body: { username: 'waiter', password: 'waiter123' },
    });
    if (status !== 201 && status !== 200) throw new Error(`Status ${status}`);
    waiterToken = data.data.accessToken;
  });

  await test('Valid Chef Login', async () => {
    const { status, data } = await req('/auth/login', {
      method: 'POST',
      body: { username: 'chef', password: 'chef123' },
    });
    if (status !== 201 && status !== 200) throw new Error(`Status ${status}`);
    chefToken = data.data.accessToken;
  });

  await test('Valid Manager Login', async () => {
    const { status, data } = await req('/auth/login', {
      method: 'POST',
      body: { username: 'manager', password: 'manager123' },
    });
    if (status !== 201 && status !== 200) throw new Error(`Status ${status}`);
    managerToken = data.data.accessToken;
  });

  await test('Get Auth Profile with Valid Bearer Token', async () => {
    const { status, data } = await req('/auth/profile', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (status !== 200) throw new Error(`Status ${status}`);
    if (data.data.username !== 'admin') throw new Error('Username mismatch');
  });

  await test('Get Auth Profile with Missing Token -> Should return 401', async () => {
    const { status } = await req('/auth/profile');
    if (status !== 401) throw new Error(`Expected 401, got ${status}`);
  });

  // 2. SETTINGS APIS
  console.log('\n--- 2. Settings APIs ---');
  await test('Get Public Settings without auth', async () => {
    const { status, data } = await req('/settings/public');
    if (status !== 200) throw new Error(`Status ${status}`);
    if (!data.data.restaurant_name) throw new Error('Missing restaurant_name');
  });

  await test('Update Settings with Admin Token', async () => {
    const { status, data } = await req('/settings', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { restaurant_tagline: 'The Ultimate Royal Dining Experience' },
    });
    if (status !== 200) throw new Error(`Status ${status}`);
    if (!data.success) throw new Error('Failed to update settings');
  });

  await test('Update Settings with Waiter Token -> Should return 403 Forbidden', async () => {
    const { status } = await req('/settings', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${waiterToken}` },
      body: { restaurant_name: 'Hacked Restaurant' },
    });
    if (status !== 403) throw new Error(`Expected 403 Forbidden, got ${status}`);
  });

  // 3. FLOORS & TABLES APIS
  console.log('\n--- 3. Floors & Tables APIs ---');
  let firstFloorId = '';
  let testTableId = '';

  await test('Get All Floors', async () => {
    const { status, data } = await req('/floors', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (status !== 200) throw new Error(`Status ${status}`);
    if (data.data.length === 0) throw new Error('No floors returned');
    firstFloorId = data.data[0].id;
  });

  await test('Get Tables for Floor', async () => {
    const { status, data } = await req(`/tables?floorId=${firstFloorId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (status !== 200) throw new Error(`Status ${status}`);
    if (data.data.length === 0) throw new Error('No tables returned');
    testTableId = data.data[0].id;
  });

  await test('Get Non-Existent Table ID -> Should return 404', async () => {
    const { status } = await req('/tables/00000000-0000-0000-0000-000000000000', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (status !== 404) throw new Error(`Expected 404, got ${status}`);
  });

  // 4. MENU APIS & SOLD-OUT BUSINESS RULES
  console.log('\n--- 4. Menu & Availability APIs ---');
  let testFoodItemId = '';
  let soldOutItemId = '';

  await test('Get Menu Categories', async () => {
    const { status, data } = await req('/menu/categories', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (status !== 200) throw new Error(`Status ${status}`);
    if (data.data.length === 0) throw new Error('No categories');
  });

  await test('Get Menu Items', async () => {
    const { status, data } = await req('/menu/items', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (status !== 200) throw new Error(`Status ${status}`);
    if (data.data.length < 2) throw new Error('Expected items');
    testFoodItemId = data.data[0].id;
    soldOutItemId = data.data[1].id;
  });

  await test('Chef Marks Item as Sold Out (Daily Availability)', async () => {
    const { status, data } = await req(`/menu/items/${soldOutItemId}/availability`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${chefToken}` },
      body: { isAvailable: false },
    });
    if (status !== 200) throw new Error(`Status ${status}`);
    if (data.data.isAvailable !== false) throw new Error('Failed to set sold out');
  });

  // 5. ORDERS & BUSINESS RULE VALIDATION
  console.log('\n--- 5. Orders Workflow & Business Rules ---');
  await test('Staff Tries to Order Sold-Out Item -> Should return 400 Bad Request', async () => {
    const { status, data } = await req('/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${waiterToken}` },
      body: {
        tableId: testTableId,
        items: [{ foodItemId: soldOutItemId, quantity: 1 }],
      },
    });
    if (status !== 400) throw new Error(`Expected 400, got ${status}`);
    console.log('   Expected rejection message:', data.error);
  });

  await test('Improper Order with Empty Items -> Should return 400 Bad Request', async () => {
    const { status } = await req('/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${waiterToken}` },
      body: { tableId: testTableId, items: [] },
    });
    if (status !== 400) throw new Error(`Expected 400, got ${status}`);
  });

  let createdOrderId = '';
  let orderItemId = '';

  await test('Staff Submits Valid Dine-In Order', async () => {
    const { status, data } = await req('/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${waiterToken}` },
      body: {
        tableId: testTableId,
        items: [
          {
            foodItemId: testFoodItemId,
            quantity: 2,
            specialInstructions: 'Make it extra crisp',
          },
        ],
        customerName: 'VIP Guest Mr. Sharma',
      },
    });
    if (status !== 201 && status !== 200) throw new Error(`Status ${status}`);
    createdOrderId = data.data.id;
    orderItemId = data.data.items[0].id;
  });

  // 6. KITCHEN KDS LIFECYCLE
  console.log('\n--- 6. Kitchen Display System (KDS) Lifecycle ---');
  await test('Chef Views Kitchen Tasks Queue', async () => {
    const { status, data } = await req('/kitchen/tasks', {
      headers: { Authorization: `Bearer ${chefToken}` },
    });
    if (status !== 200) throw new Error(`Status ${status}`);
    const found = data.data.find((t: any) => t.id === orderItemId);
    if (!found) {
      console.log('   Debug: orderItemId=', orderItemId, 'tasks=', data.data.map((t: any) => t.id));
      throw new Error('Order item not found in kitchen queue');
    }
  });

  await test('Chef Accepts Item Ticket', async () => {
    const { status, data } = await req(`/kitchen/items/${orderItemId}/accept`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${chefToken}` },
    });
    if (status !== 200) throw new Error(`Status ${status}`);
    if (data.data.status !== 'ACCEPTED') throw new Error('Status not ACCEPTED');
  });

  await test('Chef Starts Preparing Dish', async () => {
    const { status, data } = await req(`/kitchen/items/${orderItemId}/prepare`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${chefToken}` },
    });
    if (status !== 200) throw new Error(`Status ${status}`);
    if (data.data.status !== 'PREPARING') throw new Error('Status not PREPARING');
  });

  await test('Chef Marks Dish Ready to Serve', async () => {
    const { status, data } = await req(`/kitchen/items/${orderItemId}/ready`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${chefToken}` },
    });
    if (status !== 200) throw new Error(`Status ${status}`);
    if (data.data.status !== 'READY') throw new Error('Status not READY');
  });

  await test('Waiter Marks Dish Delivered to Table', async () => {
    const { status, data } = await req(`/orders/items/${orderItemId}/deliver`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${waiterToken}` },
    });
    if (status !== 200) throw new Error(`Status ${status}`);
    if (data.data.status !== 'DELIVERED') throw new Error('Status not DELIVERED');
  });

  // 7. BILLING & SETTLEMENT
  console.log('\n--- 7. Billing & Payment Settlement ---');
  let createdBillId = '';

  await test('Staff Requests Bill for Table', async () => {
    const { status, data } = await req(`/orders/tables/${testTableId}/request-bill`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${waiterToken}` },
    });
    if (status !== 201 && status !== 200) throw new Error(`Status ${status}`);
    if (!data.success) throw new Error('Failed to request bill');
  });

  await test('Manager Generates Bill with GST and Discount', async () => {
    const { status, data } = await req('/billing/generate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${managerToken}` },
      body: { orderId: createdOrderId, discountAmount: 20 },
    });
    if (status !== 201 && status !== 200) throw new Error(`Status ${status}`);
    if (!data.data.billNumber) throw new Error('No bill number generated');
    createdBillId = data.data.id;
  });

  await test('Duplicate Bill Generation on Same Order -> Returns existing bill without duplicating', async () => {
    const { status, data } = await req('/billing/generate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${managerToken}` },
      body: { orderId: createdOrderId },
    });
    if (status !== 201 && status !== 200) throw new Error(`Status ${status}`);
    if (data.data.id !== createdBillId) throw new Error('Duplicate bill created!');
  });

  await test('Manager Records Full Payment (UPI Settlement)', async () => {
    const billRes = await req(`/billing/${createdBillId}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    const amount = Number(billRes.data.data.grandTotal);

    const payRes = await req(`/billing/${createdBillId}/payment`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${managerToken}` },
      body: {
        amount,
        paymentMethod: 'UPI',
        transactionReference: 'UPI-REF-20261031-XYZ',
      },
    });

    if (payRes.status !== 201 && payRes.status !== 200) throw new Error(`Status ${payRes.status}`);
    if (payRes.data.data.status !== 'PAID') throw new Error('Bill not marked PAID');
  });

  await test('Duplicate Payment on already PAID bill -> Should return 400 Bad Request', async () => {
    const { status, data } = await req(`/billing/${createdBillId}/payment`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${managerToken}` },
      body: { amount: 100, paymentMethod: 'CASH' },
    });
    if (status !== 400) throw new Error(`Expected 400, got ${status}`);
    console.log('   Expected rejection message:', data.error);
  });

  // 8. REPORTS & DASHBOARDS
  console.log('\n--- 8. Real-Time Reports & Dashboards ---');
  await test('Admin Dashboard Metrics', async () => {
    const { status, data } = await req('/reports/admin-dashboard', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (status !== 200) throw new Error(`Status ${status}`);
    if (data.data.todayRevenue === undefined) throw new Error('Missing revenue');
  });

  await test('Manager Dashboard Metrics', async () => {
    const { status, data } = await req('/reports/manager-dashboard', {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    if (status !== 200) throw new Error(`Status ${status}`);
    if (data.data.staffPerformance === undefined) throw new Error('Missing staff performance');
  });

  // 9. AUDIT LOGS
  console.log('\n--- 9. System Audit Logs ---');
  await test('Admin Retrieves Audit Logs', async () => {
    const { status, data } = await req('/activity-logs', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (status !== 200) throw new Error(`Status ${status}`);
    if (data.data.items.length === 0) throw new Error('No audit logs found');
  });

  console.log('\n==========================================');
  console.log(`📊 Test Summary: Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log('==========================================');

  if (failed > 0) process.exit(1);
}

testAllApis().catch((err) => {
  console.error('Fatal testing error:', err);
  process.exit(1);
});
