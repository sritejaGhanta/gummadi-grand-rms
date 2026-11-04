export {};

// ====================================================================
// EXHAUSTIVE API TEST SUITE: INDIVIDUAL CALLS (PROPER & IMPROPER DATA)
// ====================================================================

const BASE_URL = 'http://localhost:3000/api';

interface TestResult {
  suite: string;
  testCase: string;
  type: 'PROPER' | 'IMPROPER';
  endpoint: string;
  method: string;
  expectedStatus: number[];
  actualStatus: number;
  passed: boolean;
  notes?: string;
}

const results: TestResult[] = [];

async function callApi(endpoint: string, options: RequestInit = {}): Promise<{ status: number; data: any }> {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    let data;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return { status: res.status, data };
  } catch (err: any) {
    return { status: 500, data: { error: err.message } };
  }
}

function recordTest(
  suite: string,
  testCase: string,
  type: 'PROPER' | 'IMPROPER',
  endpoint: string,
  method: string,
  expectedStatus: number[],
  actualStatus: number,
  notes?: string,
) {
  const passed = expectedStatus.includes(actualStatus);
  results.push({
    suite,
    testCase,
    type,
    endpoint,
    method,
    expectedStatus,
    actualStatus,
    passed,
    notes,
  });
  const symbol = passed ? '✅ PASS' : '❌ FAIL';
  const typeBadge = type === 'PROPER' ? '[PROPER DATA]' : '[IMPROPER DATA]';
  console.log(`${symbol} ${typeBadge} [${method} ${endpoint}] - ${testCase} (Status: ${actualStatus})`);
}

async function runExhaustiveTests() {
  console.log('====================================================================');
  console.log('🚀 RUNNING COMPREHENSIVE RMS API TEST SUITE: PROPER & IMPROPER DATA');
  console.log('====================================================================\n');

  // ------------------------------------------------------------------
  // 1. AUTHENTICATION MODULE
  // ------------------------------------------------------------------
  console.log('--- 1. AUTHENTICATION MODULE ---');

  // Proper login
  const adminLogin = await callApi('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  });
  recordTest('AUTH', 'Login with valid admin credentials', 'PROPER', '/auth/login', 'POST', [200, 201], adminLogin.status);
  const adminToken = adminLogin.data?.data?.accessToken;

  const waiterLogin = await callApi('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'waiter', password: 'waiter123' }),
  });
  recordTest('AUTH', 'Login with valid waiter credentials', 'PROPER', '/auth/login', 'POST', [200, 201], waiterLogin.status);
  const waiterToken = waiterLogin.data?.data?.accessToken;

  const chefLogin = await callApi('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'chef', password: 'chef123' }),
  });
  recordTest('AUTH', 'Login with valid chef credentials', 'PROPER', '/auth/login', 'POST', [200, 201], chefLogin.status);
  const chefToken = chefLogin.data?.data?.accessToken;

  const managerLogin = await callApi('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'manager', password: 'manager123' }),
  });
  recordTest('AUTH', 'Login with valid manager credentials', 'PROPER', '/auth/login', 'POST', [200, 201], managerLogin.status);
  const managerToken = managerLogin.data?.data?.accessToken;

  // Improper login: Wrong password
  const badPass = await callApi('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: 'wrongpassword' }),
  });
  recordTest('AUTH', 'Login with wrong password (401)', 'IMPROPER', '/auth/login', 'POST', [401], badPass.status);

  // Improper login: Non-existent user
  const badUser = await callApi('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'ghost_user', password: 'password123' }),
  });
  recordTest('AUTH', 'Login with non-existent username (401)', 'IMPROPER', '/auth/login', 'POST', [401], badUser.status);

  // Improper login: Missing username/password payload
  const emptyLogin = await callApi('/auth/login', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  recordTest('AUTH', 'Login with empty payload (400 Bad Request)', 'IMPROPER', '/auth/login', 'POST', [400], emptyLogin.status);

  // Proper profile fetch
  const authProfileProper = await callApi('/auth/profile', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  recordTest('AUTH', 'Fetch profile with valid JWT (200 OK)', 'PROPER', '/auth/profile', 'GET', [200], authProfileProper.status);

  // Improper profile fetch: Tampered token
  const authProfileBadToken = await callApi('/auth/profile', {
    headers: { Authorization: 'Bearer invalid_tampered_token_xyz' },
  });
  recordTest('AUTH', 'Fetch profile with tampered token (401)', 'IMPROPER', '/auth/profile', 'GET', [401], authProfileBadToken.status);

  // Improper profile fetch: Missing token
  const authProfileNoToken = await callApi('/auth/profile');
  recordTest('AUTH', 'Fetch profile unauthenticated (401)', 'IMPROPER', '/auth/profile', 'GET', [401], authProfileNoToken.status);

  // ------------------------------------------------------------------
  // 2. SETTINGS MODULE
  // ------------------------------------------------------------------
  console.log('\n--- 2. RESTAURANT SETTINGS MODULE ---');

  // Proper public settings
  const publicSettings = await callApi('/settings/public');
  recordTest('SETTINGS', 'Fetch public restaurant settings', 'PROPER', '/settings/public', 'GET', [200], publicSettings.status);

  // Proper admin update settings
  const updateSettingsProper = await callApi('/settings', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ restaurant_tagline: 'The Ultimate Royal Dining Experience' }),
  });
  recordTest('SETTINGS', 'Admin updates restaurant settings', 'PROPER', '/settings', 'PUT', [200], updateSettingsProper.status);

  // Improper settings update: Waiter without permission
  const updateSettingsWaiter = await callApi('/settings', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${waiterToken}` },
    body: JSON.stringify({ restaurant_name: 'Hacked Palace' }),
  });
  recordTest('SETTINGS', 'Waiter attempts settings update (403 Forbidden)', 'IMPROPER', '/settings', 'PUT', [403], updateSettingsWaiter.status);

  // Improper settings update: Unauthenticated
  const updateSettingsNoAuth = await callApi('/settings', {
    method: 'PUT',
    body: JSON.stringify({ restaurant_name: 'Unauth Palace' }),
  });
  recordTest('SETTINGS', 'Unauthenticated settings update (401 Unauthorized)', 'IMPROPER', '/settings', 'PUT', [401], updateSettingsNoAuth.status);

  // ------------------------------------------------------------------
  // 3. FLOORS & TABLES MODULE
  // ------------------------------------------------------------------
  console.log('\n--- 3. FLOORS & TABLES MODULE ---');

  // Proper floors list
  const floorsProper = await callApi('/floors', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  recordTest('FLOORS', 'Fetch all floors with tables (200 OK)', 'PROPER', '/floors', 'GET', [200], floorsProper.status);
  const floors = floorsProper.data?.data || [];
  const testFloorId = floors[0]?.id;

  // Improper floor creation: Missing floor name
  const floorNoName = await callApi('/floors', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({}),
  });
  recordTest('FLOORS', 'Create floor with missing name (400 Bad Request)', 'IMPROPER', '/floors', 'POST', [400], floorNoName.status);

  // Improper floor: Non-existent floor ID
  const floorNotFound = await callApi('/floors/00000000-0000-0000-0000-000000000000', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  recordTest('FLOORS', 'Fetch non-existent floor ID (404 Not Found)', 'IMPROPER', '/floors/:id', 'GET', [404], floorNotFound.status);

  // Improper table creation: Invalid Floor UUID
  const tableBadFloor = await callApi('/tables', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      tableNumber: 'T-999',
      floorId: '00000000-0000-0000-0000-000000000000',
      seatingCapacity: 4,
    }),
  });
  recordTest('TABLES', 'Create table with non-existent floorId (404 Not Found)', 'IMPROPER', '/tables', 'POST', [404], tableBadFloor.status);

  // Improper table creation: Negative seating capacity
  const tableNegCapacity = await callApi('/tables', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      tableNumber: 'T-NEG',
      floorId: testFloorId,
      seatingCapacity: -5,
    }),
  });
  recordTest('TABLES', 'Create table with negative seating capacity (400 Bad Request)', 'IMPROPER', '/tables', 'POST', [400], tableNegCapacity.status);

  // Improper table creation: Missing required fields
  const tableEmptyBody = await callApi('/tables', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({}),
  });
  recordTest('TABLES', 'Create table with empty body (400 Bad Request)', 'IMPROPER', '/tables', 'POST', [400], tableEmptyBody.status);

  // Proper tables list
  const tablesProper = await callApi('/tables', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  recordTest('TABLES', 'Fetch all tables with occupancy statuses (200 OK)', 'PROPER', '/tables', 'GET', [200], tablesProper.status);
  const tables = tablesProper.data?.data || [];
  const testTable = tables.find((t: any) => t.status === 'AVAILABLE') || tables[0];

  // ------------------------------------------------------------------
  // 4. MENU & FOOD AVAILABILITY MODULE
  // ------------------------------------------------------------------
  console.log('\n--- 4. MENU & FOOD AVAILABILITY MODULE ---');

  const menuCategories = await callApi('/menu/categories', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  recordTest('MENU', 'Fetch all menu categories (200 OK)', 'PROPER', '/menu/categories', 'GET', [200], menuCategories.status);

  const menuItemsProper = await callApi('/menu/items', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  recordTest('MENU', 'Fetch all food items (200 OK)', 'PROPER', '/menu/items', 'GET', [200], menuItemsProper.status);
  const foodItems = menuItemsProper.data?.data || [];
  const testItem = foodItems[0];
  const soldOutCandidate = foodItems[1];

  // Improper menu creation: Negative price
  const menuNegPrice = await callApi('/menu/items', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      name: 'Free Food Dish',
      price: -100,
      categoryId: testItem?.categoryId,
    }),
  });
  recordTest('MENU', 'Create food item with negative price (400 Bad Request)', 'IMPROPER', '/menu/items', 'POST', [400], menuNegPrice.status);

  // Improper menu creation: Non-existent category ID
  const menuBadCategory = await callApi('/menu/items', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      name: 'Mystery Dish',
      price: 250,
      categoryId: '00000000-0000-0000-0000-000000000000',
    }),
  });
  recordTest('MENU', 'Create food item with non-existent categoryId (404 Not Found)', 'IMPROPER', '/menu/items', 'POST', [404], menuBadCategory.status);

  // Proper: Chef sets item SOLD OUT (isAvailable: false)
  const setSoldOut = await callApi(`/menu/items/${soldOutCandidate.id}/availability`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${chefToken}` },
    body: JSON.stringify({ isAvailable: false }),
  });
  recordTest('MENU', 'Chef marks item as SOLD OUT (200 OK)', 'PROPER', `/menu/items/:id/availability`, 'PUT', [200], setSoldOut.status);

  // Improper: Waiter attempts to toggle availability (403 Forbidden)
  const waiterToggleAvail = await callApi(`/menu/items/${soldOutCandidate.id}/availability`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${waiterToken}` },
    body: JSON.stringify({ isAvailable: true }),
  });
  recordTest('MENU', 'Waiter attempts to toggle item availability (403 Forbidden)', 'IMPROPER', `/menu/items/:id/availability`, 'PUT', [403], waiterToggleAvail.status);

  // ------------------------------------------------------------------
  // 5. ORDERS & BUSINESS RULES ENFORCEMENT
  // ------------------------------------------------------------------
  console.log('\n--- 5. ORDERS WORKFLOW & BUSINESS RULES ---');

  // Improper: Staff orders a SOLD-OUT item
  const orderSoldOutItem = await callApi('/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${waiterToken}` },
    body: JSON.stringify({
      tableId: testTable.id,
      items: [{ foodItemId: soldOutCandidate.id, quantity: 1 }],
    }),
  });
  recordTest('ORDERS', 'Staff orders SOLD-OUT item (Expected 400 Bad Request)', 'IMPROPER', '/orders', 'POST', [400], orderSoldOutItem.status);

  // Improper: Order with empty items list
  const orderEmptyItems = await callApi('/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${waiterToken}` },
    body: JSON.stringify({
      tableId: testTable.id,
      items: [],
    }),
  });
  recordTest('ORDERS', 'Create order with empty items list (400 Bad Request)', 'IMPROPER', '/orders', 'POST', [400], orderEmptyItems.status);

  // Improper: Order with non-existent food item
  const orderBadItem = await callApi('/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${waiterToken}` },
    body: JSON.stringify({
      tableId: testTable.id,
      items: [{ foodItemId: '00000000-0000-0000-0000-000000000000', quantity: 2 }],
    }),
  });
  recordTest('ORDERS', 'Create order with non-existent foodItemId (400/404)', 'IMPROPER', '/orders', 'POST', [400, 404], orderBadItem.status);

  // Proper: Waiter places valid dine-in order
  const orderProper = await callApi('/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${waiterToken}` },
    body: JSON.stringify({
      tableId: testTable.id,
      notes: 'Customer requested low sodium',
      items: [{ foodItemId: testItem.id, quantity: 2, specialInstructions: 'Crispy' }],
    }),
  });
  recordTest('ORDERS', 'Waiter creates valid dine-in order (201 Created)', 'PROPER', '/orders', 'POST', [200, 201], orderProper.status);
  const createdOrder = orderProper.data?.data;
  const orderItemId = createdOrder?.items?.[0]?.id;

  // Restore availability of sold-out item
  await callApi(`/menu/items/${soldOutCandidate.id}/availability`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${chefToken}` },
    body: JSON.stringify({ isAvailable: true }),
  });

  // ------------------------------------------------------------------
  // 6. KITCHEN DISPLAY SYSTEM (KDS) LIFECYCLE
  // ------------------------------------------------------------------
  console.log('\n--- 6. KITCHEN DISPLAY SYSTEM (KDS) LIFECYCLE ---');

  // Proper: Chef views kitchen tasks queue
  const kitchenTasks = await callApi('/kitchen/tasks', {
    headers: { Authorization: `Bearer ${chefToken}` },
  });
  recordTest('KITCHEN', 'Chef retrieves live kitchen queue (200 OK)', 'PROPER', '/kitchen/tasks', 'GET', [200], kitchenTasks.status);

  // Proper item status lifecycle: ACCEPT -> PREPARE -> READY -> DELIVER
  if (orderItemId) {
    const kdsAccept = await callApi(`/kitchen/items/${orderItemId}/accept`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${chefToken}` },
    });
    recordTest('KITCHEN', 'Chef accepts order item (200 OK)', 'PROPER', `/kitchen/items/:id/accept`, 'PUT', [200], kdsAccept.status);

    const kdsPrepare = await callApi(`/kitchen/items/${orderItemId}/prepare`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${chefToken}` },
    });
    recordTest('KITCHEN', 'Chef starts preparing order item (200 OK)', 'PROPER', `/kitchen/items/:id/prepare`, 'PUT', [200], kdsPrepare.status);

    const kdsReady = await callApi(`/kitchen/items/${orderItemId}/ready`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${chefToken}` },
    });
    recordTest('KITCHEN', 'Chef marks item ready to serve (200 OK)', 'PROPER', `/kitchen/items/:id/ready`, 'PUT', [200], kdsReady.status);

    // Waiter delivers item to table
    const waiterDeliver = await callApi(`/orders/items/${orderItemId}/deliver`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${waiterToken}` },
    });
    recordTest('KITCHEN', 'Waiter delivers ready dish to customer table (200 OK)', 'PROPER', `/orders/items/:id/deliver`, 'PUT', [200], waiterDeliver.status);
  }

  // Improper KDS update: Non-existent item ID
  const kdsBadItemId = await callApi(`/kitchen/items/00000000-0000-0000-0000-000000000000/accept`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${chefToken}` },
  });
  recordTest('KITCHEN', 'Chef accepts non-existent item ID (404 Not Found)', 'IMPROPER', `/kitchen/items/:id/accept`, 'PUT', [404], kdsBadItemId.status);

  // Improper KDS access: Waiter attempts to accept kitchen item
  const waiterAcceptKds = await callApi(`/kitchen/items/${orderItemId}/accept`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${waiterToken}` },
  });
  recordTest('KITCHEN', 'Waiter attempts kitchen accept without permission (403 Forbidden)', 'IMPROPER', `/kitchen/items/:id/accept`, 'PUT', [403], waiterAcceptKds.status);

  // ------------------------------------------------------------------
  // 7. BILLING & PAYMENTS MODULE
  // ------------------------------------------------------------------
  console.log('\n--- 7. BILLING & INVOICING MODULE ---');

  // Improper billing: Non-existent orderId
  const billBadOrder = await callApi('/billing/generate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${managerToken}` },
    body: JSON.stringify({ orderId: '00000000-0000-0000-0000-000000000000' }),
  });
  recordTest('BILLING', 'Generate bill for non-existent orderId (404 Not Found)', 'IMPROPER', '/billing/generate', 'POST', [404], billBadOrder.status);

  // Proper billing: Manager generates bill
  const billProper = await callApi('/billing/generate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${managerToken}` },
    body: JSON.stringify({
      orderId: createdOrder.id,
      discountAmount: 15,
    }),
  });
  recordTest('BILLING', 'Manager generates bill with tax and discount (200/201)', 'PROPER', '/billing/generate', 'POST', [200, 201], billProper.status);
  const createdBill = billProper.data?.data;

  // Duplicate bill generation: Returns existing bill without creating duplicate
  const billDuplicate = await callApi('/billing/generate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${managerToken}` },
    body: JSON.stringify({ orderId: createdOrder.id }),
  });
  const isSameBill = billDuplicate.data?.data?.id === createdBill?.id;
  recordTest('BILLING', 'Duplicate bill generation idempotency (returns existing bill)', 'PROPER', '/billing/generate', 'POST', [200, 201], isSameBill ? 200 : 500);

  // Improper payment: Invalid payment method
  const payBadMethod = await callApi(`/billing/${createdBill.id}/payment`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${managerToken}` },
    body: JSON.stringify({
      amount: createdBill.grandTotal,
      paymentMethod: 'DOGECOIN_CRYPTO',
    }),
  });
  recordTest('BILLING', 'Process payment with invalid payment method (400 Bad Request)', 'IMPROPER', `/billing/:id/payment`, 'POST', [400], payBadMethod.status);

  // Improper payment: Negative amount
  const payNegAmount = await callApi(`/billing/${createdBill.id}/payment`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${managerToken}` },
    body: JSON.stringify({
      amount: -100,
      paymentMethod: 'CASH',
    }),
  });
  recordTest('BILLING', 'Process payment with negative amount (400 Bad Request)', 'IMPROPER', `/billing/:id/payment`, 'POST', [400], payNegAmount.status);

  // Proper payment: Full settlement via UPI
  const payProper = await callApi(`/billing/${createdBill.id}/payment`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${managerToken}` },
    body: JSON.stringify({
      amount: createdBill.grandTotal,
      paymentMethod: 'UPI',
      transactionReference: 'UPI-REF-99887766',
    }),
  });
  recordTest('BILLING', 'Settle bill via UPI payment and auto-free table (200/201)', 'PROPER', `/billing/:id/payment`, 'POST', [200, 201], payProper.status);

  // Improper payment: Attempt payment on already PAID bill
  const payDuplicate = await callApi(`/billing/${createdBill.id}/payment`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${managerToken}` },
    body: JSON.stringify({
      amount: 100,
      paymentMethod: 'CASH',
    }),
  });
  recordTest('BILLING', 'Pay an already closed bill (Duplicate Payment Protection 400)', 'IMPROPER', `/billing/:id/payment`, 'POST', [400], payDuplicate.status);

  // ------------------------------------------------------------------
  // 8. REPORTS & AUDIT LOGS MODULE
  // ------------------------------------------------------------------
  console.log('\n--- 8. REPORTS & AUDIT LOGS MODULE ---');

  // Proper: Admin dashboard metrics
  const adminDash = await callApi('/reports/admin-dashboard', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  recordTest('REPORTS', 'Admin retrieves comprehensive dashboard metrics (200 OK)', 'PROPER', '/reports/admin-dashboard', 'GET', [200], adminDash.status);

  // Proper: Manager dashboard metrics
  const managerDash = await callApi('/reports/manager-dashboard', {
    headers: { Authorization: `Bearer ${managerToken}` },
  });
  recordTest('REPORTS', 'Manager retrieves operations dashboard metrics (200 OK)', 'PROPER', '/reports/manager-dashboard', 'GET', [200], managerDash.status);

  // Improper: Waiter access admin reports
  const waiterDash = await callApi('/reports/admin-dashboard', {
    headers: { Authorization: `Bearer ${waiterToken}` },
  });
  recordTest('REPORTS', 'Waiter attempts admin dashboard metrics (403 Forbidden)', 'IMPROPER', '/reports/admin-dashboard', 'GET', [403], waiterDash.status);

  // Proper: Activity logs (Admin)
  const logsProper = await callApi('/activity-logs', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  recordTest('LOGS', 'Admin retrieves system security audit logs (200 OK)', 'PROPER', '/activity-logs', 'GET', [200], logsProper.status);

  // Improper: Waiter access activity logs
  const logsWaiter = await callApi('/activity-logs', {
    headers: { Authorization: `Bearer ${waiterToken}` },
  });
  recordTest('LOGS', 'Waiter attempts access to security audit logs (403 Forbidden)', 'IMPROPER', '/activity-logs', 'GET', [403], logsWaiter.status);

  // ------------------------------------------------------------------
  // SUMMARY REPORT
  // ------------------------------------------------------------------
  console.log('\n====================================================================');
  console.log('📊 FINAL COMPREHENSIVE TEST RESULTS SUMMARY');
  console.log('====================================================================');
  const totalTests = results.length;
  const passedTests = results.filter((r) => r.passed).length;
  const failedTests = results.filter((r) => !r.passed).length;

  console.log(`Total Scenarios Tested : ${totalTests}`);
  console.log(`Passed Scenarios       : ${passedTests} (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log(`Failed Scenarios       : ${failedTests}`);

  const properPassed = results.filter((r) => r.type === 'PROPER' && r.passed).length;
  const properTotal = results.filter((r) => r.type === 'PROPER').length;
  const improperPassed = results.filter((r) => r.type === 'IMPROPER' && r.passed).length;
  const improperTotal = results.filter((r) => r.type === 'IMPROPER').length;

  console.log(`Proper Data Tests      : ${properPassed} / ${properTotal} passed`);
  console.log(`Improper Data Tests    : ${improperPassed} / ${improperTotal} passed`);
  console.log('====================================================================');

  if (failedTests > 0) {
    console.error('⚠️ SOME TESTS FAILED. REVIEW LIST ABOVE.');
    process.exit(1);
  } else {
    console.log('🎉 100% OF INDIVIDUAL API CALLS (PROPER & IMPROPER DATA) PASSED!');
  }
}

runExhaustiveTests();
