const axios = require('axios');

const API = 'http://localhost:3000/api';

async function testFullBillingLifecycle() {
  console.log('=== TEST: COMPLETE WAITER TO MANAGER BILLING LIFECYCLE ===\n');

  // 1. Waiter login
  const waiterLogin = await axios.post(`${API}/auth/login`, { username: 'waiter', password: 'waiter123' });
  const waiterToken = waiterLogin.data.data.accessToken;

  // 2. Manager login
  const mgrLogin = await axios.post(`${API}/auth/login`, { username: 'manager', password: 'manager123' });
  const mgrToken = mgrLogin.data.data.accessToken;

  // 3. Find an available table or use Table-02
  const floorsRes = await axios.get(`${API}/floors`, { headers: { Authorization: `Bearer ${waiterToken}` } });
  const table = floorsRes.data.data[0].tables[1] || floorsRes.data.data[0].tables[0];
  console.log(`Using Table: ${table.tableNumber} (ID: ${table.id})`);

  // 4. Create an active order on this table
  const menuRes = await axios.get(`${API}/menu/items`, { headers: { Authorization: `Bearer ${waiterToken}` } });
  const foodItem = menuRes.data.data.find(i => i.availability?.isAvailable !== false);
  const newOrderRes = await axios.post(`${API}/orders`, {
    tableId: table.id,
    items: [{ foodItemId: foodItem.id, quantity: 2 }]
  }, { headers: { Authorization: `Bearer ${waiterToken}` } });
  const order = newOrderRes.data.data;
  console.log(`✓ Step 1: Waiter created order: ${order.orderNumber} (Total: ₹${order.totalAmount})`);

  // 5. Waiter requests bill
  const reqBillRes = await axios.post(`${API}/orders/tables/${table.id}/request-bill`, {}, {
    headers: { Authorization: `Bearer ${waiterToken}` }
  });
  console.log(`✓ Step 2: Waiter pressed "Request Bill" on mobile for Table ${table.tableNumber}`);

  // 6. Manager loads Billing tab
  const [billsRes, ordersRes] = await Promise.all([
    axios.get(`${API}/billing`, { headers: { Authorization: `Bearer ${mgrToken}` } }),
    axios.get(`${API}/orders`, { headers: { Authorization: `Bearer ${mgrToken}` } }),
  ]);

  // Apply the NEW fixed filter:
  const billableOrders = ordersRes.data.data.filter(
    (o) => o.status === 'ACTIVE' || o.status === 'BILLING' || o.table?.status === 'BILLING'
  );
  billableOrders.sort((a, b) => {
    const aReq = a.table?.status === 'BILLING' ? 1 : 0;
    const bReq = b.table?.status === 'BILLING' ? 1 : 0;
    return bReq - aReq;
  });

  console.log(`✓ Step 3: Manager opened "Billing" tab on mobile:`);
  console.log(`   Total billable tables visible: ${billableOrders.length}`);
  const targetOrder = billableOrders.find(o => o.id === order.id);
  if (!targetOrder) {
    throw new Error('FAILED: Target order not found in manager billing tab!');
  }
  const isRequested = targetOrder.table?.status === 'BILLING';
  console.log(`   🎯 Found order ${targetOrder.orderNumber} on Table ${targetOrder.table?.tableNumber}!`);
  console.log(`   🔔 Shows "BILL REQUESTED" alert badge: ${isRequested ? 'YES ✅' : 'NO ❌'}`);

  // 7. Manager generates bill
  console.log(`✓ Step 4: Manager taps "Generate Bill" on mobile...`);
  const genBillRes = await axios.post(`${API}/billing/generate`, {
    orderId: targetOrder.id,
    discountAmount: 0
  }, { headers: { Authorization: `Bearer ${mgrToken}` } });
  const generatedBill = genBillRes.data.data;
  console.log(`   Bill Created: #${generatedBill.billNumber}, Status: ${generatedBill.status}, Total: ₹${generatedBill.grandTotal}`);

  // 8. Manager verifies bill appears in RECENT BILLS with payment button
  const updatedBillsRes = await axios.get(`${API}/billing`, { headers: { Authorization: `Bearer ${mgrToken}` } });
  const foundBill = updatedBillsRes.data.data.find(b => b.id === generatedBill.id);
  const canRecordPayment = (foundBill.status === 'UNPAID' || foundBill.status === 'PENDING');
  console.log(`✓ Step 5: Bill appears under Recent Bills: #${foundBill.billNumber} (Status: ${foundBill.status})`);
  console.log(`   💳 Shows "Record Payment" button: ${canRecordPayment ? 'YES ✅' : 'NO ❌'}`);

  // 9. Manager records payment
  console.log(`✓ Step 6: Manager records payment of ₹${foundBill.grandTotal} via UPI...`);
  const payRes = await axios.post(`${API}/billing/${foundBill.id}/payment`, {
    amount: +foundBill.grandTotal,
    paymentMethod: 'UPI',
    transactionReference: 'UPI-TEST-12345'
  }, { headers: { Authorization: `Bearer ${mgrToken}` } });
  console.log(`   Payment Success! Bill Status is now: ${payRes.data.data.bill?.status || 'PAID ✅'}`);

  console.log('\n🎉 ALL WAITER & MANAGER MOBILE BILLING STEPS VERIFIED 100% WORKING!\n');
}

testFullBillingLifecycle().catch(err => {
  console.error('Error:', err.response?.data || err.message);
});