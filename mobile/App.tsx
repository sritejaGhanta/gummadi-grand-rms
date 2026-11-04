/**
 * RMS – Restaurant Management System
 * Mobile Application (React Native / Expo)
 *
 * Permission-based navigation — tabs shown based on actual permissions
 * returned by the API for each user's role. No hardcoded role-name checks.
 *
 * Permission → Tab mapping:
 *  kitchen.view              → 🔥 Kitchen KDS
 *  menu.availability.update  → 📋 Menu Availability
 *  tables.manage             → 🪑 Tables
 *  orders.create             → 📝 Menu & Order
 *  orders.update             → 🛎️ Serve / Delivery
 *  reports.view              → 📊 Manager Dashboard
 *  billing.view              → 🧾 Billing
 *
 * Dynamic branding loaded from /settings/public
 * All API responses follow { success, data } envelope
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import io, { Socket } from 'socket.io-client';

// ─────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────
interface PublicSettings {
  restaurant_name: string;
  restaurant_tagline: string;
  currency_symbol: string;
  primary_color: string;
  tax_percentage?: string;
  gst_number?: string;
  contact_number?: string;
  bill_footer_text?: string;
}

interface UserRole {
  id: string;
  name: string;
  displayName: string;
  rolePermissions: Array<{ permission: { key: string } }>;
}

interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
}

type ActiveTab =
  | 'kitchen'
  | 'availability'
  | 'tables'
  | 'order'
  | 'serving'
  | 'dashboard'
  | 'billing';

// ─────────────────────────────────────────────
//  Centralized API helper
// ─────────────────────────────────────────────
async function api(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: unknown,
  token?: string | null,
): Promise<{ success: boolean; data?: any; error?: string }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const json = await res.json();
    return json;
  } catch (e: any) {
    return { success: false, error: e?.message || 'Network error' };
  }
}

// ─────────────────────────────────────────────
//  App
// ─────────────────────────────────────────────
const DEFAULT_SERVER_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (process.env.EXPO_PUBLIC_SERVER_IP
    ? `http://${process.env.EXPO_PUBLIC_SERVER_IP}:3000/api`
    : 'http://192.168.20.131:3000/api');

export default function App() {
  // ── Connection & Auth
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER_URL);
  const [serverStatus, setServerStatus] = useState<null | 'ok' | 'fail'>(null);
  const [testingServer, setTestingServer] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // ── Branding
  const [settings, setSettings] = useState<PublicSettings>({
    restaurant_name: 'Royal Feast Palace',
    restaurant_tagline: 'Restaurant Management System',
    currency_symbol: '₹',
    primary_color: '#d97706',
  });

  // ── Navigation
  const [activeTab, setActiveTab] = useState<ActiveTab>('tables');

  // ── Floors & Tables (waiter)
  const [floors, setFloors] = useState<any[]>([]);
  const [selectedFloorId, setSelectedFloorId] = useState('');
  const [tables, setTables] = useState<any[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [selectedTable, setSelectedTable] = useState<any | null>(null);

  // ── Menu & Cart (waiter)
  const [categories, setCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [dietFilter, setDietFilter] = useState<'all' | 'veg' | 'non-veg'>('all');
  const [cart, setCart] = useState<Record<string, { item: any; qty: number; note: string }>>({});
  const [activeOrder, setActiveOrder] = useState<any | null>(null);

  // Note editor modal
  const [noteModalItem, setNoteModalItem] = useState<any | null>(null);
  const [noteModalText, setNoteModalText] = useState('');

  // ── Kitchen KDS (chef)
  const [kitchenTasks, setKitchenTasks] = useState<any[]>([]);
  const [loadingKitchen, setLoadingKitchen] = useState(false);
  const [refreshingKitchen, setRefreshingKitchen] = useState(false);

  // ── Menu Availability (chef)
  const [availItems, setAvailItems] = useState<any[]>([]);
  const [loadingAvail, setLoadingAvail] = useState(false);

  // ── Serving / Delivery tracking (waiter)
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [loadingServing, setLoadingServing] = useState(false);
  const [refreshingServing, setRefreshingServing] = useState(false);
  const [servingFilter, setServingFilter] = useState<'ready' | 'preparing' | 'delivered' | 'all'>('ready');

  // ── Manager Dashboard
  const [dashData, setDashData] = useState<any | null>(null);
  const [loadingDash, setLoadingDash] = useState(false);
  const [refreshingDash, setRefreshingDash] = useState(false);

  // ── Manager Billing
  const [bills, setBills] = useState<any[]>([]);
  const [billableOrders, setBillableOrders] = useState<any[]>([]);
  const [loadingBilling, setLoadingBilling] = useState(false);
  const [payModal, setPayModal] = useState<any | null>(null);
  const [payMethod, setPayMethod] = useState<'CASH' | 'UPI' | 'CARD'>('CASH');

  // ── On mount / serverUrl change: load public settings
  useEffect(() => {
    (async () => {
      const res = await api(`${serverUrl}/settings/public`);
      if (res.success && res.data) setSettings((p) => ({ ...p, ...res.data }));
    })();
  }, [serverUrl]);

  // ── WebSocket live events for billing, orders, kitchen
  useEffect(() => {
    if (!token || !user) return;
    const socketUrl = serverUrl.replace(/\/api\/?$/, '');
    const socket: Socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      if (user?.role?.name) {
        socket.emit('joinRoleRoom', user.role.name);
      }
    });

    socket.on('billing:requested', (data: any) => {
      Alert.alert('🧾 Bill Requested!', `Waiter requested bill for Table ${data?.tableNumber || ''}`);
      loadBilling();
      if (selectedFloorId) loadTables(selectedFloorId);
      loadDashboard();
    });

    socket.on('billing:paid', () => {
      loadBilling();
      loadDashboard();
    });

    socket.on('order:created', () => {
      loadKitchen();
      loadServing();
      loadDashboard();
    });

    socket.on('order:item_ready', () => {
      loadServing();
    });

    socket.on('settings:updated', (data: any) => {
      if (data) setSettings((p) => ({ ...p, ...data }));
    });

    return () => {
      socket.disconnect();
    };
  }, [token, user?.role?.name, serverUrl]);

  // ─────────────────────────────────────────────
  //  Server test
  // ─────────────────────────────────────────────
  const testServer = async () => {
    setTestingServer(true);
    setServerStatus(null);
    const res = await api(`${serverUrl}/settings/public`);
    setServerStatus(res.success ? 'ok' : 'fail');
    setTestingServer(false);
    if (!res.success) {
      Alert.alert(
        'Connection Failed',
        `Cannot reach:\n${serverUrl}\n\nFor USB: use adb reverse tcp:3000 tcp:3000\nFor Wi-Fi: enter LAN IP of the server`,
      );
    }
  };

  // ─────────────────────────────────────────────
  //  Auth
  // ─────────────────────────────────────────────
  const handleLogin = async () => {
    if (!loginUsername.trim() || !loginPassword.trim()) {
      Alert.alert('Required', 'Enter username and password.');
      return;
    }
    setLoggingIn(true);
    const res = await api(`${serverUrl}/auth/login`, 'POST', {
      username: loginUsername.trim(),
      password: loginPassword,
    });
    setLoggingIn(false);

    if (res.success && res.data?.accessToken) {
      const tok: string = res.data.accessToken;
      const usr: AuthUser = res.data.user;
      setToken(tok);
      setUser(usr);

      // Determine initial tab based on actual permissions (not role name)
      const perms = new Set(
        usr.role?.rolePermissions?.map((rp) => rp.permission.key) ?? []
      );

      if (perms.has('kitchen.view')) {
        // Chef / Admin with kitchen access → start at KDS
        setActiveTab('kitchen');
        loadKitchen(tok);
      } else if (perms.has('reports.view')) {
        // Manager → start at dashboard
        setActiveTab('dashboard');
        loadDashboard(tok);
      } else if (perms.has('tables.manage')) {
        // Staff / Waiter → start at tables
        setActiveTab('tables');
        loadFloors(tok);
        loadMenu(tok);
      } else if (perms.has('orders.view')) {
        // Any order-viewer fallback
        setActiveTab('serving');
        loadServing(tok);
      } else {
        // Fallback — try tables
        setActiveTab('tables');
        loadFloors(tok);
      }
    } else {
      const msg = res.error ?? '';
      if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch')) {
        Alert.alert('Network Error', `Cannot connect to server.\n${serverUrl}\n\nCheck connection and try again.`);
      } else {
        Alert.alert('Login Failed', 'Invalid username or password.');
      }
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Sign out of the app?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          if (token) await api(`${serverUrl}/auth/logout`, 'POST', undefined, token);
          setToken(null);
          setUser(null);
          setActiveOrder(null);
          setSelectedTable(null);
          setCart({});
          setKitchenTasks([]);
          setAllOrders([]);
          setDashData(null);
          setBills([]);
          setLoginUsername('');
          setLoginPassword('');
        },
      },
    ]);
  };

  // ─────────────────────────────────────────────
  //  Data loaders
  // ─────────────────────────────────────────────
  const loadFloors = async (tok = token) => {
    const res = await api(`${serverUrl}/floors`, 'GET', undefined, tok);
    if (res.success && Array.isArray(res.data) && res.data.length > 0) {
      setFloors(res.data);
      const fid = res.data[0].id;
      setSelectedFloorId(fid);
      loadTables(fid, tok);
    }
  };

  const loadTables = async (floorId: string, tok = token) => {
    setLoadingTables(true);
    const res = await api(`${serverUrl}/tables?floorId=${floorId}`, 'GET', undefined, tok);
    setLoadingTables(false);
    if (res.success && Array.isArray(res.data)) setTables(res.data);
  };

  const loadMenu = async (tok = token) => {
    setLoadingMenu(true);
    const [catR, itemR] = await Promise.all([
      api(`${serverUrl}/menu/categories`, 'GET', undefined, tok),
      api(`${serverUrl}/menu/items?activeOnly=true`, 'GET', undefined, tok),
    ]);
    setLoadingMenu(false);
    if (catR.success && Array.isArray(catR.data)) setCategories(catR.data);
    if (itemR.success && Array.isArray(itemR.data)) setMenuItems(itemR.data);
  };

  const loadActiveOrder = async (tableId: string, tok = token) => {
    const res = await api(`${serverUrl}/orders/table/${tableId}/active`, 'GET', undefined, tok);
    setActiveOrder(res.success && res.data ? res.data : null);
  };

  const loadKitchen = async (tok = token, pull = false) => {
    pull ? setRefreshingKitchen(true) : setLoadingKitchen(true);
    const res = await api(`${serverUrl}/kitchen/tasks`, 'GET', undefined, tok);
    pull ? setRefreshingKitchen(false) : setLoadingKitchen(false);
    if (res.success && Array.isArray(res.data)) setKitchenTasks(res.data);
  };

  const loadAvailability = async (tok = token) => {
    setLoadingAvail(true);
    const res = await api(`${serverUrl}/menu/items`, 'GET', undefined, tok);
    setLoadingAvail(false);
    if (res.success && Array.isArray(res.data)) setAvailItems(res.data);
  };

  const loadServing = async (tok = token, pull = false) => {
    pull ? setRefreshingServing(true) : setLoadingServing(true);
    const res = await api(`${serverUrl}/orders`, 'GET', undefined, tok);
    pull ? setRefreshingServing(false) : setLoadingServing(false);
    if (res.success && Array.isArray(res.data)) setAllOrders(res.data);
  };

  const loadDashboard = async (tok = token, pull = false) => {
    pull ? setRefreshingDash(true) : setLoadingDash(true);
    const res = await api(`${serverUrl}/reports/manager-dashboard`, 'GET', undefined, tok);
    pull ? setRefreshingDash(false) : setLoadingDash(false);
    if (res.success && res.data) setDashData(res.data);
  };

  const loadBilling = async (tok = token) => {
    setLoadingBilling(true);
    const [billsR, ordersR] = await Promise.all([
      api(`${serverUrl}/billing`, 'GET', undefined, tok),
      api(`${serverUrl}/orders`, 'GET', undefined, tok),
    ]);
    setLoadingBilling(false);
    if (billsR.success && Array.isArray(billsR.data)) setBills(billsR.data);
    if (ordersR.success && Array.isArray(ordersR.data)) {
      // Include active orders where bill was requested by waiter (table.status === 'BILLING')
      const active = ordersR.data.filter(
        (o: any) =>
          o.status === 'ACTIVE' ||
          o.status === 'BILLING' ||
          o.table?.status === 'BILLING',
      );
      // Sort so tables with BILLING request appear at the very top!
      active.sort((a: any, b: any) => {
        const aReq = a.table?.status === 'BILLING' ? 1 : 0;
        const bReq = b.table?.status === 'BILLING' ? 1 : 0;
        return bReq - aReq;
      });
      setBillableOrders(active);
    }
  };

  // ─────────────────────────────────────────────
  //  Actions – Waiter
  // ─────────────────────────────────────────────
  const selectTable = async (table: any) => {
    setSelectedTable(table);
    setCart({});
    await loadActiveOrder(table.id);
    setActiveTab('order');
  };

  const addToCart = (item: any) => {
    if (item.availability && !item.availability.isAvailable) {
      Alert.alert('Sold Out', `"${item.name}" is currently unavailable.`);
      return;
    }
    setCart((prev) => ({
      ...prev,
      [item.id]: {
        item,
        qty: (prev[item.id]?.qty ?? 0) + 1,
        note: prev[item.id]?.note ?? '',
      },
    }));
  };

  const decrementCart = (itemId: string) => {
    setCart((prev) => {
      const existing = prev[itemId];
      if (!existing) return prev;
      if (existing.qty <= 1) {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      return { ...prev, [itemId]: { ...existing, qty: existing.qty - 1 } };
    });
  };

  const openNoteModal = (item: any) => {
    setNoteModalItem(item);
    setNoteModalText(cart[item.id]?.note ?? '');
  };

  const saveNote = () => {
    if (noteModalItem && cart[noteModalItem.id]) {
      setCart((prev) => ({
        ...prev,
        [noteModalItem.id]: { ...prev[noteModalItem.id], note: noteModalText },
      }));
    }
    setNoteModalItem(null);
  };

  const sendOrder = async () => {
    if (!selectedTable) {
      Alert.alert('No Table', 'Select a table from the Tables tab first.');
      return;
    }
    const items = Object.values(cart).map((c) => ({
      foodItemId: c.item.id,
      quantity: c.qty,
      specialInstructions: c.note || undefined,
    }));
    if (!items.length) { Alert.alert('Empty Cart', 'Add items before sending.'); return; }

    const res = await api(`${serverUrl}/orders`, 'POST', { tableId: selectedTable.id, items }, token);
    if (res.success) {
      Alert.alert('Order Sent! 🎉', `Order sent to kitchen for Table ${selectedTable.tableNumber}.`);
      setCart({});
      setActiveOrder(res.data);
      loadTables(selectedFloorId);
      loadServing();
    } else {
      Alert.alert('Failed', res.error ?? 'Could not place order.');
    }
  };

  const markDelivered = async (itemId: string, name?: string) => {
    const res = await api(`${serverUrl}/orders/items/${itemId}/deliver`, 'PUT', undefined, token);
    if (res.success) {
      Alert.alert('Served ✅', `"${name ?? 'Item'}" marked as served.`);
      loadServing();
      if (selectedTable) loadActiveOrder(selectedTable.id);
    } else Alert.alert('Error', res.error ?? 'Failed.');
  };

  const requestBill = async () => {
    if (!selectedTable) return;
    const res = await api(`${serverUrl}/orders/tables/${selectedTable.id}/request-bill`, 'POST', undefined, token);
    if (res.success) {
      Alert.alert('Bill Requested 🧾', 'Manager notified to generate the bill.');
      loadActiveOrder(selectedTable.id);
      loadTables(selectedFloorId);
    } else Alert.alert('Error', res.error ?? 'Could not request bill.');
  };

  // ─────────────────────────────────────────────
  //  Actions – Chef
  // ─────────────────────────────────────────────
  const kitchenAction = async (taskId: string, action: 'accept' | 'prepare' | 'ready', name?: string) => {
    const res = await api(`${serverUrl}/kitchen/items/${taskId}/${action}`, 'PUT', undefined, token);
    if (res.success) {
      const msgs: Record<string, string> = {
        accept: `Accepted "${name}". Start cooking.`,
        prepare: `Cooking started for "${name}".`,
        ready: `"${name}" is ready to serve! 🔔`,
      };
      Alert.alert('Updated', msgs[action]);
      loadKitchen();
    } else Alert.alert('Error', res.error ?? 'Could not update.');
  };

  const toggleAvailability = (item: any) => {
    const isAvail = item.availability?.isAvailable ?? true;
    const newVal = !isAvail;
    Alert.alert(
      `Mark as ${newVal ? 'Available' : 'Sold Out'}?`,
      `"${item.name}" → ${newVal ? '✅ Available' : '❌ Sold Out'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: newVal ? 'default' : 'destructive',
          onPress: async () => {
            const res = await api(`${serverUrl}/menu/items/${item.id}/availability`, 'PUT', { isAvailable: newVal }, token);
            if (res.success) { Alert.alert('Updated', `"${item.name}" is now ${newVal ? 'Available' : 'Sold Out'}.`); loadAvailability(); }
            else Alert.alert('Error', res.error ?? 'Failed.');
          },
        },
      ],
    );
  };

  // ─────────────────────────────────────────────
  //  Actions – Manager
  // ─────────────────────────────────────────────
  const generateBill = async (orderId: string) => {
    const res = await api(`${serverUrl}/billing/generate`, 'POST', { orderId, discountAmount: 0 }, token);
    if (res.success) { Alert.alert('Bill Generated ✅', `Bill #${res.data?.billNumber ?? ''} created.`); loadBilling(); }
    else Alert.alert('Error', res.error ?? 'Could not generate bill.');
  };

  const recordPayment = async (bill: any) => {
    const payAmt = +(bill.grandTotal || bill.totalAmount || 0);
    const res = await api(
      `${serverUrl}/billing/${bill.id}/payment`,
      'POST',
      { amount: payAmt, paymentMethod: payMethod },
      token,
    );
    if (res.success) {
      Alert.alert(
        'Payment Recorded ✅',
        `${settings.currency_symbol}${payAmt.toFixed(2)} via ${payMethod}.`,
      );
      setPayModal(null);
      loadBilling();
      loadDashboard();
    } else Alert.alert('Error', res.error ?? 'Failed.');
  };

  // ─────────────────────────────────────────────
  //  Permission helpers — derived from API data
  // ─────────────────────────────────────────────
  const cur = settings.currency_symbol || '₹';

  // Build a Set of permission keys for O(1) lookup
  const userPerms = new Set(
    user?.role?.rolePermissions?.map((rp) => rp.permission.key) ?? []
  );
  const can = (key: string) => userPerms.has(key);

  // Tab visibility flags — 100% permission-based, no role-name checks
  const showKitchen     = can('kitchen.view');               // Chef, Admin
  const showAvailability= can('menu.availability.update');   // Chef, Admin
  const showTables      = can('tables.manage');              // Waiter, Manager, Admin
  const showOrder       = can('orders.create');              // Waiter, Admin
  const showServing     = can('orders.update');              // Waiter, Admin
  const showDashboard   = can('reports.view');               // Manager, Admin
  const showBilling     = can('billing.view');               // Manager, Admin

  // Cart helpers
  const cartEntries = Object.values(cart);
  const cartTotal = cartEntries.reduce((s, c) => s + c.item.price * c.qty, 0);
  const cartCount = cartEntries.reduce((s, c) => s + c.qty, 0);

  const filteredMenu = menuItems.filter((item) => {
    const matchesCat = selectedCategory === 'all' || item.categoryId === selectedCategory;
    const matchesDiet =
      dietFilter === 'all' ||
      (dietFilter === 'veg' && item.isVeg === true) ||
      (dietFilter === 'non-veg' && item.isVeg === false);
    return matchesCat && matchesDiet;
  });

  // Flatten all order items for serving view
  const allItems: Array<{ order: any; item: any }> = [];
  allOrders.forEach((o) => o.items?.forEach((it: any) => allItems.push({ order: o, item: it })));

  const servingItems = allItems.filter(({ item }) => {
    if (servingFilter === 'ready') return item.status === 'READY';
    if (servingFilter === 'delivered') return item.status === 'DELIVERED';
    if (servingFilter === 'preparing') return ['PENDING', 'ACCEPTED', 'PREPARING'].includes(item.status);
    return true;
  });

  // ─────────────────────────────────────────────
  //  RENDER: Login Screen
  // ─────────────────────────────────────────────
  if (!token) {
    return (
      <SafeAreaView style={S.safe}>
        <StatusBar barStyle="light-content" backgroundColor="#050a14" />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={S.loginScroll} keyboardShouldPersistTaps="handled">

            {/* Brand */}
            <View style={S.loginBrand}>
              <Text style={S.loginIcon}>🍽️</Text>
              <Text style={S.loginName}>{settings.restaurant_name}</Text>
              <Text style={S.loginTagline}>{settings.restaurant_tagline}</Text>
            </View>

            {/* Server */}
            <Card title="SERVER CONNECTION">
              <View style={S.serverRow}>
                <TextInput
                  style={[S.input, { flex: 1 }]}
                  value={serverUrl}
                  onChangeText={(v) => { setServerUrl(v); setServerStatus(null); }}
                  placeholder="http://192.168.1.100:3000/api"
                  placeholderTextColor="#334155"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={[S.testBtn, serverStatus === 'ok' && S.testBtnOk, serverStatus === 'fail' && S.testBtnFail]}
                  onPress={testServer}
                  disabled={testingServer}
                >
                  {testingServer ? <ActivityIndicator size="small" color="#fff" /> : (
                    <Text style={S.testBtnTxt}>
                      {serverStatus === 'ok' ? '✓' : serverStatus === 'fail' ? '✗' : 'Test'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
              {serverStatus === 'ok' && <Text style={S.serverOk}>✓ Server reachable</Text>}
              {serverStatus === 'fail' && <Text style={S.serverFail}>✗ Unreachable — check URL / network</Text>}
              <Text style={S.hint}>📱 USB (adb reverse): localhost:3000/api</Text>
              <Text style={S.hint}>📡 Wi-Fi: enter server LAN IP</Text>
            </Card>

            {/* Credentials */}
            <Card title="SIGN IN">
              <Text style={S.label}>USERNAME</Text>
              <TextInput style={S.input} value={loginUsername} onChangeText={setLoginUsername}
                placeholder="e.g. waiter" placeholderTextColor="#334155"
                autoCapitalize="none" autoCorrect={false} />
              <Text style={[S.label, { marginTop: 12 }]}>PASSWORD</Text>
              <TextInput style={S.input} value={loginPassword} onChangeText={setLoginPassword}
                secureTextEntry placeholder="••••••" placeholderTextColor="#334155" />
              <TouchableOpacity style={[S.primaryBtn, loggingIn && { opacity: 0.6 }]}
                onPress={handleLogin} disabled={loggingIn}>
                {loggingIn ? <ActivityIndicator color="#020617" /> : <Text style={S.primaryBtnTxt}>Sign In →</Text>}
              </TouchableOpacity>
            </Card>

            {/* Quick Login */}
            <View style={S.quickCard}>
              <Text style={S.quickLabel}>QUICK LOGIN</Text>
              <View style={S.quickRow}>
                {[
                  { l: '👨‍🍳 Chef', u: 'chef', p: 'chef123' },
                  { l: '🛎️ Waiter', u: 'waiter', p: 'waiter123' },
                  { l: '📊 Manager', u: 'manager', p: 'manager123' },
                ].map((r) => (
                  <TouchableOpacity key={r.u} style={S.quickChip}
                    onPress={() => { setLoginUsername(r.u); setLoginPassword(r.p); }}>
                    <Text style={S.quickChipTxt}>{r.l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────
  //  RENDER: Main App
  // ─────────────────────────────────────────────
  return (
    <SafeAreaView style={S.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#050a14" />

      {/* ── App Header ── */}
      <View style={S.header}>
        <View style={{ flex: 1 }}>
          <Text style={S.headerTitle}>🍽️ {settings.restaurant_name}</Text>
          <View style={S.headerMeta}>
            <Text style={S.headerUser}>{user?.name}</Text>
            <View style={S.rolePill}>
              <Text style={S.rolePillTxt}>{user?.role?.displayName || user?.role?.name}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity style={S.logoutBtn} onPress={handleLogout}>
          <Text style={S.logoutTxt}>⇤ Logout</Text>
        </TouchableOpacity>
      </View>

      {/* ── Tab Bar (Permission-based — shows only what user can access) ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={S.tabBar} contentContainerStyle={S.tabBarInner}>
        {showKitchen && (
          <Tab label="🔥 Kitchen" tab="kitchen" active={activeTab}
            onPress={() => { setActiveTab('kitchen'); loadKitchen(); }} />
        )}
        {showAvailability && (
          <Tab label="📋 Availability" tab="availability" active={activeTab}
            onPress={() => { setActiveTab('availability'); loadAvailability(); }} />
        )}
        {showTables && (
          <Tab label="🪑 Tables" tab="tables" active={activeTab}
            onPress={() => { setActiveTab('tables'); if (selectedFloorId) loadTables(selectedFloorId); else loadFloors(); }} />
        )}
        {showOrder && (
          <Tab label="📝 Menu & Order" tab="order" active={activeTab}
            onPress={() => setActiveTab('order')} />
        )}
        {showServing && (
          <Tab label="🛎️ Serve" tab="serving" active={activeTab}
            onPress={() => { setActiveTab('serving'); loadServing(); }} />
        )}
        {showDashboard && (
          <Tab label="📊 Dashboard" tab="dashboard" active={activeTab}
            onPress={() => { setActiveTab('dashboard'); loadDashboard(); }} />
        )}
        {showBilling && (
          <Tab label="🧾 Billing" tab="billing" active={activeTab}
            onPress={() => { setActiveTab('billing'); loadBilling(); }} />
        )}
      </ScrollView>

      {/* ══════════════════════════════════════
          Kitchen KDS  (kitchen.view)
      ══════════════════════════════════════ */}
      {showKitchen && activeTab === 'kitchen' && (
        <ScrollView style={S.content}
          refreshControl={<RefreshControl refreshing={refreshingKitchen}
            onRefresh={() => loadKitchen(token, true)} tintColor="#d97706" />}>
          <SectionHeader title="Live Kitchen Tickets" count={kitchenTasks.length}
            subtitle="Pull down to refresh" />
          {loadingKitchen
            ? <Loader />
            : kitchenTasks.length === 0
              ? <Empty icon="✅" msg="All caught up! No pending tickets." />
              : kitchenTasks.map((t) => (
                <KDSCard key={t.id} task={t} onAction={kitchenAction} />
              ))}
        </ScrollView>
      )}

      {/* Menu Availability  (menu.availability.update) */}
      {showAvailability && activeTab === 'availability' && (
        <ScrollView style={S.content}>
          <SectionHeader title="Menu Availability" subtitle="Tap to toggle Available ↔ Sold Out" />
          {loadingAvail
            ? <Loader />
            : availItems.length === 0
              ? <Empty icon="📋" msg="No menu items found." />
              : availItems.map((item) => {
                const isAvail = item.availability?.isAvailable ?? true;
                return (
                  <View key={item.id} style={S.availCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={S.availName}>{item.isVeg ? '🟢 ' : '🔴 '}{item.name}</Text>
                      <Text style={S.availCat}>{item.category?.name ?? 'Uncategorized'}</Text>
                    </View>
                    <TouchableOpacity
                      style={[S.availToggle, isAvail ? S.availOn : S.availOff]}
                      onPress={() => toggleAvailability(item)}>
                      <Text style={S.availToggleTxt}>{isAvail ? '✓ Available' : '✗ Sold Out'}</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
        </ScrollView>
      )}

      {/* ══════════════════════════════════════
          Tables  (tables.manage)
      ══════════════════════════════════════ */}
      {showTables && activeTab === 'tables' && (
        <ScrollView style={S.content}>
          {floors.length > 0 && (
            <>
              <Text style={S.label}>FLOOR</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.chipRow}>
                {floors.map((f) => (
                  <TouchableOpacity key={f.id}
                    style={[S.chip, selectedFloorId === f.id && S.chipActive]}
                    onPress={() => { setSelectedFloorId(f.id); loadTables(f.id); }}>
                    <Text style={[S.chipTxt, selectedFloorId === f.id && S.chipTxtActive]}>{f.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}
          <View style={S.sectionRow}>
            <Text style={S.sectionTitle}>Tables</Text>
            <TouchableOpacity style={S.refreshBtn} onPress={() => loadTables(selectedFloorId)}>
              <Text style={S.refreshTxt}>🔄 Refresh</Text>
            </TouchableOpacity>
          </View>
          {loadingTables
            ? <Loader />
            : tables.length === 0
              ? <Empty icon="🪑" msg="No tables found on this floor." />
              : (
                <View style={S.tablesGrid}>
                  {tables.map((t) => {
                    const tColor = t.status === 'OCCUPIED' ? '#f59e0b'
                      : t.status === 'BILLING' ? '#3b82f6'
                        : t.status === 'RESERVED' ? '#8b5cf6'
                          : '#22c55e';
                    return (
                      <TouchableOpacity key={t.id} style={[S.tableCard, { borderColor: tColor }]}
                        onPress={() => selectTable(t)}>
                        <Text style={S.tableNum}>{t.tableNumber}</Text>
                        <Text style={S.tableSeats}>{t.seatingCapacity} seats</Text>
                        <View style={[S.tableStatusPill, { backgroundColor: tColor + '28', borderColor: tColor }]}>
                          <Text style={[S.tableStatusTxt, { color: tColor }]}>
                            {t.status === 'AVAILABLE' ? 'Available'
                              : t.status === 'OCCUPIED' ? 'Occupied'
                                : t.status === 'BILLING' ? '🧾 Bill'
                                  : t.status}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
        </ScrollView>
      )}

      {/* WAITER ▶ Menu & Order Cart */}
      {showOrder && activeTab === 'order' && (
        <View style={{ flex: 1 }}>
          {/* Table context banner */}
          <View style={[S.tableBanner, !selectedTable && S.tableBannerWarn]}>
            {selectedTable
              ? <Text style={S.tableBannerTxt}>📍 Table {selectedTable.tableNumber}
                {activeOrder ? `  •  Order #${activeOrder.orderNumber}` : '  •  New Order'}</Text>
              : <Text style={S.tableBannerWarnTxt}>⚠️ No table selected — go to Tables tab</Text>}
          </View>
          <ScrollView style={S.content}>

            {/* Active order */}
            {activeOrder && (
              <View style={S.activeOrderBox}>
                <Text style={S.activeOrderTitle}>🍽️ Current Order — {activeOrder.orderNumber}</Text>
                {activeOrder.items?.map((it: any) => {
                  const isReady = it.status === 'READY';
                  const isDone = it.status === 'DELIVERED';
                  return (
                    <View key={it.id} style={S.activeOrderRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={S.activeItemName}>{it.quantity}× {it.foodItem?.name}</Text>
                        <Text style={[S.activeItemStatus,
                          isReady && S.txtReady, isDone && S.txtDone]}>
                          {isDone ? '✅ Served to table' : isReady ? '🔔 Ready — serve now!' : `⏳ ${it.status}`}
                        </Text>
                      </View>
                      {isReady && (
                        <TouchableOpacity style={S.serveSmall}
                          onPress={() => markDelivered(it.id, it.foodItem?.name)}>
                          <Text style={S.serveSmallTxt}>Serve</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
                {activeOrder.status !== 'BILLING' && (
                  <TouchableOpacity style={S.reqBillBtn} onPress={requestBill}>
                    <Text style={S.reqBillTxt}>🧾 Request Bill</Text>
                  </TouchableOpacity>
                )}
                {activeOrder.status === 'BILLING' && (
                  <View style={S.billingNote}>
                    <Text style={S.billingNoteTxt}>🧾 Bill requested — awaiting manager.</Text>
                  </View>
                )}
              </View>
            )}

            {/* Diet Type chips */}
            <Text style={S.label}>DIET TYPE</Text>
            <View style={{ flexDirection: 'row', paddingHorizontal: 12, marginBottom: 8, gap: 8 }}>
              <TouchableOpacity
                style={[S.chip, dietFilter === 'all' && S.chipActive, { paddingHorizontal: 16 }]}
                onPress={() => setDietFilter('all')}>
                <Text style={[S.chipTxt, dietFilter === 'all' && S.chipTxtActive]}>All Menu</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[S.chip, dietFilter === 'veg' && { backgroundColor: '#16a34a', borderColor: '#22c55e' }]}
                onPress={() => setDietFilter('veg')}>
                <Text style={[S.chipTxt, dietFilter === 'veg' && { color: '#ffffff', fontWeight: 'bold' }]}>🟢 Veg</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[S.chip, dietFilter === 'non-veg' && { backgroundColor: '#dc2626', borderColor: '#ef4444' }]}
                onPress={() => setDietFilter('non-veg')}>
                <Text style={[S.chipTxt, dietFilter === 'non-veg' && { color: '#ffffff', fontWeight: 'bold' }]}>🔴 Non-Veg</Text>
              </TouchableOpacity>
            </View>

            {/* Category chips */}
            <Text style={S.label}>CATEGORY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.chipRow}>
              <TouchableOpacity style={[S.chip, selectedCategory === 'all' && S.chipActive]}
                onPress={() => setSelectedCategory('all')}>
                <Text style={[S.chipTxt, selectedCategory === 'all' && S.chipTxtActive]}>All</Text>
              </TouchableOpacity>
              {categories.map((c) => (
                <TouchableOpacity key={c.id}
                  style={[S.chip, selectedCategory === c.id && S.chipActive]}
                  onPress={() => setSelectedCategory(c.id)}>
                  <Text style={[S.chipTxt, selectedCategory === c.id && S.chipTxtActive]}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Menu items */}
            {loadingMenu ? <Loader /> : filteredMenu.map((item) => {
              const soldOut = item.availability && !item.availability.isAvailable;
              const inCart = cart[item.id]?.qty ?? 0;
              return (
                <View key={item.id} style={[S.menuCard, soldOut && S.menuSoldOut]}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={S.menuName}>{item.isVeg ? '🟢 ' : '🔴 '}{item.name}</Text>
                    <Text style={S.menuPrice}>{cur}{item.price}</Text>
                    {item.description ? <Text style={S.menuDesc}>{item.description}</Text> : null}
                    {item.preparationTimeMinutes ? <Text style={S.menuTime}>⏱ ~{item.preparationTimeMinutes} min</Text> : null}
                  </View>
                  {soldOut ? (
                    <Text style={S.soldOut}>Sold Out</Text>
                  ) : inCart > 0 ? (
                    <View style={S.qtyCtrl}>
                      <TouchableOpacity style={S.qtyBtn} onPress={() => decrementCart(item.id)}>
                        <Text style={S.qtyBtnTxt}>−</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={S.qtyNum} onPress={() => openNoteModal(item)}>
                        <Text style={S.qtyNumTxt}>{inCart}</Text>
                        {cart[item.id]?.note ? <Text style={{ fontSize: 8 }}>📝</Text> : null}
                      </TouchableOpacity>
                      <TouchableOpacity style={S.qtyBtn} onPress={() => addToCart(item)}>
                        <Text style={S.qtyBtnTxt}>+</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity style={S.addBtn} onPress={() => addToCart(item)}>
                      <Text style={S.addBtnTxt}>+ Add</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </ScrollView>

          {/* Cart bar */}
          {cartEntries.length > 0 && (
            <View style={S.cartBar}>
              <View>
                <Text style={S.cartItems}>{cartCount} item{cartCount !== 1 ? 's' : ''}</Text>
                <Text style={S.cartTotal}>{cur}{cartTotal.toFixed(2)}</Text>
              </View>
              <TouchableOpacity style={[S.sendBtn, !selectedTable && S.sendBtnDisabled]}
                onPress={sendOrder} disabled={!selectedTable}>
                <Text style={S.sendBtnTxt}>
                  {selectedTable ? '🍳 Send to Kitchen' : '⚠️ Select Table'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* WAITER ▶ Serve (Delivery Tracking) */}
      {showServing && activeTab === 'serving' && (
        <ScrollView style={S.content}
          refreshControl={<RefreshControl refreshing={refreshingServing}
            onRefresh={() => loadServing(token, true)} tintColor="#d97706" />}>
          <SectionHeader title="Delivery Tracking" subtitle="Pull to refresh • Serve ready items" />

          {/* Filter chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.chipRow}>
            {([
              { k: 'ready', l: '🔔 Ready to Serve' },
              { k: 'preparing', l: '🍳 In Kitchen' },
              { k: 'delivered', l: '✅ Served' },
              { k: 'all', l: 'All Items' },
            ] as const).map((f) => (
              <TouchableOpacity key={f.k} style={[S.chip, servingFilter === f.k && S.chipActive]}
                onPress={() => setServingFilter(f.k)}>
                <Text style={[S.chipTxt, servingFilter === f.k && S.chipTxtActive]}>{f.l}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {loadingServing
            ? <Loader />
            : servingItems.length === 0
              ? <Empty icon={servingFilter === 'ready' ? '✅' : '📋'}
                msg={servingFilter === 'ready' ? 'No items ready to serve.' : 'No items found.'} />
              : servingItems.map(({ order, item }) => {
                const isReady = item.status === 'READY';
                const isDone = item.status === 'DELIVERED';
                return (
                  <View key={item.id} style={S.servCard}>
                    <View style={S.servHeader}>
                      <Text style={S.servTable}>Table {order?.table?.tableNumber ?? '?'}</Text>
                      <View style={[S.servPill,
                        isReady && S.servPillReady, isDone && S.servPillDone]}>
                        <Text style={[S.servPillTxt,
                          isReady && S.servPillTxtReady, isDone && S.servPillTxtDone]}>
                          {isDone ? '✅ SERVED' : isReady ? '🔔 READY' : `⏳ ${item.status}`}
                        </Text>
                      </View>
                    </View>
                    <Text style={S.servDish}>{item.quantity}× {item.foodItem?.name}</Text>
                    <Text style={S.servOrder}>Order: {order?.orderNumber}</Text>
                    {item.specialInstructions
                      ? <Text style={S.servNote}>📝 {item.specialInstructions}</Text> : null}
                    {isReady && (
                      <TouchableOpacity style={S.serveNowBtn}
                        onPress={() => markDelivered(item.id, item.foodItem?.name)}>
                        <Text style={S.serveNowTxt}>🍽️ Mark as Served</Text>
                      </TouchableOpacity>
                    )}
                    {isDone && (
                      <View style={S.doneBox}>
                        <Text style={S.doneTxt}>✓ Served to Table {order?.table?.tableNumber}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
        </ScrollView>
      )}

      {/* ══════════════════════════════════════
          MANAGER ▶ Dashboard
      ══════════════════════════════════════ */}
      {showDashboard && activeTab === 'dashboard' && (
        <ScrollView style={S.content}
          refreshControl={<RefreshControl refreshing={refreshingDash}
            onRefresh={() => loadDashboard(token, true)} tintColor="#d97706" />}>
          <SectionHeader title="Manager Dashboard" subtitle="Pull to refresh" />

          {loadingDash && !dashData
            ? <Loader />
            : !dashData
              ? <Empty icon="📊" msg="Could not load dashboard." />
              : <>
                <SLabel>REVENUE & ORDERS</SLabel>
                <View style={S.statsGrid}>
                  <StatCard icon="💰" label="Today Revenue" value={`${cur}${(+dashData.todayRevenue || 0).toFixed(2)}`} color="#22c55e" />
                  <StatCard icon="📋" label="Today Orders" value={String(dashData.todayOrders ?? 0)} color="#3b82f6" />
                  <StatCard icon="⏳" label="Pending" value={String(dashData.pendingOrders ?? 0)} color="#f59e0b" />
                  <StatCard icon="✅" label="Completed" value={String(dashData.completedOrders ?? 0)} color="#22c55e" />
                </View>

                <SLabel>RESTAURANT STATUS</SLabel>
                <View style={S.statsGrid}>
                  <StatCard icon="🟢" label="Available Tables" value={String(dashData.availableTables ?? 0)} color="#22c55e" />
                  <StatCard icon="🔴" label="Occupied Tables" value={String(dashData.occupiedTables ?? 0)} color="#f59e0b" />
                  <StatCard icon="🧾" label="Billing Tables" value={String(dashData.billingTables ?? 0)} color="#3b82f6" />
                  <StatCard icon="📊" label="Total Tables" value={String(dashData.totalTables ?? 0)} color="#8b5cf6" />
                </View>

                {dashData.staffPerformance?.length > 0 && <>
                  <SLabel>STAFF PERFORMANCE</SLabel>
                  {dashData.staffPerformance.map((s: any) => (
                    <View key={s.id} style={S.perfCard}>
                      <Text style={S.perfName}>👤 {s.name}</Text>
                      <View style={S.perfRow}>
                        <Text style={S.perfStat}>📋 {s.ordersTaken} orders</Text>
                        <Text style={S.perfStat}>🛎️ {s.itemsDelivered} delivered</Text>
                      </View>
                    </View>
                  ))}
                </>}

                {dashData.chefPerformance?.length > 0 && <>
                  <SLabel>CHEF PERFORMANCE</SLabel>
                  {dashData.chefPerformance.map((c: any) => (
                    <View key={c.id} style={S.perfCard}>
                      <Text style={S.perfName}>👨‍🍳 {c.name}</Text>
                      <View style={S.perfRow}>
                        <Text style={S.perfStat}>🍳 {c.itemsPrepared} prepared</Text>
                        <Text style={S.perfStat}>🔄 {c.currentlyPreparing} active</Text>
                      </View>
                    </View>
                  ))}
                </>}

                {dashData.managerPerformance?.length > 0 && <>
                  <SLabel>MANAGER BILLING & CASHIER</SLabel>
                  {dashData.managerPerformance.map((m: any) => (
                    <View key={m.id} style={S.perfCard}>
                      <Text style={S.perfName}>🧾 {m.name} (@{m.username})</Text>
                      <View style={S.perfRow}>
                        <Text style={S.perfStat}>🧾 {m.billsGenerated} bills generated</Text>
                        <Text style={S.perfStat}>💰 {cur}{(+m.totalCollectedAmount || 0).toFixed(0)} settled</Text>
                      </View>
                    </View>
                  ))}
                </>}
              </>}
        </ScrollView>
      )}

      {/* MANAGER ▶ Billing */}
      {showBilling && activeTab === 'billing' && (
        <ScrollView style={S.content}>
          <View style={S.sectionRow}>
            <Text style={S.sectionTitle}>Billing</Text>
            <TouchableOpacity style={S.refreshBtn} onPress={() => loadBilling()}>
              <Text style={S.refreshTxt}>🔄 Refresh</Text>
            </TouchableOpacity>
          </View>

          {loadingBilling ? <Loader /> : <>
            {billableOrders.length > 0 && <>
              <SLabel>TABLES READY FOR BILL GENERATION ({billableOrders.length})</SLabel>
              {billableOrders.map((order) => {
                const isRequested = order.table?.status === 'BILLING';
                return (
                  <View key={order.id} style={[S.billableCard, isRequested && S.billableCardRequested]}>
                    <View style={S.billableTop}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={S.billableNum}>{order.orderNumber}</Text>
                        {isRequested && (
                          <View style={S.requestedBadge}>
                            <Text style={S.requestedBadgeTxt}>🔔 REQUESTED</Text>
                          </View>
                        )}
                      </View>
                      <Text style={S.billableTableTxt}>Table {order.table?.tableNumber ?? '?'}</Text>
                    </View>
                    <Text style={S.billableAmt}>{cur}{(+order.totalAmount || 0).toFixed(2)}</Text>
                    <Text style={S.billableInfo}>{order.items?.length ?? 0} items • Waiter: {order.waiter?.name ?? 'Staff'}</Text>
                    <TouchableOpacity style={S.genBillBtn} onPress={() => generateBill(order.id)}>
                      <Text style={S.genBillTxt}>🧾 Generate Bill</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </>}

            <SLabel>RECENT BILLS</SLabel>
            {bills.length === 0
              ? <Empty icon="🧾" msg="No bills generated yet." />
              : bills.map((bill) => (
                <View key={bill.id} style={S.billCard}>
                  <View style={S.billTop}>
                    <Text style={S.billNum}>Bill #{bill.billNumber}</Text>
                    <View
                      style={[
                        S.billPill,
                        bill.status === 'PAID' && S.billPillPaid,
                        (bill.status === 'UNPAID' || bill.status === 'PENDING') &&
                          S.billPillPending,
                      ]}
                    >
                      <Text style={S.billPillTxt}>{bill.status}</Text>
                    </View>
                  </View>
                  <Text style={S.billMeta}>
                    Table {bill.order?.table?.tableNumber ?? '?'} •{' '}
                    {new Date(bill.createdAt).toLocaleDateString()}
                  </Text>
                  <Text style={S.billLine}>
                    Subtotal: {cur}
                    {(+bill.subtotal || 0).toFixed(2)}
                  </Text>
                  <Text style={S.billLine}>
                    Tax: {cur}
                    {(+bill.taxAmount || 0).toFixed(2)}
                  </Text>
                  {bill.discountAmount > 0 && (
                    <Text style={S.billLine}>
                      Discount: -{cur}
                      {(+bill.discountAmount).toFixed(2)}
                    </Text>
                  )}
                  <Text style={S.billTotal}>
                    TOTAL: {cur}
                    {(+bill.totalAmount || +bill.grandTotal || 0).toFixed(2)}
                  </Text>
                  {(bill.status === 'UNPAID' || bill.status === 'PENDING') && (
                    <TouchableOpacity style={S.payBtn} onPress={() => setPayModal(bill)}>
                      <Text style={S.payBtnTxt}>💳 Record Payment</Text>
                    </TouchableOpacity>
                  )}
                  {bill.status === 'PAID' && (
                    <Text style={S.paidInfo}>✅ Paid via {bill.payment?.paymentMethod ?? '—'}</Text>
                  )}
                </View>
              ))}
          </>}
        </ScrollView>
      )}

      {/* ══════════════════════════════════════
          MODALS
      ══════════════════════════════════════ */}

      {/* Note editor */}
      <Modal visible={!!noteModalItem} transparent animationType="slide"
        onRequestClose={() => setNoteModalItem(null)}>
        <View style={S.modalOverlay}>
          <View style={S.modalCard}>
            <Text style={S.modalTitle}>Special Instructions</Text>
            <Text style={S.modalSub}>{noteModalItem?.name}</Text>
            <TextInput style={S.noteInput} value={noteModalText} onChangeText={setNoteModalText}
              placeholder="e.g. No onions, extra spicy..."
              placeholderTextColor="#334155" multiline maxLength={200} />
            <View style={S.modalBtns}>
              <TouchableOpacity style={S.modalCancel} onPress={() => setNoteModalItem(null)}>
                <Text style={S.modalCancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={S.modalSave} onPress={saveNote}>
                <Text style={S.modalSaveTxt}>Save Note</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Payment modal */}
      <Modal visible={!!payModal} transparent animationType="slide"
        onRequestClose={() => setPayModal(null)}>
        <View style={S.modalOverlay}>
          <View style={S.modalCard}>
            <Text style={S.modalTitle}>Record Payment</Text>
            <Text style={S.modalSub}>
              Bill #{payModal?.billNumber}  •  {cur}{(+payModal?.totalAmount || 0).toFixed(2)}
            </Text>
            <Text style={[S.label, { marginTop: 16 }]}>PAYMENT METHOD</Text>
            <View style={S.payMethodRow}>
              {(['CASH', 'UPI', 'CARD'] as const).map((m) => (
                <TouchableOpacity key={m}
                  style={[S.payMethodBtn, payMethod === m && S.payMethodBtnActive]}
                  onPress={() => setPayMethod(m)}>
                  <Text style={[S.payMethodTxt, payMethod === m && S.payMethodTxtActive]}>
                    {m === 'CASH' ? '💵' : m === 'UPI' ? '📱' : '💳'} {m}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={S.modalBtns}>
              <TouchableOpacity style={S.modalCancel} onPress={() => setPayModal(null)}>
                <Text style={S.modalCancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={S.modalSave} onPress={() => recordPayment(payModal)}>
                <Text style={S.modalSaveTxt}>Confirm Payment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
//  Reusable Components
// ─────────────────────────────────────────────

function Tab({ label, tab, active, onPress }: { label: string; tab: ActiveTab; active: ActiveTab; onPress: () => void }) {
  const on = active === tab;
  return (
    <TouchableOpacity style={[S.tab, on && S.tabActive]} onPress={onPress}>
      <Text style={[S.tabTxt, on && S.tabTxtActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={S.card}>
      <Text style={S.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function SectionHeader({ title, subtitle, count }: { title: string; subtitle?: string; count?: number }) {
  return (
    <View style={{ marginBottom: 4 }}>
      <View style={S.sectionRow}>
        <Text style={S.sectionTitle}>{title}</Text>
        {count !== undefined && (
          <View style={S.countBadge}><Text style={S.countBadgeTxt}>{count}</Text></View>
        )}
      </View>
      {subtitle ? <Text style={S.sectionSub}>{subtitle}</Text> : null}
    </View>
  );
}

function SLabel({ children }: { children: React.ReactNode }) {
  return <Text style={S.sLabel}>{children}</Text>;
}

function Loader() {
  return <ActivityIndicator size="large" color="#d97706" style={{ marginTop: 40 }} />;
}

function Empty({ icon, msg }: { icon: string; msg: string }) {
  return (
    <View style={S.empty}>
      <Text style={S.emptyIcon}>{icon}</Text>
      <Text style={S.emptyTxt}>{msg}</Text>
    </View>
  );
}

function KDSCard({ task, onAction }: { task: any; onAction: (id: string, a: 'accept' | 'prepare' | 'ready', n?: string) => void }) {
  const clr: Record<string, string> = { PENDING: '#f59e0b', ACCEPTED: '#3b82f6', PREPARING: '#8b5cf6', READY: '#22c55e' };
  const c = clr[task.status] ?? '#94a3b8';
  return (
    <View style={[S.kdsCard, { borderLeftColor: c }]}>
      <View style={S.kdsHeader}>
        <Text style={S.kdsTable}>Table {task.order?.table?.tableNumber ?? 'Takeaway'}</Text>
        <Text style={[S.kdsStatus, { color: c }]}>{task.status}</Text>
      </View>
      <Text style={S.kdsDish}>{task.quantity}× {task.foodItem?.name}</Text>
      {task.specialInstructions ? <Text style={S.kdsNote}>📝 {task.specialInstructions}</Text> : null}
      <Text style={S.kdsTime}>🕐 {new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
      <View style={{ marginTop: 8 }}>
        {task.status === 'PENDING' && (
          <TouchableOpacity style={[S.kdsBtn, { backgroundColor: '#1d4ed8' }]}
            onPress={() => onAction(task.id, 'accept', task.foodItem?.name)}>
            <Text style={S.kdsBtnTxt}>✓ Accept Order</Text>
          </TouchableOpacity>
        )}
        {task.status === 'ACCEPTED' && (
          <TouchableOpacity style={[S.kdsBtn, { backgroundColor: '#7c3aed' }]}
            onPress={() => onAction(task.id, 'prepare', task.foodItem?.name)}>
            <Text style={S.kdsBtnTxt}>🔥 Start Cooking</Text>
          </TouchableOpacity>
        )}
        {task.status === 'PREPARING' && (
          <TouchableOpacity style={[S.kdsBtn, { backgroundColor: '#15803d' }]}
            onPress={() => onAction(task.id, 'ready', task.foodItem?.name)}>
            <Text style={S.kdsBtnTxt}>🔔 Mark Ready to Serve</Text>
          </TouchableOpacity>
        )}
        {task.status === 'READY' && (
          <View style={[S.kdsBtn, { backgroundColor: '#166534' }]}>
            <Text style={S.kdsBtnTxt}>✅ Ready — Awaiting Waiter</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <View style={[S.statCard, { borderTopColor: color }]}>
      <Text style={S.statIcon}>{icon}</Text>
      <Text style={[S.statValue, { color }]}>{value}</Text>
      <Text style={S.statLabel}>{label}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────
//  Design Tokens
// ─────────────────────────────────────────────
const C = {
  bg: '#050a14',
  surf: '#0d1a2e',
  surfHi: '#111f35',
  bdr: '#1a2f4a',
  txt: '#e2e8f0',
  txtMuted: '#3d5275',
  txtSec: '#94a3b8',
  accent: '#d97706',
  success: '#22c55e',
  danger: '#ef4444',
  info: '#3b82f6',
  purple: '#8b5cf6',
};

// ─────────────────────────────────────────────
//  Styles
// ─────────────────────────────────────────────
const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { flex: 1, padding: 16 },

  // Login
  loginScroll: { padding: 20, paddingBottom: 40 },
  loginBrand: { alignItems: 'center', marginTop: 24, marginBottom: 28 },
  loginIcon: { fontSize: 48 },
  loginName: { fontSize: 24, fontWeight: '900', color: C.txt, marginTop: 10, textAlign: 'center' },
  loginTagline: { fontSize: 13, color: C.txtSec, textAlign: 'center', marginTop: 6 },
  card: {
    backgroundColor: C.surf, borderRadius: 20, padding: 20,
    marginBottom: 16, borderWidth: 1, borderColor: C.bdr,
  },
  cardTitle: { fontSize: 10, fontWeight: '800', color: C.txtMuted, letterSpacing: 1.5, marginBottom: 16 },
  serverRow: { flexDirection: 'row', gap: 8 },
  testBtn: {
    backgroundColor: C.surfHi, borderWidth: 1, borderColor: C.bdr,
    borderRadius: 12, paddingHorizontal: 14, minWidth: 52,
    justifyContent: 'center', alignItems: 'center',
  },
  testBtnOk: { borderColor: C.success, backgroundColor: '#14532d28' },
  testBtnFail: { borderColor: C.danger, backgroundColor: '#7f1d1d28' },
  testBtnTxt: { color: C.txt, fontSize: 12, fontWeight: '800' },
  serverOk: { color: C.success, fontSize: 11, marginTop: 6 },
  serverFail: { color: C.danger, fontSize: 11, marginTop: 6 },
  hint: { color: C.txtMuted, fontSize: 11, marginTop: 4 },
  label: { fontSize: 10, fontWeight: '800', color: C.txtMuted, letterSpacing: 1.2, marginBottom: 6 },
  input: {
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.bdr,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    color: C.txt, fontSize: 14,
  },
  primaryBtn: { backgroundColor: C.accent, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 14 },
  primaryBtnTxt: { color: '#020617', fontWeight: '800', fontSize: 15 },
  quickCard: { backgroundColor: C.surf, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: C.bdr },
  quickLabel: { fontSize: 10, fontWeight: '800', color: C.txtMuted, letterSpacing: 1.5, marginBottom: 10 },
  quickRow: { flexDirection: 'row', gap: 8 },
  quickChip: { flex: 1, backgroundColor: C.surfHi, borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: C.bdr },
  quickChipTxt: { color: C.txt, fontSize: 11, fontWeight: '600' },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: C.surf, borderBottomWidth: 1, borderBottomColor: C.bdr,
  },
  headerTitle: { fontSize: 15, fontWeight: '800', color: C.txt },
  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  headerUser: { fontSize: 12, color: C.txtSec },
  rolePill: {
    backgroundColor: C.accent + '22', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: C.accent + '44',
  },
  rolePillTxt: { color: C.accent, fontSize: 10, fontWeight: '800' },
  logoutBtn: {
    backgroundColor: C.danger + '15', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: C.danger + '30',
  },
  logoutTxt: { color: C.danger, fontWeight: '800', fontSize: 12 },

  // Tabs
  tabBar: { backgroundColor: C.surf, borderBottomWidth: 1, borderBottomColor: C.bdr, maxHeight: 48 },
  tabBarInner: { paddingHorizontal: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 14, marginHorizontal: 2 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: C.accent },
  tabTxt: { color: C.txtSec, fontSize: 12, fontWeight: '600' },
  tabTxtActive: { color: C.accent, fontWeight: '800' },

  // Section UI
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: C.txt },
  sectionSub: { fontSize: 11, color: C.txtMuted, marginBottom: 12 },
  sLabel: { fontSize: 10, fontWeight: '800', color: C.txtMuted, letterSpacing: 1.5, marginTop: 16, marginBottom: 8 },
  countBadge: { backgroundColor: C.accent + '22', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: C.accent + '44' },
  countBadgeTxt: { color: C.accent, fontWeight: '800', fontSize: 12 },
  refreshBtn: { backgroundColor: C.surfHi, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: C.bdr },
  refreshTxt: { color: C.accent, fontSize: 11, fontWeight: '800' },

  // Chips
  chipRow: { flexDirection: 'row', marginBottom: 12 },
  chip: { backgroundColor: C.surfHi, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8, borderWidth: 1, borderColor: C.bdr },
  chipActive: { backgroundColor: C.accent, borderColor: C.accent },
  chipTxt: { color: C.txtSec, fontSize: 12, fontWeight: '600' },
  chipTxtActive: { color: '#020617', fontWeight: '800' },

  // Tables
  tablesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  tableCard: { width: '48%', backgroundColor: C.surf, borderRadius: 16, borderWidth: 1.5, padding: 16 },
  tableNum: { fontSize: 20, fontWeight: '900', color: C.txt },
  tableSeats: { fontSize: 12, color: C.txtSec, marginTop: 4 },
  tableStatusPill: { marginTop: 10, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, alignSelf: 'flex-start' },
  tableStatusTxt: { fontSize: 10, fontWeight: '800' },

  // Table/Order banner
  tableBanner: { backgroundColor: C.surfHi, padding: 12, borderBottomWidth: 1, borderBottomColor: C.bdr, alignItems: 'center' },
  tableBannerWarn: { backgroundColor: '#451a0333' },
  tableBannerTxt: { color: C.accent, fontWeight: '700', fontSize: 13 },
  tableBannerWarnTxt: { color: '#f97316', fontWeight: '700', fontSize: 13 },

  // Active order
  activeOrderBox: { backgroundColor: C.surf, borderRadius: 16, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: C.bdr },
  activeOrderTitle: { color: C.txt, fontWeight: '800', fontSize: 13, marginBottom: 8 },
  activeOrderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.bdr },
  activeItemName: { color: C.txt, fontSize: 13, fontWeight: '600' },
  activeItemStatus: { color: C.txtSec, fontSize: 11, marginTop: 2 },
  txtReady: { color: C.success, fontWeight: '700' },
  txtDone: { color: C.info },
  serveSmall: { backgroundColor: C.success, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  serveSmallTxt: { color: '#020617', fontWeight: '800', fontSize: 11 },
  reqBillBtn: { backgroundColor: C.info + '22', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: C.info + '44' },
  reqBillTxt: { color: C.info, fontWeight: '700', fontSize: 13 },
  billingNote: { backgroundColor: C.info + '15', borderRadius: 8, padding: 10, marginTop: 8 },
  billingNoteTxt: { color: C.info, fontSize: 12, textAlign: 'center' },

  // Menu
  menuCard: { backgroundColor: C.surf, borderRadius: 14, padding: 12, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: C.bdr },
  menuSoldOut: { opacity: 0.4 },
  menuName: { color: C.txt, fontSize: 14, fontWeight: '700' },
  menuPrice: { color: C.accent, fontSize: 13, fontWeight: '700', marginTop: 2 },
  menuDesc: { color: C.txtSec, fontSize: 11, marginTop: 2 },
  menuTime: { color: C.txtMuted, fontSize: 10, marginTop: 2 },
  addBtn: { backgroundColor: C.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  addBtnTxt: { color: '#020617', fontWeight: '800', fontSize: 12 },
  soldOut: { color: C.danger, fontSize: 11, fontWeight: '800' },
  qtyCtrl: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surfHi, borderRadius: 10, borderWidth: 1, borderColor: C.bdr, overflow: 'hidden' },
  qtyBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  qtyBtnTxt: { color: C.accent, fontSize: 16, fontWeight: '900' },
  qtyNum: { alignItems: 'center', paddingHorizontal: 8 },
  qtyNumTxt: { color: C.txt, fontWeight: '800', fontSize: 14 },

  // Cart bar
  cartBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.surf, paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: C.bdr },
  cartItems: { color: C.txtSec, fontSize: 12 },
  cartTotal: { color: C.txt, fontWeight: '800', fontSize: 16, marginTop: 2 },
  sendBtn: { backgroundColor: C.accent, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12 },
  sendBtnDisabled: { backgroundColor: '#4a3000' },
  sendBtnTxt: { color: '#020617', fontWeight: '800', fontSize: 13 },

  // Serving
  servCard: { backgroundColor: C.surf, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.bdr },
  servHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  servTable: { color: C.txt, fontWeight: '800', fontSize: 14 },
  servPill: { backgroundColor: C.txtMuted + '22', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: C.bdr },
  servPillReady: { backgroundColor: C.success + '22', borderColor: C.success + '55' },
  servPillDone: { backgroundColor: C.info + '22', borderColor: C.info + '55' },
  servPillTxt: { color: C.txtSec, fontSize: 10, fontWeight: '800' },
  servPillTxtReady: { color: C.success },
  servPillTxtDone: { color: C.info },
  servDish: { color: C.txt, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  servOrder: { color: C.txtMuted, fontSize: 11 },
  servNote: { color: '#fbbf24', fontSize: 11, marginTop: 4, fontStyle: 'italic' },
  serveNowBtn: { backgroundColor: C.success, borderRadius: 12, paddingVertical: 11, alignItems: 'center', marginTop: 12 },
  serveNowTxt: { color: '#020617', fontWeight: '800', fontSize: 13 },
  doneBox: { backgroundColor: C.info + '15', borderRadius: 8, padding: 10, marginTop: 8 },
  doneTxt: { color: C.info, fontSize: 12, textAlign: 'center' },

  // KDS
  kdsCard: { backgroundColor: C.surf, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.bdr, borderLeftWidth: 4 },
  kdsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  kdsTable: { color: C.txt, fontWeight: '900', fontSize: 16 },
  kdsStatus: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  kdsDish: { color: C.txt, fontSize: 15, fontWeight: '700', marginBottom: 3 },
  kdsNote: { color: '#fbbf24', fontSize: 11, fontStyle: 'italic', marginBottom: 3 },
  kdsTime: { color: C.txtMuted, fontSize: 11 },
  kdsBtn: { borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  kdsBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 13 },

  // Availability
  availCard: { backgroundColor: C.surf, borderRadius: 14, padding: 14, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: C.bdr },
  availName: { color: C.txt, fontSize: 14, fontWeight: '700' },
  availCat: { color: C.txtSec, fontSize: 11, marginTop: 3 },
  availToggle: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1 },
  availOn: { backgroundColor: C.success + '22', borderColor: C.success + '55' },
  availOff: { backgroundColor: C.danger + '22', borderColor: C.danger + '55' },
  availToggleTxt: { fontWeight: '800', fontSize: 12, color: C.txt },

  // Dashboard
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { backgroundColor: C.surf, borderRadius: 14, padding: 14, flex: 1, minWidth: '45%', borderWidth: 1, borderColor: C.bdr, borderTopWidth: 3, alignItems: 'center' },
  statIcon: { fontSize: 22, marginBottom: 6 },
  statValue: { fontSize: 20, fontWeight: '900' },
  statLabel: { color: C.txtSec, fontSize: 11, marginTop: 4, textAlign: 'center' },
  perfCard: { backgroundColor: C.surf, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: C.bdr },
  perfName: { color: C.txt, fontWeight: '700', fontSize: 14, marginBottom: 6 },
  perfRow: { flexDirection: 'row', gap: 16 },
  perfStat: { color: C.txtSec, fontSize: 12 },

  // Billing
  billableCard: { backgroundColor: C.info + '11', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.info + '33' },
  billableCardRequested: { backgroundColor: '#1e3a8a33', borderColor: '#3b82f6', borderWidth: 2 },
  requestedBadge: { backgroundColor: '#3b82f622', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: '#3b82f6' },
  requestedBadgeTxt: { color: '#60a5fa', fontSize: 10, fontWeight: '900' },
  billableTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  billableNum: { color: C.txt, fontWeight: '800', fontSize: 14 },
  billableTableTxt: { color: C.info, fontWeight: '700', fontSize: 13 },
  billableAmt: { color: C.txt, fontSize: 15, fontWeight: '800', marginBottom: 2 },
  billableInfo: { color: C.txtSec, fontSize: 12, marginBottom: 10 },
  genBillBtn: { backgroundColor: C.info, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  genBillTxt: { color: '#fff', fontWeight: '800', fontSize: 13 },
  billCard: { backgroundColor: C.surf, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.bdr },
  billTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  billNum: { color: C.txt, fontWeight: '800', fontSize: 14 },
  billPill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, backgroundColor: C.txtMuted + '22' },
  billPillPaid: { backgroundColor: C.success + '22' },
  billPillPending: { backgroundColor: C.accent + '22' },
  billPillTxt: { fontSize: 10, fontWeight: '800', color: C.txt },
  billMeta: { color: C.txtSec, fontSize: 12, marginBottom: 8 },
  billLine: { color: C.txtSec, fontSize: 12, marginBottom: 2 },
  billTotal: { color: C.txt, fontSize: 15, fontWeight: '800', marginTop: 4 },
  payBtn: { backgroundColor: C.success + '22', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: C.success + '44' },
  payBtnTxt: { color: C.success, fontWeight: '800', fontSize: 13 },
  paidInfo: { color: C.success, fontSize: 12, marginTop: 8, textAlign: 'center' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: C.surf, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderWidth: 1, borderColor: C.bdr },
  modalTitle: { color: C.txt, fontWeight: '900', fontSize: 18, marginBottom: 4 },
  modalSub: { color: C.txtSec, fontSize: 13, marginBottom: 12 },
  noteInput: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.bdr, borderRadius: 12, padding: 12, color: C.txt, fontSize: 14, minHeight: 80, textAlignVertical: 'top' },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalCancel: { flex: 1, backgroundColor: C.surfHi, borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: C.bdr },
  modalCancelTxt: { color: C.txtSec, fontWeight: '700' },
  modalSave: { flex: 2, backgroundColor: C.accent, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  modalSaveTxt: { color: '#020617', fontWeight: '800', fontSize: 14 },
  payMethodRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  payMethodBtn: { flex: 1, backgroundColor: C.surfHi, borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: C.bdr },
  payMethodBtnActive: { backgroundColor: C.accent, borderColor: C.accent },
  payMethodTxt: { color: C.txtSec, fontSize: 11, fontWeight: '700' },
  payMethodTxtActive: { color: '#020617' },

  // Empty state
  empty: { alignItems: 'center', paddingVertical: 40, backgroundColor: C.surf, borderRadius: 16, borderWidth: 1, borderColor: C.bdr, marginTop: 8 },
  emptyIcon: { fontSize: 36, marginBottom: 12 },
  emptyTxt: { color: C.txtSec, fontSize: 13, textAlign: 'center', paddingHorizontal: 20 },
});
