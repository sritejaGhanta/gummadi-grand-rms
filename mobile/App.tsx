/**
 * RMS – Restaurant Management System
 * Mobile Application (React Native / Expo)
 *
 * Full Capability Feature Parity with Web Portal:
 * 1. Default to Cloud Production (https://dev.geoshcatechnologies.com/api)
 * 2. Instant Staff Login with Gummadi Grand Restaurant Branding
 * 3. Bulletproof Waiter / Staff Session (Tables, Menu POS, Search, Pagination, Serving)
 * 4. Real-time Audio Bells (Chef KOT Bell & Waiter Pickup Chime) + Vibration
 * 5. Real-time Menu Availability (Sold Out / 86) Sync
 * 6. Kitchen KDS with Elapsed Timers and Multi-step Preparation
 * 7. Manager Analytics Dashboard & Live Billing/Settlement
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Vibration,
  Animated,
} from 'react-native';
import io, { Socket } from 'socket.io-client';
import { Audio } from 'expo-av';

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
  rolePermissions?: Array<{ permission?: { key: string } }>;
}

interface AuthUser {
  id: string;
  username: string;
  name?: string;
  role?: UserRole;
  permissions?: string[];
}

type ActiveTab =
  | 'kitchen'
  | 'availability'
  | 'tables'
  | 'order'
  | 'serving'
  | 'dashboard'
  | 'billing';

interface ToastAlert {
  id: string;
  type: 'info' | 'success' | 'warning';
  title: string;
  message: string;
}

// ─────────────────────────────────────────────
//  API & Audio Helpers
// ─────────────────────────────────────────────
const CLOUD_PRODUCTION_URL = 'https://dev.geoshcatechnologies.com/api';

const PRESET_SERVERS = [
  { label: '🌐 Cloud Production', url: 'https://dev.geoshcatechnologies.com/api' },
  { label: '🏢 Office LAN Server', url: 'http://192.168.20.154:3001/api' },
  { label: '💻 Local Dev Host', url: 'http://192.168.20.131:3000/api' },
];

async function api(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: unknown,
  token?: string | null,
): Promise<{ success: boolean; data?: any; error?: string; latency?: number }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const latency = Date.now() - start;
    const json = await res.json();
    return { ...json, latency };
  } catch (e: any) {
    const latency = Date.now() - start;
    return { success: false, error: e?.message || 'Network connection failed', latency };
  }
}

let kitchenSound: Audio.Sound | null = null;
let waiterSound: Audio.Sound | null = null;

async function playKitchenChime() {
  try {
    Vibration.vibrate([0, 300, 150, 300]);
    if (!kitchenSound) {
      const { sound } = await Audio.Sound.createAsync(
        require('./assets/kitchen_bell.wav'),
        { shouldPlay: true },
      );
      kitchenSound = sound;
      kitchenSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          kitchenSound?.unloadAsync();
          kitchenSound = null;
        }
      });
    } else {
      await kitchenSound.replayAsync();
    }
  } catch (err) {
    console.log('Kitchen chime error:', err);
  }
}

async function playWaiterChime() {
  try {
    Vibration.vibrate(350);
    if (!waiterSound) {
      const { sound } = await Audio.Sound.createAsync(
        require('./assets/waiter_ready.wav'),
        { shouldPlay: true },
      );
      waiterSound = sound;
      waiterSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          waiterSound?.unloadAsync();
          waiterSound = null;
        }
      });
    } else {
      await waiterSound.replayAsync();
    }
  } catch (err) {
    console.log('Waiter chime error:', err);
  }
}

export default function App() {
  // ── Server & Auth State (Defaults directly to Cloud Production)
  const [serverUrl, setServerUrl] = useState(CLOUD_PRODUCTION_URL);
  const [serverModalVisible, setServerModalVisible] = useState(false);
  const [customServerInput, setCustomServerInput] = useState(CLOUD_PRODUCTION_URL);
  const [serverStatus, setServerStatus] = useState<null | 'ok' | 'fail'>(null);
  const [serverLatency, setServerLatency] = useState<number | null>(null);
  const [testingServer, setTestingServer] = useState(false);

  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // ── Real-Time Banner Toast
  const [toast, setToast] = useState<ToastAlert | null>(null);
  const toastAnim = useRef(new Animated.Value(-100)).current;

  // ── Dynamic Branding & Settings (Defaults to Gummadi Grand Restaurant)
  const [settings, setSettings] = useState<PublicSettings>({
    restaurant_name: 'Gummadi Grand Restaurant Eluru',
    restaurant_tagline: 'Fine Dining & Luxury Banquet • Eluru',
    currency_symbol: '₹',
    primary_color: '#d97706',
    tax_percentage: '5.0',
  });

  // ── Navigation Tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('tables');

  // ── Waiter: Floors & Tables
  const [floors, setFloors] = useState<any[]>([]);
  const [selectedFloorId, setSelectedFloorId] = useState('');
  const [tables, setTables] = useState<any[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [selectedTable, setSelectedTable] = useState<any | null>(null);

  // ── Waiter: Menu, Search, Filter & Pagination
  const [categories, setCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [dietFilter, setDietFilter] = useState<'all' | 'veg' | 'non-veg'>('all');
  const [menuPage, setMenuPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  // ── Waiter: Cart & Active Order
  const [cart, setCart] = useState<Record<string, { item: any; qty: number; note: string }>>({});
  const [activeOrder, setActiveOrder] = useState<any | null>(null);
  const [requestingBill, setRequestingBill] = useState(false);

  // Custom Item Note Modal
  const [noteModalItem, setNoteModalItem] = useState<any | null>(null);
  const [noteModalText, setNoteModalText] = useState('');

  // ── Chef: Kitchen KDS
  const [kitchenTasks, setKitchenTasks] = useState<any[]>([]);
  const [loadingKitchen, setLoadingKitchen] = useState(false);
  const [refreshingKitchen, setRefreshingKitchen] = useState(false);
  const [kdsFilter, setKdsFilter] = useState<'all' | 'pending' | 'cooking'>('all');

  // ── Chef/Manager: Menu Availability (Sold Out / 86)
  const [availItems, setAvailItems] = useState<any[]>([]);
  const [loadingAvail, setLoadingAvail] = useState(false);
  const [availSearch, setAvailSearch] = useState('');

  // ── Waiter: Serving / Delivery Tracking
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [loadingServing, setLoadingServing] = useState(false);
  const [refreshingServing, setRefreshingServing] = useState(false);
  const [servingFilter, setServingFilter] = useState<'ready' | 'preparing' | 'delivered' | 'all'>('ready');

  // ── Manager: Dashboard Analytics
  const [dashData, setDashData] = useState<any | null>(null);
  const [loadingDash, setLoadingDash] = useState(false);
  const [refreshingDash, setRefreshingDash] = useState(false);

  // ── Manager: Billing
  const [bills, setBills] = useState<any[]>([]);
  const [billableOrders, setBillableOrders] = useState<any[]>([]);
  const [loadingBilling, setLoadingBilling] = useState(false);
  const [payModal, setPayModal] = useState<any | null>(null);
  const [payMethod, setPayMethod] = useState<'CASH' | 'UPI' | 'CARD'>('CASH');

  // Audio setup on mount
  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    }).catch(() => {});
  }, []);

  // Show Toast Notification
  const triggerToast = (type: 'info' | 'success' | 'warning', title: string, message: string) => {
    setToast({ id: String(Date.now()), type, title, message });
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 16, duration: 250, useNativeDriver: true }),
      Animated.delay(4500),
      Animated.timing(toastAnim, { toValue: -120, duration: 250, useNativeDriver: true }),
    ]).start(() => setToast(null));
  };

  // Load public settings when server URL changes
  useEffect(() => {
    if (serverUrl) {
      (async () => {
        const res = await api(`${serverUrl}/settings/public`);
        if (res.success && res.data) {
          setSettings((prev) => ({ ...prev, ...res.data }));
        }
      })();
    }
  }, [serverUrl]);

  // ─────────────────────────────────────────────
  //  WebSocket Real-Time Event Handlers
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!token || !user) return;
    const socketUrl = serverUrl.replace(/\/api\/?$/, '');
    const socket: Socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
    });

    socket.on('connect', () => {
      const rName = user.role?.name || (user as any).role || '';
      if (rName) socket.emit('joinRoleRoom', rName);
    });

    socket.on('kitchen:new_order', (data: any) => {
      const rName = (user.role?.name || (user as any).role || '').toLowerCase();
      if (rName === 'chef' || rName === 'admin') {
        playKitchenChime();
        triggerToast(
          'warning',
          '🔥 NEW KOT ORDER!',
          `Table ${data?.table?.tableNumber || data?.tableNumber || 'Takeaway'} • Order #${data?.orderNumber || ''}`,
        );
      }
      loadKitchen();
      loadServing();
      loadDashboard();
    });

    socket.on('order:created', () => {
      loadServing();
      loadKitchen();
      loadDashboard();
      if (selectedFloorId) loadTables(selectedFloorId);
    });

    socket.on('order:item_ready', (item: any) => {
      const rName = (user.role?.name || (user as any).role || '').toLowerCase();
      if (rName === 'waiter' || rName === 'staff' || rName === 'admin') {
        playWaiterChime();
        triggerToast(
          'success',
          '🛎️ DISH READY TO SERVE!',
          `${item?.foodItem?.name || item?.foodItemName || 'Dish'} is ready for pickup!`,
        );
      }
      loadServing();
      if (selectedTable) loadActiveOrder(selectedTable.id);
    });

    socket.on('order:item_status_changed', (item: any) => {
      if (item.status === 'READY') {
        const rName = (user.role?.name || (user as any).role || '').toLowerCase();
        if (rName === 'waiter' || rName === 'staff' || rName === 'admin') {
          playWaiterChime();
          triggerToast(
            'success',
            '🛎️ DISH READY TO SERVE!',
            `${item?.foodItem?.name || 'Dish'} is ready for Table!`,
          );
        }
      }
      loadKitchen();
      loadServing();
      if (selectedTable) loadActiveOrder(selectedTable.id);
    });

    socket.on('menu:availability_updated', (data: any) => {
      if (data?.foodItemId) {
        setMenuItems((prev) =>
          prev.map((it) =>
            it.id === data.foodItemId
              ? { ...it, availability: { ...(it.availability || {}), isAvailable: data.isAvailable } }
              : it,
          ),
        );
        setAvailItems((prev) =>
          prev.map((it) =>
            it.id === data.foodItemId
              ? { ...it, availability: { ...(it.availability || {}), isAvailable: data.isAvailable } }
              : it,
          ),
        );
        triggerToast(
          'info',
          data.isAvailable ? '✅ Menu Updated' : '🚫 Food Sold Out',
          `"${data.foodItemName || 'Item'}" marked as ${data.isAvailable ? 'Available' : 'Sold Out / 86'}.`,
        );
      }
    });

    socket.on('billing:requested', (data: any) => {
      const rName = (user.role?.name || (user as any).role || '').toLowerCase();
      if (rName === 'manager' || rName === 'admin') {
        triggerToast('warning', '🧾 Bill Requested!', `Waiter requested bill for Table ${data?.tableNumber || ''}.`);
        loadBilling();
        loadDashboard();
      }
      if (selectedFloorId) loadTables(selectedFloorId);
    });

    socket.on('billing:paid', () => {
      loadBilling();
      loadDashboard();
      if (selectedFloorId) loadTables(selectedFloorId);
      if (selectedTable) loadActiveOrder(selectedTable.id);
    });

    socket.on('table:status_updated', () => {
      if (selectedFloorId) loadTables(selectedFloorId);
    });

    socket.on('settings:updated', (data: any) => {
      if (data) setSettings((prev) => ({ ...prev, ...data }));
    });

    return () => {
      socket.disconnect();
    };
  }, [token, user, serverUrl, selectedTable?.id, selectedFloorId]);

  // ─────────────────────────────────────────────
  //  Server Test Helper
  // ─────────────────────────────────────────────
  const testServerUrl = async (targetUrl: string) => {
    setTestingServer(true);
    setServerStatus(null);
    setServerLatency(null);
    const cleanUrl = targetUrl.trim().replace(/\/+$/, '');
    const res = await api(`${cleanUrl}/settings/public`);
    setTestingServer(false);
    if (res.success && res.data) {
      setServerStatus('ok');
      setServerLatency(res.latency ?? 40);
      setSettings((prev) => ({ ...prev, ...res.data }));
      setServerUrl(cleanUrl);
      return true;
    } else {
      setServerStatus('fail');
      return false;
    }
  };

  // ─────────────────────────────────────────────
  //  Staff Authentication
  // ─────────────────────────────────────────────
  const handleLogin = async () => {
    if (!loginUsername.trim() || !loginPassword.trim()) {
      Alert.alert('Required', 'Please enter your username and password.');
      return;
    }
    setLoggingIn(true);
    const cleanUrl = serverUrl.trim().replace(/\/+$/, '');
    const res = await api(`${cleanUrl}/auth/login`, 'POST', {
      username: loginUsername.trim(),
      password: loginPassword,
    });
    setLoggingIn(false);

    if (res.success && res.data?.accessToken) {
      const tok: string = res.data.accessToken;
      const usr: AuthUser = res.data.user;

      // Extract all permission keys robustly
      const perms = new Set<string>();
      if (Array.isArray(usr.permissions)) {
        usr.permissions.forEach((k: string) => perms.add(k));
      }
      if (Array.isArray(usr.role?.rolePermissions)) {
        usr.role.rolePermissions.forEach((rp: any) => {
          if (rp.permission?.key) perms.add(rp.permission.key);
        });
      }
      const roleName = (usr.role?.name || (usr as any).role || '').toLowerCase();
      if (roleName === 'admin') {
        ['kitchen.view', 'menu.availability.update', 'tables.manage', 'orders.create', 'orders.view', 'orders.update', 'reports.view', 'billing.view', 'menu.view'].forEach((k) => perms.add(k));
      } else if (roleName === 'staff' || roleName === 'waiter') {
        ['tables.manage', 'orders.create', 'orders.view', 'orders.update', 'menu.view', 'billing.view'].forEach((k) => perms.add(k));
      } else if (roleName === 'chef') {
        ['kitchen.view', 'kitchen.accept', 'kitchen.prepare', 'kitchen.mark_ready', 'menu.availability.update', 'menu.view'].forEach((k) => perms.add(k));
      } else if (roleName === 'manager') {
        ['reports.view', 'billing.view', 'tables.manage', 'orders.view', 'menu.view', 'menu.availability.update'].forEach((k) => perms.add(k));
      }

      setToken(tok);
      setUser(usr);

      // Route to correct starting view
      if (perms.has('kitchen.view') && !perms.has('tables.manage')) {
        setActiveTab('kitchen');
        loadKitchen(tok);
      } else if (perms.has('reports.view') && !perms.has('tables.manage')) {
        setActiveTab('dashboard');
        loadDashboard(tok);
      } else {
        // Waiter / Staff / Admin start on Tables
        setActiveTab('tables');
        loadFloors(tok);
        loadMenu(tok);
      }
    } else {
      const msg = res.error ?? '';
      if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch')) {
        Alert.alert('Network Error', `Cannot reach server at:\n${serverUrl}\n\nPlease check Wi-Fi/Internet connection.`);
      } else {
        Alert.alert('Login Failed', 'Invalid username or password.');
      }
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out of the POS system?', [
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
  //  Data Loaders
  // ─────────────────────────────────────────────
  const loadFloors = async (tok = token) => {
    setLoadingTables(true);
    const res = await api(`${serverUrl}/floors`, 'GET', undefined, tok);
    if (res.success && Array.isArray(res.data) && res.data.length > 0) {
      setFloors(res.data);
      const fid = res.data[0].id;
      setSelectedFloorId(fid);
      if (Array.isArray(res.data[0].tables) && res.data[0].tables.length > 0) {
        setTables(res.data[0].tables);
        setLoadingTables(false);
      } else {
        await loadTables(fid, tok);
      }
    } else {
      setLoadingTables(false);
    }
  };

  const loadTables = async (floorId: string, tok = token) => {
    setLoadingTables(true);
    const res = await api(`${serverUrl}/tables?floorId=${floorId}`, 'GET', undefined, tok);
    setLoadingTables(false);
    if (res.success && Array.isArray(res.data)) {
      setTables(res.data);
      if (selectedTable) {
        const fresh = res.data.find((t: any) => t.id === selectedTable.id);
        if (fresh) setSelectedTable(fresh);
      }
    }
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
      const active = ordersR.data.filter(
        (o: any) =>
          o.status === 'ACTIVE' ||
          o.status === 'BILLING' ||
          o.table?.status === 'BILLING',
      );
      active.sort((a: any, b: any) => {
        const aReq = a.table?.status === 'BILLING' ? 1 : 0;
        const bReq = b.table?.status === 'BILLING' ? 1 : 0;
        return bReq - aReq;
      });
      const uniqueOrders = Array.from(new Map(active.map((o: any) => [o.id, o])).values());
      setBillableOrders(uniqueOrders);
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
    const isSoldOut = item.availability && !item.availability.isAvailable;
    if (isSoldOut) {
      Alert.alert('Sold Out / 86', `"${item.name}" is currently sold out and cannot be ordered.`);
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
      Alert.alert('No Table Selected', 'Please select a table from the Tables tab first.');
      return;
    }
    const items = Object.values(cart).map((c) => ({
      foodItemId: c.item.id,
      quantity: c.qty,
      specialInstructions: c.note || undefined,
    }));
    if (!items.length) {
      Alert.alert('Empty Cart', 'Please add items to cart before sending to kitchen.');
      return;
    }

    const res = await api(`${serverUrl}/orders`, 'POST', { tableId: selectedTable.id, items }, token);
    if (res.success) {
      triggerToast('success', '🍳 KOT Placed!', `Order sent to kitchen for Table ${selectedTable.tableNumber}`);
      setCart({});
      setActiveOrder(res.data);
      loadTables(selectedFloorId);
      loadServing();
    } else {
      Alert.alert('Order Failed', res.error ?? 'Could not place order.');
    }
  };

  const markDelivered = async (itemId: string, name?: string) => {
    const res = await api(`${serverUrl}/orders/items/${itemId}/deliver`, 'PUT', undefined, token);
    if (res.success) {
      triggerToast('success', 'Served ✅', `"${name ?? 'Item'}" marked as served.`);
      loadServing();
      if (selectedTable) loadActiveOrder(selectedTable.id);
    } else {
      Alert.alert('Error', res.error ?? 'Failed to update item status.');
    }
  };

  const cancelOrderItem = (itemId: string, name?: string) => {
    Alert.alert(
      'Cancel Item?',
      `Are you sure you want to cancel "${name || 'Item'}" from this table's order?`,
      [
        { text: 'Keep Item', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            const res = await api(
              `${serverUrl}/orders/items/${itemId}/cancel`,
              'PUT',
              { reason: 'Customer requested cancellation' },
              token,
            );
            if (res.success) {
              triggerToast('info', 'Item Cancelled', `"${name || 'Item'}" cancelled.`);
              if (selectedTable) loadActiveOrder(selectedTable.id);
              if (selectedFloorId) loadTables(selectedFloorId);
            } else {
              Alert.alert('Error', res.error ?? 'Could not cancel item.');
            }
          },
        },
      ],
    );
  };

  const requestBill = async () => {
    if (!selectedTable || requestingBill) return;
    if (selectedTable.status === 'BILLING' || activeOrder?.table?.status === 'BILLING') {
      Alert.alert('Bill Already Requested', 'The manager has already been notified.');
      return;
    }
    setRequestingBill(true);
    try {
      const res = await api(`${serverUrl}/orders/tables/${selectedTable.id}/request-bill`, 'POST', undefined, token);
      if (res.success) {
        triggerToast('warning', '🧾 Bill Requested', `Manager notified for Table ${selectedTable.tableNumber}`);
        setSelectedTable((prev: any) => (prev ? { ...prev, status: 'BILLING' } : null));
        loadActiveOrder(selectedTable.id);
        if (selectedFloorId) loadTables(selectedFloorId);
      } else {
        Alert.alert('Notice', res.error ?? 'Could not request bill.');
      }
    } finally {
      setRequestingBill(false);
    }
  };

  // ─────────────────────────────────────────────
  //  Actions – Chef
  // ─────────────────────────────────────────────
  const kitchenAction = async (taskId: string, action: 'accept' | 'prepare' | 'ready', name?: string) => {
    const res = await api(`${serverUrl}/kitchen/items/${taskId}/${action}`, 'PUT', undefined, token);
    if (res.success) {
      if (action === 'ready') {
        playWaiterChime();
        triggerToast('success', '🔔 Order Ready!', `"${name}" marked as ready for waiter pickup.`);
      } else {
        triggerToast('info', 'KDS Updated', `"${name}" status changed to ${action}.`);
      }
      loadKitchen();
    } else {
      Alert.alert('Error', res.error ?? 'Could not update kitchen task.');
    }
  };

  const toggleAvailability = (item: any) => {
    const isAvail = item.availability?.isAvailable ?? true;
    const newVal = !isAvail;
    Alert.alert(
      `Mark as ${newVal ? 'Available' : 'Sold Out / 86'}?`,
      `"${item.name}" will be marked as ${newVal ? '✅ Available' : '❌ Sold Out'}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: newVal ? 'default' : 'destructive',
          onPress: async () => {
            const res = await api(
              `${serverUrl}/menu/items/${item.id}/availability`,
              'PUT',
              { isAvailable: newVal },
              token,
            );
            if (res.success) {
              triggerToast('info', 'Availability Updated', `"${item.name}" is now ${newVal ? 'Available' : 'Sold Out'}.`);
              loadAvailability();
              loadMenu();
            } else {
              Alert.alert('Error', res.error ?? 'Failed to update availability.');
            }
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
    if (res.success) {
      triggerToast('success', 'Bill Generated', `Bill #${res.data?.billNumber ?? ''} created successfully.`);
      loadBilling();
    } else {
      Alert.alert('Error', res.error ?? 'Could not generate bill.');
    }
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
      triggerToast('success', 'Payment Settled', `${settings.currency_symbol}${payAmt.toFixed(2)} received via ${payMethod}.`);
      setPayModal(null);
      loadBilling();
      loadDashboard();
      if (selectedFloorId) loadTables(selectedFloorId);
    } else {
      Alert.alert('Error', res.error ?? 'Payment settlement failed.');
    }
  };

  // ─────────────────────────────────────────────
  //  Permission Helpers
  // ─────────────────────────────────────────────
  const cur = settings.currency_symbol || '₹';
  const taxPct = +(settings.tax_percentage || 5);

  const userPerms = useMemo(() => {
    const keys = new Set<string>();
    if (Array.isArray(user?.permissions)) {
      user.permissions.forEach((k: string) => keys.add(k));
    }
    if (Array.isArray(user?.role?.rolePermissions)) {
      user.role.rolePermissions.forEach((rp: any) => {
        if (rp.permission?.key) keys.add(rp.permission.key);
      });
    }
    const rName = (user?.role?.name || (user as any)?.role || '').toLowerCase();
    if (rName === 'admin') {
      ['kitchen.view', 'menu.availability.update', 'tables.manage', 'orders.create', 'orders.view', 'orders.update', 'reports.view', 'billing.view', 'menu.view'].forEach((k) => keys.add(k));
    } else if (rName === 'staff' || rName === 'waiter') {
      ['tables.manage', 'orders.create', 'orders.view', 'orders.update', 'menu.view', 'billing.view'].forEach((k) => keys.add(k));
    } else if (rName === 'chef') {
      ['kitchen.view', 'kitchen.accept', 'kitchen.prepare', 'kitchen.mark_ready', 'menu.availability.update', 'menu.view'].forEach((k) => keys.add(k));
    } else if (rName === 'manager') {
      ['reports.view', 'billing.view', 'tables.manage', 'orders.view', 'menu.view', 'menu.availability.update'].forEach((k) => keys.add(k));
    }
    return keys;
  }, [user]);

  const can = (key: string) => userPerms.has(key);

  const showKitchen = can('kitchen.view');
  const showAvailability = can('menu.availability.update');
  const showTables = can('tables.manage');
  const showOrder = can('orders.create');
  const showServing = can('orders.update');
  const showDashboard = can('reports.view');
  const showBilling = can('billing.view');

  // Waiter Menu Filtering, Search & Pagination
  const filteredMenu = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return menuItems.filter((item) => {
      const matchesCat = selectedCategory === 'all' || item.categoryId === selectedCategory;
      const matchesDiet =
        dietFilter === 'all' ||
        (dietFilter === 'veg' && item.isVeg === true) ||
        (dietFilter === 'non-veg' && item.isVeg === false);
      const matchesSearch =
        !q ||
        item.name?.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.category?.name && item.category.name.toLowerCase().includes(q));
      return matchesCat && matchesDiet && matchesSearch;
    });
  }, [menuItems, selectedCategory, dietFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredMenu.length / ITEMS_PER_PAGE));
  const paginatedMenu = useMemo(() => {
    const start = (menuPage - 1) * ITEMS_PER_PAGE;
    return filteredMenu.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredMenu, menuPage]);

  // Cart Calculations
  const cartEntries = Object.values(cart);
  const cartSubtotal = cartEntries.reduce((s, c) => s + c.item.price * c.qty, 0);
  const cartTax = (cartSubtotal * taxPct) / 100;
  const cartTotal = cartSubtotal + cartTax;
  const cartCount = cartEntries.reduce((s, c) => s + c.qty, 0);

  // Serving Tracker Items
  const allItems: Array<{ order: any; item: any }> = [];
  allOrders.forEach((o) => o.items?.forEach((it: any) => allItems.push({ order: o, item: it })));

  const servingItems = allItems.filter(({ item }) => {
    if (servingFilter === 'ready') return item.status === 'READY';
    if (servingFilter === 'delivered') return item.status === 'DELIVERED';
    if (servingFilter === 'preparing') return ['PENDING', 'ACCEPTED', 'PREPARING'].includes(item.status);
    return true;
  });

  const filteredKitchenTasks = kitchenTasks.filter((task) => {
    if (kdsFilter === 'pending') return task.status === 'PENDING';
    if (kdsFilter === 'cooking') return task.status === 'ACCEPTED' || task.status === 'PREPARING';
    return true;
  });

  const filteredAvailItems = availItems.filter((item) => {
    if (!availSearch.trim()) return true;
    const q = availSearch.trim().toLowerCase();
    return item.name?.toLowerCase().includes(q) || item.category?.name?.toLowerCase().includes(q);
  });

  // ─────────────────────────────────────────────
  //  RENDER: Staff Sign In Screen
  // ─────────────────────────────────────────────
  if (!token || !user) {
    const cleanHost = serverUrl.replace(/^https?:\/\//, '').replace(/\/api\/?$/, '');
    return (
      <SafeAreaView style={S.safe}>
        <StatusBar barStyle="light-content" backgroundColor="#050a14" />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={S.loginScroll} keyboardShouldPersistTaps="handled">
            {/* Brand Logo Header */}
            <View style={S.loginBrand}>
              <Text style={S.loginIcon}>🍽️</Text>
              <Text style={S.loginName}>{settings.restaurant_name}</Text>
              <Text style={S.loginTagline}>{settings.restaurant_tagline}</Text>
              <View style={S.stepBadge}>
                <Text style={S.stepBadgeTxt}>STAFF PORTAL ACCESS</Text>
              </View>
            </View>

            {/* Credentials Card */}
            <Card title="SIGN IN">
              <Text style={S.label}>STAFF USERNAME</Text>
              <TextInput
                style={S.input}
                value={loginUsername}
                onChangeText={setLoginUsername}
                placeholder="e.g. waiter, chef, manager"
                placeholderTextColor="#334155"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={[S.label, { marginTop: 12 }]}>PASSWORD</Text>
              <TextInput
                style={S.input}
                value={loginPassword}
                onChangeText={setLoginPassword}
                secureTextEntry
                placeholder="••••••"
                placeholderTextColor="#334155"
              />
              <TouchableOpacity
                style={[S.primaryBtn, loggingIn && { opacity: 0.6 }]}
                onPress={handleLogin}
                disabled={loggingIn}
              >
                {loggingIn ? (
                  <ActivityIndicator color="#020617" />
                ) : (
                  <Text style={S.primaryBtnTxt}>Sign In to RMS →</Text>
                )}
              </TouchableOpacity>
            </Card>

            {/* Quick 1-Click Role Logins */}
            <View style={S.quickCard}>
              <Text style={S.quickLabel}>QUICK DEMO LOGINS</Text>
              <View style={S.quickGrid}>
                {[
                  { l: '🛎️ Waiter', u: 'waiter', p: 'waiter123' },
                  { l: '👨‍🍳 Chef', u: 'chef', p: 'chef123' },
                  { l: '📊 Manager', u: 'manager', p: 'manager123' },
                  { l: '👑 Admin', u: 'admin', p: 'admin123' },
                ].map((r) => (
                  <TouchableOpacity
                    key={r.u}
                    style={S.quickChip}
                    onPress={() => {
                      setLoginUsername(r.u);
                      setLoginPassword(r.p);
                    }}
                  >
                    <Text style={S.quickChipTxt}>{r.l}</Text>
                    <Text style={S.quickChipSub}>{r.u}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Subtle Server Switcher at Bottom */}
            <TouchableOpacity
              style={S.bottomServerBar}
              onPress={() => {
                setCustomServerInput(serverUrl);
                setServerModalVisible(true);
              }}
            >
              <View style={S.dotGreen} />
              <Text style={S.bottomServerTxt} numberOfLines={1}>
                Server: {cleanHost}
              </Text>
              <Text style={S.changeServerTxt}>⚙️ Configure</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Server Configuration Modal */}
        <Modal
          visible={serverModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setServerModalVisible(false)}
        >
          <View style={S.modalOverlay}>
            <View style={S.modalCard}>
              <Text style={S.modalTitle}>Configure Server Endpoint</Text>
              <Text style={S.modalSub}>Select or enter the backend REST API URL</Text>

              <TextInput
                style={S.input}
                value={customServerInput}
                onChangeText={(v) => {
                  setCustomServerInput(v);
                  setServerStatus(null);
                }}
                placeholder="https://dev.geoshcatechnologies.com/api"
                placeholderTextColor="#475569"
                autoCapitalize="none"
              />

              <View style={{ marginTop: 10 }}>
                {PRESET_SERVERS.map((preset) => (
                  <TouchableOpacity
                    key={preset.url}
                    style={[S.presetBtn, customServerInput === preset.url && S.presetBtnActive]}
                    onPress={() => {
                      setCustomServerInput(preset.url);
                      setServerStatus(null);
                    }}
                  >
                    <Text style={[S.presetTxt, customServerInput === preset.url && S.presetTxtActive]}>
                      {preset.label}
                    </Text>
                    <Text style={S.presetUrl}>{preset.url}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {serverStatus === 'ok' && (
                <Text style={{ color: C.success, fontSize: 11, marginTop: 8 }}>
                  🟢 Reachable! Latency: {serverLatency}ms
                </Text>
              )}
              {serverStatus === 'fail' && (
                <Text style={{ color: C.danger, fontSize: 11, marginTop: 8 }}>
                  🔴 Unreachable endpoint. Check network/URL.
                </Text>
              )}

              <View style={S.modalBtns}>
                <TouchableOpacity
                  style={S.modalCancel}
                  onPress={() => setServerModalVisible(false)}
                >
                  <Text style={S.modalCancelTxt}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[S.modalSave, { backgroundColor: C.info }]}
                  onPress={() => testServerUrl(customServerInput)}
                  disabled={testingServer}
                >
                  {testingServer ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={[S.modalSaveTxt, { color: '#fff' }]}>Test Ping</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={S.modalSave}
                  onPress={() => {
                    setServerUrl(customServerInput.trim().replace(/\/+$/, ''));
                    setServerModalVisible(false);
                  }}
                >
                  <Text style={S.modalSaveTxt}>Save URL</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────
  //  RENDER: Main Application Portal
  // ─────────────────────────────────────────────
  return (
    <SafeAreaView style={S.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#050a14" />

      {/* Real-Time Toast Notification Banner */}
      {toast && (
        <Animated.View
          style={[
            S.toastContainer,
            toast.type === 'success' && S.toastSuccess,
            toast.type === 'warning' && S.toastWarning,
            toast.type === 'info' && S.toastInfo,
            { transform: [{ translateY: toastAnim }] },
          ]}
        >
          <TouchableOpacity style={S.toastInner} onPress={() => setToast(null)} activeOpacity={0.8}>
            <View style={{ flex: 1 }}>
              <Text style={S.toastTitle}>{toast.title}</Text>
              <Text style={S.toastMessage}>{toast.message}</Text>
            </View>
            <Text style={S.toastClose}>✕</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* App Header */}
      <View style={S.header}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={S.headerTitle} numberOfLines={1}>
            {settings.restaurant_name}
          </Text>
          <View style={S.headerMeta}>
            <Text style={S.headerUser}>👤 {user?.name || user?.username || 'Staff'}</Text>
            <View style={S.rolePill}>
              <Text style={S.rolePillTxt}>{user?.role?.displayName || user?.role?.name || 'Staff'}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity style={S.logoutBtn} onPress={handleLogout}>
          <Text style={S.logoutTxt}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Navigation Tabs */}
      <View style={S.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.tabBarInner}>
          {showTables && (
            <Tab
              label="🪑 Tables"
              tab="tables"
              active={activeTab}
              onPress={() => {
                setActiveTab('tables');
                if (selectedFloorId) loadTables(selectedFloorId);
              }}
            />
          )}
          {showOrder && (
            <Tab
              label={cartCount > 0 ? `📝 Order (${cartCount})` : '📝 Order'}
              tab="order"
              active={activeTab}
              onPress={() => {
                setActiveTab('order');
                if (selectedTable) loadActiveOrder(selectedTable.id);
              }}
            />
          )}
          {showServing && (
            <Tab
              label="🛎️ Serve"
              tab="serving"
              active={activeTab}
              onPress={() => {
                setActiveTab('serving');
                loadServing();
              }}
            />
          )}
          {showKitchen && (
            <Tab
              label={`🔥 Kitchen KDS (${kitchenTasks.filter((t) => t.status !== 'DELIVERED').length})`}
              tab="kitchen"
              active={activeTab}
              onPress={() => {
                setActiveTab('kitchen');
                loadKitchen();
              }}
            />
          )}
          {showAvailability && (
            <Tab
              label="📋 Menu 86"
              tab="availability"
              active={activeTab}
              onPress={() => {
                setActiveTab('availability');
                loadAvailability();
              }}
            />
          )}
          {showDashboard && (
            <Tab
              label="📊 Dashboard"
              tab="dashboard"
              active={activeTab}
              onPress={() => {
                setActiveTab('dashboard');
                loadDashboard();
              }}
            />
          )}
          {showBilling && (
            <Tab
              label={billableOrders.length > 0 ? `🧾 Billing (${billableOrders.length})` : '🧾 Billing'}
              tab="billing"
              active={activeTab}
              onPress={() => {
                setActiveTab('billing');
                loadBilling();
              }}
            />
          )}
        </ScrollView>
      </View>

      {/* ══════════════════════════════════════════════
          WAITER ▶ Floors & Tables Tab
      ══════════════════════════════════════════════ */}
      {showTables && activeTab === 'tables' && (
        <ScrollView style={S.content}>
          {floors && floors.length > 0 && (
            <>
              <Text style={S.label}>FLOOR / SECTION</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.chipRow}>
                {floors.map((f) => (
                  <TouchableOpacity
                    key={f.id}
                    style={[S.chip, selectedFloorId === f.id && S.chipActive]}
                    onPress={() => {
                      setSelectedFloorId(f.id);
                      if (Array.isArray(f.tables) && f.tables.length > 0) {
                        setTables(f.tables);
                      } else {
                        loadTables(f.id);
                      }
                    }}
                  >
                    <Text style={[S.chipTxt, selectedFloorId === f.id && S.chipTxtActive]}>
                      {f.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          <View style={S.sectionRow}>
            <Text style={S.sectionTitle}>Tables Grid</Text>
            <TouchableOpacity style={S.refreshBtn} onPress={() => loadTables(selectedFloorId)}>
              <Text style={S.refreshTxt}>🔄 Refresh</Text>
            </TouchableOpacity>
          </View>

          {loadingTables && (!tables || tables.length === 0) ? (
            <Loader />
          ) : !tables || tables.length === 0 ? (
            <Empty icon="🪑" msg="No tables configured on this floor." />
          ) : (
            <View style={S.tablesGrid}>
              {tables.map((t) => {
                const isSelected = selectedTable?.id === t.id;
                const tColor =
                  t.status === 'OCCUPIED'
                    ? '#f59e0b'
                    : t.status === 'BILLING'
                    ? '#3b82f6'
                    : t.status === 'RESERVED'
                    ? '#8b5cf6'
                    : '#22c55e';
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[S.tableCard, { borderColor: tColor }, isSelected && S.tableCardSelected]}
                    onPress={() => selectTable(t)}
                  >
                    <Text style={S.tableNum}>Table {t.tableNumber}</Text>
                    <Text style={S.tableSeats}>👥 {t.seatingCapacity} Seats</Text>
                    <View style={[S.tableStatusPill, { backgroundColor: tColor + '25', borderColor: tColor }]}>
                      <Text style={[S.tableStatusTxt, { color: tColor }]}>
                        {t.status === 'AVAILABLE'
                          ? 'Available'
                          : t.status === 'OCCUPIED'
                          ? 'Occupied'
                          : t.status === 'BILLING'
                          ? '🧾 Bill Req'
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

      {/* ══════════════════════════════════════════════
          WAITER ▶ Menu & Order Taking Tab
      ══════════════════════════════════════════════ */}
      {showOrder && activeTab === 'order' && (
        <View style={{ flex: 1 }}>
          <View style={[S.tableBanner, !selectedTable && S.tableBannerWarn]}>
            {selectedTable ? (
              <Text style={S.tableBannerTxt}>
                📍 Table {selectedTable.tableNumber}
                {activeOrder ? `  •  Running Order #${activeOrder.orderNumber}` : '  •  New Order'}
              </Text>
            ) : (
              <Text style={S.tableBannerWarnTxt}>
                ⚠️ No table selected! Please choose a table in the Tables tab.
              </Text>
            )}
          </View>

          <ScrollView style={S.content}>
            {activeOrder && (
              <View style={S.activeOrderBox}>
                <View style={S.activeOrderHeader}>
                  <Text style={S.activeOrderTitle}>🍽️ Running Order #{activeOrder.orderNumber}</Text>
                  <Text style={S.activeOrderTotal}>
                    {cur}{(+activeOrder.totalAmount || 0).toFixed(2)}
                  </Text>
                </View>

                {activeOrder.items?.map((it: any) => {
                  const isReady = it.status === 'READY';
                  const isDone = it.status === 'DELIVERED';
                  const isCancelled = it.status === 'CANCELLED';
                  return (
                    <View key={it.id} style={[S.activeOrderRow, isCancelled && { opacity: 0.5 }]}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={[S.activeItemName, isCancelled && { textDecorationLine: 'line-through', color: '#94a3b8' }]}>
                          {it.quantity}× {it.foodItem?.name}
                        </Text>
                        <Text
                          style={[
                            S.activeItemStatus,
                            isReady && S.txtReady,
                            isDone && S.txtDone,
                            isCancelled && { color: '#f87171' },
                          ]}
                        >
                          {isCancelled
                            ? '❌ Cancelled'
                            : isDone
                            ? '✅ Served to table'
                            : isReady
                            ? '🔔 Ready — serve now!'
                            : `⏳ ${it.status}`}
                        </Text>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {isReady && !isCancelled && (
                          <TouchableOpacity style={S.serveSmall} onPress={() => markDelivered(it.id, it.foodItem?.name)}>
                            <Text style={S.serveSmallTxt}>Serve</Text>
                          </TouchableOpacity>
                        )}
                        {!isDone && !isCancelled && (
                          <TouchableOpacity style={S.cancelItemSmall} onPress={() => cancelOrderItem(it.id, it.foodItem?.name)}>
                            <Text style={S.cancelItemTxt}>✕</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}

                {(() => {
                  const isBillReq = selectedTable?.status === 'BILLING' || activeOrder?.table?.status === 'BILLING';
                  if (!isBillReq) {
                    return (
                      <TouchableOpacity
                        style={[S.reqBillBtn, requestingBill && { opacity: 0.6 }]}
                        onPress={requestBill}
                        disabled={requestingBill}
                      >
                        <Text style={S.reqBillTxt}>
                          {requestingBill ? '⏳ Requesting...' : '🧾 Request Bill from Manager'}
                        </Text>
                      </TouchableOpacity>
                    );
                  }
                  return (
                    <View style={S.billingNote}>
                      <Text style={S.billingNoteTxt}>🧾 Bill requested — Cashier/Manager has been alerted.</Text>
                    </View>
                  );
                })()}
              </View>
            )}

            <Text style={S.label}>SEARCH MENU DISHES</Text>
            <View style={S.searchContainer}>
              <TextInput
                style={S.searchInput}
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  setMenuPage(1);
                }}
                placeholder="🔍 Search dish name, description, ingredients..."
                placeholderTextColor="#475569"
                autoCapitalize="none"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery('');
                    setMenuPage(1);
                  }}
                  style={S.clearSearchBtn}
                >
                  <Text style={S.clearSearchTxt}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={S.dietRow}>
              <TouchableOpacity
                style={[S.dietChip, dietFilter === 'all' && S.dietChipActive]}
                onPress={() => {
                  setDietFilter('all');
                  setMenuPage(1);
                }}
              >
                <Text style={[S.dietChipTxt, dietFilter === 'all' && S.dietChipTxtActive]}>All Menu</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[S.dietChip, dietFilter === 'veg' && S.dietChipVegActive]}
                onPress={() => {
                  setDietFilter('veg');
                  setMenuPage(1);
                }}
              >
                <Text style={[S.dietChipTxt, dietFilter === 'veg' && { color: '#fff', fontWeight: '800' }]}>
                  🟢 Pure Veg
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[S.dietChip, dietFilter === 'non-veg' && S.dietChipNonVegActive]}
                onPress={() => {
                  setDietFilter('non-veg');
                  setMenuPage(1);
                }}
              >
                <Text style={[S.dietChipTxt, dietFilter === 'non-veg' && { color: '#fff', fontWeight: '800' }]}>
                  🔴 Non-Veg
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={S.label}>CATEGORIES</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.chipRow}>
              <TouchableOpacity
                style={[S.chip, selectedCategory === 'all' && S.chipActive]}
                onPress={() => {
                  setSelectedCategory('all');
                  setMenuPage(1);
                }}
              >
                <Text style={[S.chipTxt, selectedCategory === 'all' && S.chipTxtActive]}>
                  All ({menuItems.length})
                </Text>
              </TouchableOpacity>
              {categories.map((c) => {
                const count = menuItems.filter((i) => i.categoryId === c.id).length;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[S.chip, selectedCategory === c.id && S.chipActive]}
                    onPress={() => {
                      setSelectedCategory(c.id);
                      setMenuPage(1);
                    }}
                  >
                    <Text style={[S.chipTxt, selectedCategory === c.id && S.chipTxtActive]}>
                      {c.name} ({count})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={S.menuHeaderRow}>
              <Text style={S.menuListHeaderTitle}>Dishes ({filteredMenu.length})</Text>
              {filteredMenu.length > ITEMS_PER_PAGE && (
                <Text style={S.pageIndicatorTxt}>
                  Page {menuPage} of {totalPages}
                </Text>
              )}
            </View>

            {loadingMenu ? (
              <Loader />
            ) : paginatedMenu.length === 0 ? (
              <Empty icon="🍽️" msg="No dishes matched your filter or search query." />
            ) : (
              paginatedMenu.map((item) => {
                const isSoldOut = item.availability && !item.availability.isAvailable;
                const inCart = cart[item.id]?.qty ?? 0;
                return (
                  <View key={item.id} style={[S.menuCard, isSoldOut && S.menuSoldOut]}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={S.menuName}>
                          {item.isVeg ? '🟢 ' : '🔴 '}
                          {item.name}
                        </Text>
                        {isSoldOut && (
                          <View style={S.soldOutBadge}>
                            <Text style={S.soldOutBadgeTxt}>SOLD OUT / 86</Text>
                          </View>
                        )}
                      </View>
                      <Text style={S.menuPrice}>
                        {cur}{item.price}
                      </Text>
                      {item.description ? (
                        <Text style={S.menuDesc} numberOfLines={2}>
                          {item.description}
                        </Text>
                      ) : null}
                      {item.preparationTimeMinutes ? (
                        <Text style={S.menuTime}>⏱ ~{item.preparationTimeMinutes} mins prep</Text>
                      ) : null}
                    </View>

                    {isSoldOut ? (
                      <View style={S.soldOutBtn}>
                        <Text style={S.soldOutBtnTxt}>Sold Out</Text>
                      </View>
                    ) : inCart > 0 ? (
                      <View style={S.qtyCtrl}>
                        <TouchableOpacity style={S.qtyBtn} onPress={() => decrementCart(item.id)}>
                          <Text style={S.qtyBtnTxt}>−</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={S.qtyNum} onPress={() => openNoteModal(item)}>
                          <Text style={S.qtyNumTxt}>{inCart}</Text>
                          {cart[item.id]?.note ? <Text style={{ fontSize: 9 }}>📝</Text> : null}
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
              })
            )}

            {totalPages > 1 && (
              <View style={S.paginationContainer}>
                <TouchableOpacity
                  style={[S.pageBtn, menuPage <= 1 && S.pageBtnDisabled]}
                  onPress={() => setMenuPage((p) => Math.max(1, p - 1))}
                  disabled={menuPage <= 1}
                >
                  <Text style={[S.pageBtnTxt, menuPage <= 1 && S.pageBtnTxtDisabled]}>◀ Previous</Text>
                </TouchableOpacity>

                <Text style={S.pageStatusTxt}>
                  {menuPage} / {totalPages}
                </Text>

                <TouchableOpacity
                  style={[S.pageBtn, menuPage >= totalPages && S.pageBtnDisabled]}
                  onPress={() => setMenuPage((p) => Math.min(totalPages, p + 1))}
                  disabled={menuPage >= totalPages}
                >
                  <Text style={[S.pageBtnTxt, menuPage >= totalPages && S.pageBtnTxtDisabled]}>Next ▶</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={{ height: 100 }} />
          </ScrollView>

          {cartEntries.length > 0 && (
            <View style={S.cartBar}>
              <View>
                <Text style={S.cartItems}>
                  {cartCount} item{cartCount !== 1 ? 's' : ''} in cart
                </Text>
                <Text style={S.cartTotal}>
                  {cur}{cartTotal.toFixed(2)}{' '}
                  <Text style={S.cartTaxNote}>(incl. {taxPct}% tax)</Text>
                </Text>
              </View>
              <TouchableOpacity
                style={[S.sendBtn, !selectedTable && S.sendBtnDisabled]}
                onPress={sendOrder}
                disabled={!selectedTable}
              >
                <Text style={S.sendBtnTxt}>
                  {selectedTable ? '🍳 Send KOT' : '⚠️ Select Table'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* ══════════════════════════════════════════════
          WAITER ▶ Serving & Delivery Tracker Tab
      ══════════════════════════════════════════════ */}
      {showServing && activeTab === 'serving' && (
        <ScrollView
          style={S.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshingServing}
              onRefresh={() => loadServing(token, true)}
              tintColor="#d97706"
            />
          }
        >
          <SectionHeader
            title="Delivery & Serving Tracking"
            subtitle="Pull down to refresh • Serve items when ready"
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.chipRow}>
            {([
              { k: 'ready', l: '🔔 Ready to Serve' },
              { k: 'preparing', l: '🍳 In Kitchen' },
              { k: 'delivered', l: '✅ Served' },
              { k: 'all', l: 'All Items' },
            ] as const).map((f) => (
              <TouchableOpacity
                key={f.k}
                style={[S.chip, servingFilter === f.k && S.chipActive]}
                onPress={() => setServingFilter(f.k)}
              >
                <Text style={[S.chipTxt, servingFilter === f.k && S.chipTxtActive]}>{f.l}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {loadingServing ? (
            <Loader />
          ) : servingItems.length === 0 ? (
            <Empty
              icon={servingFilter === 'ready' ? '✅' : '📋'}
              msg={
                servingFilter === 'ready'
                  ? 'No items currently ready to serve.'
                  : 'No orders found matching this filter.'
              }
            />
          ) : (
            servingItems.map(({ order, item }) => {
              const isReady = item.status === 'READY';
              const isDone = item.status === 'DELIVERED';
              return (
                <View key={item.id} style={[S.servCard, isReady && S.servCardReadyBorder]}>
                  <View style={S.servHeader}>
                    <Text style={S.servTable}>Table {order?.table?.tableNumber ?? 'Takeaway'}</Text>
                    <View style={[S.servPill, isReady && S.servPillReady, isDone && S.servPillDone]}>
                      <Text style={[S.servPillTxt, isReady && S.servPillTxtReady, isDone && S.servPillTxtDone]}>
                        {isDone ? '✅ SERVED' : isReady ? '🔔 READY' : `⏳ ${item.status}`}
                      </Text>
                    </View>
                  </View>

                  <Text style={S.servDish}>
                    {item.quantity}× {item.foodItem?.name}
                  </Text>
                  <Text style={S.servOrder}>Order: #{order?.orderNumber}</Text>
                  {item.specialInstructions ? (
                    <Text style={S.servNote}>📝 {item.specialInstructions}</Text>
                  ) : null}

                  {isReady && (
                    <TouchableOpacity
                      style={S.serveNowBtn}
                      onPress={() => markDelivered(item.id, item.foodItem?.name)}
                    >
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
            })
          )}
        </ScrollView>
      )}

      {/* ══════════════════════════════════════════════
          CHEF ▶ Kitchen KDS Tab
      ══════════════════════════════════════════════ */}
      {showKitchen && activeTab === 'kitchen' && (
        <ScrollView
          style={S.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshingKitchen}
              onRefresh={() => loadKitchen(token, true)}
              tintColor="#d97706"
            />
          }
        >
          <SectionHeader
            title="Kitchen Display System"
            subtitle="Real-time order tickets with live status update"
            count={filteredKitchenTasks.length}
          />

          <View style={S.chipRow}>
            {[
              { id: 'all', label: 'All Orders' },
              { id: 'pending', label: '⏳ Pending' },
              { id: 'cooking', label: '🔥 In Preparation' },
            ].map((f) => (
              <TouchableOpacity
                key={f.id}
                style={[S.chip, kdsFilter === f.id && S.chipActive]}
                onPress={() => setKdsFilter(f.id as any)}
              >
                <Text style={[S.chipTxt, kdsFilter === f.id && S.chipTxtActive]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {loadingKitchen ? (
            <Loader />
          ) : filteredKitchenTasks.length === 0 ? (
            <Empty icon="👨‍🍳" msg="No active kitchen orders. All clear!" />
          ) : (
            filteredKitchenTasks.map((task) => (
              <KDSCard key={task.id} task={task} onAction={kitchenAction} />
            ))
          )}
        </ScrollView>
      )}

      {/* ══════════════════════════════════════════════
          CHEF / MANAGER ▶ Menu Availability (Sold Out / 86)
      ══════════════════════════════════════════════ */}
      {showAvailability && activeTab === 'availability' && (
        <ScrollView style={S.content}>
          <SectionHeader
            title="Menu Availability (86 Control)"
            subtitle="Toggle items Sold Out in real-time across all waiter devices"
            count={availItems.length}
          />

          <View style={S.searchContainer}>
            <TextInput
              style={S.searchInput}
              value={availSearch}
              onChangeText={setAvailSearch}
              placeholder="🔍 Search dish or category..."
              placeholderTextColor="#475569"
            />
            {availSearch.length > 0 && (
              <TouchableOpacity onPress={() => setAvailSearch('')} style={S.clearSearchBtn}>
                <Text style={S.clearSearchTxt}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {loadingAvail ? (
            <Loader />
          ) : filteredAvailItems.length === 0 ? (
            <Empty icon="📋" msg="No menu items matched your search." />
          ) : (
            filteredAvailItems.map((item) => {
              const isAvail = item.availability?.isAvailable ?? true;
              return (
                <View key={item.id} style={S.availCard}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={S.availName}>
                      {item.isVeg ? '🟢 ' : '🔴 '}
                      {item.name}
                    </Text>
                    <Text style={S.availCat}>
                      {item.category?.name ?? 'General'} • {cur}{item.price}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[S.availToggle, isAvail ? S.availOn : S.availOff]}
                    onPress={() => toggleAvailability(item)}
                  >
                    <Text style={S.availToggleTxt}>
                      {isAvail ? '✓ Available' : '🚫 Sold Out (86)'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* ══════════════════════════════════════════════
          MANAGER ▶ Live Analytics Dashboard
      ══════════════════════════════════════════════ */}
      {showDashboard && activeTab === 'dashboard' && (
        <ScrollView
          style={S.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshingDash}
              onRefresh={() => loadDashboard(token, true)}
              tintColor="#d97706"
            />
          }
        >
          <SectionHeader title="Manager Overview" subtitle="Real-time sales & operations metrics" />

          {loadingDash && !dashData ? (
            <Loader />
          ) : !dashData ? (
            <Empty icon="📊" msg="Could not load dashboard data." />
          ) : (
            <>
              <SLabel>REVENUE & ORDER VOLUMES</SLabel>
              <View style={S.statsGrid}>
                <StatCard
                  icon="💰"
                  label="Today Revenue"
                  value={`${cur}${(+dashData.todayRevenue || 0).toFixed(2)}`}
                  color="#22c55e"
                />
                <StatCard
                  icon="📋"
                  label="Today Orders"
                  value={String(dashData.todayOrders ?? 0)}
                  color="#3b82f6"
                />
                <StatCard
                  icon="⏳"
                  label="Pending KOTs"
                  value={String(dashData.pendingOrders ?? 0)}
                  color="#f59e0b"
                />
                <StatCard
                  icon="✅"
                  label="Completed"
                  value={String(dashData.completedOrders ?? 0)}
                  color="#22c55e"
                />
              </View>

              <SLabel>TABLE LIVE STATUS</SLabel>
              <View style={S.statsGrid}>
                <StatCard
                  icon="🟢"
                  label="Available Tables"
                  value={String(dashData.availableTables ?? 0)}
                  color="#22c55e"
                />
                <StatCard
                  icon="🔴"
                  label="Occupied Tables"
                  value={String(dashData.occupiedTables ?? 0)}
                  color="#f59e0b"
                />
                <StatCard
                  icon="🧾"
                  label="Billing Requested"
                  value={String(dashData.billingTables ?? 0)}
                  color="#3b82f6"
                />
                <StatCard
                  icon="📊"
                  label="Total Tables"
                  value={String(dashData.totalTables ?? 0)}
                  color="#8b5cf6"
                />
              </View>

              {dashData.staffPerformance?.length > 0 && (
                <>
                  <SLabel>WAITER PERFORMANCE</SLabel>
                  {dashData.staffPerformance.map((s: any) => (
                    <View key={s.id} style={S.perfCard}>
                      <Text style={S.perfName}>👤 {s.name}</Text>
                      <View style={S.perfRow}>
                        <Text style={S.perfStat}>📋 {s.ordersTaken} orders taken</Text>
                        <Text style={S.perfStat}>🛎️ {s.itemsDelivered} dishes served</Text>
                      </View>
                    </View>
                  ))}
                </>
              )}

              {dashData.chefPerformance?.length > 0 && (
                <>
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
                </>
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* ══════════════════════════════════════════════
          MANAGER ▶ Billing & Settlement Tab
      ══════════════════════════════════════════════ */}
      {showBilling && activeTab === 'billing' && (
        <ScrollView style={S.content}>
          <View style={S.sectionRow}>
            <Text style={S.sectionTitle}>Billing & Cashier</Text>
            <TouchableOpacity style={S.refreshBtn} onPress={() => loadBilling()}>
              <Text style={S.refreshTxt}>🔄 Refresh</Text>
            </TouchableOpacity>
          </View>

          {loadingBilling ? (
            <Loader />
          ) : (
            <>
              {billableOrders.length > 0 && (
                <>
                  <SLabel>TABLES READY FOR BILL GENERATION ({billableOrders.length})</SLabel>
                  {billableOrders.map((order) => {
                    const isRequested = order.table?.status === 'BILLING';
                    return (
                      <View
                        key={order.id}
                        style={[S.billableCard, isRequested && S.billableCardRequested]}
                      >
                        <View style={S.billableTop}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={S.billableNum}>Order #{order.orderNumber}</Text>
                            {isRequested && (
                              <View style={S.requestedBadge}>
                                <Text style={S.requestedBadgeTxt}>🔔 BILL REQUESTED</Text>
                              </View>
                            )}
                          </View>
                          <Text style={S.billableTableTxt}>
                            Table {order.table?.tableNumber ?? 'Takeaway'}
                          </Text>
                        </View>
                        <Text style={S.billableAmt}>
                          {cur}{(+order.totalAmount || 0).toFixed(2)}
                        </Text>
                        <Text style={S.billableInfo}>
                          {order.items?.length ?? 0} items • Waiter: {order.waiter?.name ?? 'Staff'}
                        </Text>
                        <TouchableOpacity style={S.genBillBtn} onPress={() => generateBill(order.id)}>
                          <Text style={S.genBillTxt}>🧾 Generate Bill</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </>
              )}

              <SLabel>RECENT BILLS & PAYMENTS</SLabel>
              {bills.length === 0 ? (
                <Empty icon="🧾" msg="No recent bills found." />
              ) : (
                bills.map((bill) => (
                  <View key={bill.id} style={S.billCard}>
                    <View style={S.billTop}>
                      <Text style={S.billNum}>Bill #{bill.billNumber}</Text>
                      <View
                        style={[
                          S.billPill,
                          bill.status === 'PAID' && S.billPillPaid,
                          (bill.status === 'UNPAID' || bill.status === 'PENDING') && S.billPillPending,
                        ]}
                      >
                        <Text style={S.billPillTxt}>{bill.status}</Text>
                      </View>
                    </View>
                    <Text style={S.billMeta}>
                      Table {bill.order?.table?.tableNumber ?? '?'} • {new Date(bill.createdAt).toLocaleDateString()}
                    </Text>
                    <Text style={S.billLine}>Subtotal: {cur}{(+bill.subtotal || 0).toFixed(2)}</Text>
                    <Text style={S.billLine}>Tax: {cur}{(+bill.taxAmount || 0).toFixed(2)}</Text>
                    {bill.discountAmount > 0 && (
                      <Text style={S.billLine}>Discount: -{cur}{(+bill.discountAmount).toFixed(2)}</Text>
                    )}
                    <Text style={S.billTotal}>
                      TOTAL: {cur}{(+bill.totalAmount || +bill.grandTotal || 0).toFixed(2)}
                    </Text>
                    {(bill.status === 'UNPAID' || bill.status === 'PENDING') && (
                      <TouchableOpacity style={S.payBtn} onPress={() => setPayModal(bill)}>
                        <Text style={S.payBtnTxt}>💳 Record Payment & Release Table</Text>
                      </TouchableOpacity>
                    )}
                    {bill.status === 'PAID' && (
                      <Text style={S.paidInfo}>✅ Paid via {bill.payment?.paymentMethod ?? 'CASH'}</Text>
                    )}
                  </View>
                ))
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* Special Cooking Note Modal */}
      <Modal
        visible={!!noteModalItem}
        transparent
        animationType="slide"
        onRequestClose={() => setNoteModalItem(null)}
      >
        <View style={S.modalOverlay}>
          <View style={S.modalCard}>
            <Text style={S.modalTitle}>Special Cooking Instructions</Text>
            <Text style={S.modalSub}>{noteModalItem?.name}</Text>
            <TextInput
              style={S.noteInput}
              value={noteModalText}
              onChangeText={setNoteModalText}
              placeholder="e.g. Less spicy, no onions, extra crispy..."
              placeholderTextColor="#334155"
              multiline
              maxLength={200}
            />
            <View style={S.modalBtns}>
              <TouchableOpacity style={S.modalCancel} onPress={() => setNoteModalItem(null)}>
                <Text style={S.modalCancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={S.modalSave} onPress={saveNote}>
                <Text style={S.modalSaveTxt}>Save Instruction</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Payment Settlement Modal */}
      <Modal
        visible={!!payModal}
        transparent
        animationType="slide"
        onRequestClose={() => setPayModal(null)}
      >
        <View style={S.modalOverlay}>
          <View style={S.modalCard}>
            <Text style={S.modalTitle}>Settle Payment</Text>
            <Text style={S.modalSub}>
              Bill #{payModal?.billNumber} • Total: {cur}
              {(+payModal?.totalAmount || +payModal?.grandTotal || 0).toFixed(2)}
            </Text>
            <Text style={[S.label, { marginTop: 16 }]}>PAYMENT MODE</Text>
            <View style={S.payMethodRow}>
              {(['CASH', 'UPI', 'CARD'] as const).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[S.payMethodBtn, payMethod === m && S.payMethodBtnActive]}
                  onPress={() => setPayMethod(m)}
                >
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
//  Reusable Subcomponents
// ─────────────────────────────────────────────
function Tab({
  label,
  tab,
  active,
  onPress,
}: {
  label: string;
  tab: ActiveTab;
  active: ActiveTab;
  onPress: () => void;
}) {
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

function SectionHeader({
  title,
  subtitle,
  count,
}: {
  title: string;
  subtitle?: string;
  count?: number;
}) {
  return (
    <View style={{ marginBottom: 8 }}>
      <View style={S.sectionRow}>
        <Text style={S.sectionTitle}>{title}</Text>
        {count !== undefined && (
          <View style={S.countBadge}>
            <Text style={S.countBadgeTxt}>{count}</Text>
          </View>
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

function KDSCard({
  task,
  onAction,
}: {
  task: any;
  onAction: (id: string, a: 'accept' | 'prepare' | 'ready', n?: string) => void;
}) {
  const clr: Record<string, string> = {
    PENDING: '#f59e0b',
    ACCEPTED: '#3b82f6',
    PREPARING: '#8b5cf6',
    READY: '#22c55e',
  };
  const c = clr[task.status] ?? '#94a3b8';

  const elapsedMinutes = task.createdAt
    ? Math.max(0, Math.floor((Date.now() - new Date(task.createdAt).getTime()) / 60000))
    : 0;

  return (
    <View style={[S.kdsCard, { borderLeftColor: c }]}>
      <View style={S.kdsHeader}>
        <Text style={S.kdsTable}>Table {task.order?.table?.tableNumber ?? 'Takeaway'}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[S.kdsTimer, elapsedMinutes > 15 && { color: '#ef4444' }]}>
            ⏱ {elapsedMinutes}m ago
          </Text>
          <View style={[S.kdsStatusBadge, { backgroundColor: c + '22', borderColor: c }]}>
            <Text style={[S.kdsStatus, { color: c }]}>{task.status}</Text>
          </View>
        </View>
      </View>

      <Text style={S.kdsDish}>
        {task.quantity}× {task.foodItem?.name}
      </Text>

      {task.specialInstructions ? <Text style={S.kdsNote}>📝 {task.specialInstructions}</Text> : null}

      <Text style={S.kdsTime}>
        Order #{task.order?.orderNumber} • Placed at{' '}
        {new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>

      <View style={{ marginTop: 10 }}>
        {task.status === 'PENDING' && (
          <TouchableOpacity
            style={[S.kdsBtn, { backgroundColor: '#f59e0b' }]}
            onPress={() => onAction(task.id, 'accept', task.foodItem?.name)}
          >
            <Text style={[S.kdsBtnTxt, { color: '#020617' }]}>✓ Accept Order</Text>
          </TouchableOpacity>
        )}
        {task.status === 'ACCEPTED' && (
          <TouchableOpacity
            style={[S.kdsBtn, { backgroundColor: '#3b82f6' }]}
            onPress={() => onAction(task.id, 'prepare', task.foodItem?.name)}
          >
            <Text style={[S.kdsBtnTxt, { color: '#fff' }]}>🔥 Start Cooking</Text>
          </TouchableOpacity>
        )}
        {task.status === 'PREPARING' && (
          <TouchableOpacity
            style={[S.kdsBtn, { backgroundColor: '#22c55e' }]}
            onPress={() => onAction(task.id, 'ready', task.foodItem?.name)}
          >
            <Text style={[S.kdsBtnTxt, { color: '#020617' }]}>🔔 Mark Ready to Serve</Text>
          </TouchableOpacity>
        )}
        {task.status === 'READY' && (
          <View style={[S.kdsBtn, { backgroundColor: '#22c55e22', borderWidth: 1, borderColor: '#22c55e' }]}>
            <Text style={[S.kdsBtnTxt, { color: '#22c55e' }]}>✅ Ready — Awaiting Waiter</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={[S.statCard, { borderTopColor: color }]}>
      <Text style={S.statIcon}>{icon}</Text>
      <Text style={[S.statValue, { color }]}>{value}</Text>
      <Text style={S.statLabel}>{label}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────
//  Design Tokens & Styles
// ─────────────────────────────────────────────
const C = {
  bg: '#050a14',
  surf: '#0d1a2e',
  surfHi: '#111f35',
  bdr: '#1a2f4a',
  txt: '#e2e8f0',
  txtMuted: '#475569',
  txtSec: '#94a3b8',
  accent: '#d97706',
  success: '#22c55e',
  danger: '#ef4444',
  info: '#3b82f6',
  purple: '#8b5cf6',
};

const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { flex: 1, padding: 16 },

  // Toast
  toastContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : 20,
    left: 16,
    right: 16,
    zIndex: 9999,
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: C.surf,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },
  toastSuccess: { borderColor: C.success, backgroundColor: '#052e16' },
  toastWarning: { borderColor: C.accent, backgroundColor: '#451a03' },
  toastInfo: { borderColor: C.info, backgroundColor: '#172554' },
  toastInner: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  toastTitle: { color: '#fff', fontWeight: '900', fontSize: 13 },
  toastMessage: { color: '#cbd5e1', fontSize: 12, marginTop: 2 },
  toastClose: { color: '#94a3b8', fontSize: 16, paddingHorizontal: 6 },

  // Login
  loginScroll: { padding: 20, paddingBottom: 40 },
  loginBrand: { alignItems: 'center', marginTop: 20, marginBottom: 20 },
  loginIcon: { fontSize: 48 },
  loginName: { fontSize: 22, fontWeight: '900', color: C.txt, marginTop: 10, textAlign: 'center' },
  loginTagline: { fontSize: 12, color: C.txtSec, textAlign: 'center', marginTop: 4 },
  stepBadge: {
    marginTop: 10,
    backgroundColor: C.accent + '22',
    borderColor: C.accent,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  stepBadgeTxt: { color: C.accent, fontSize: 10, fontWeight: '800' },
  card: {
    backgroundColor: C.surf,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.bdr,
  },
  cardTitle: { fontSize: 10, fontWeight: '800', color: C.txtMuted, letterSpacing: 1.5, marginBottom: 12 },
  label: { fontSize: 10, fontWeight: '800', color: C.txtMuted, letterSpacing: 1.2, marginBottom: 6 },
  input: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.bdr,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: C.txt,
    fontSize: 14,
  },
  primaryBtn: {
    backgroundColor: C.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  primaryBtnTxt: { color: '#020617', fontWeight: '800', fontSize: 15 },
  quickCard: { backgroundColor: C.surf, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: C.bdr },
  quickLabel: { fontSize: 10, fontWeight: '800', color: C.txtMuted, letterSpacing: 1.5, marginBottom: 8 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickChip: {
    width: '48%',
    backgroundColor: C.surfHi,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: C.bdr,
  },
  quickChipTxt: { color: C.txt, fontSize: 12, fontWeight: '700' },
  quickChipSub: { color: C.txtMuted, fontSize: 10, marginTop: 2 },

  // Bottom Server Indicator
  bottomServerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: C.surf,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.bdr,
  },
  dotGreen: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.success },
  bottomServerTxt: { color: C.txtSec, fontSize: 11, fontWeight: '600' },
  changeServerTxt: { color: C.accent, fontSize: 11, fontWeight: '700' },

  presetBtn: {
    backgroundColor: C.surfHi,
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: C.bdr,
  },
  presetBtnActive: { borderColor: C.accent, backgroundColor: C.accent + '15' },
  presetTxt: { color: C.txt, fontSize: 12, fontWeight: '700' },
  presetTxtActive: { color: C.accent },
  presetUrl: { color: C.txtMuted, fontSize: 10, marginTop: 2 },

  // App Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: C.surf,
    borderBottomWidth: 1,
    borderBottomColor: C.bdr,
  },
  headerTitle: { fontSize: 15, fontWeight: '800', color: C.txt },
  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  headerUser: { fontSize: 12, color: C.txtSec },
  rolePill: {
    backgroundColor: C.accent + '22',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: C.accent + '44',
  },
  rolePillTxt: { color: C.accent, fontSize: 10, fontWeight: '800' },
  logoutBtn: {
    backgroundColor: C.danger + '15',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: C.danger + '30',
  },
  logoutTxt: { color: C.danger, fontWeight: '800', fontSize: 11 },

  // Tabs
  tabBar: { backgroundColor: C.surf, borderBottomWidth: 1, borderBottomColor: C.bdr, maxHeight: 46 },
  tabBarInner: { paddingHorizontal: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 12, marginHorizontal: 2 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: C.accent },
  tabTxt: { color: C.txtSec, fontSize: 12, fontWeight: '600' },
  tabTxtActive: { color: C.accent, fontWeight: '800' },

  // Sections
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: C.txt },
  sectionSub: { fontSize: 11, color: C.txtMuted, marginBottom: 8 },
  sLabel: { fontSize: 10, fontWeight: '800', color: C.txtMuted, letterSpacing: 1.5, marginTop: 14, marginBottom: 8 },
  countBadge: {
    backgroundColor: C.accent + '22',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: C.accent + '44',
  },
  countBadgeTxt: { color: C.accent, fontWeight: '800', fontSize: 11 },
  refreshBtn: { backgroundColor: C.surfHi, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: C.bdr },
  refreshTxt: { color: C.accent, fontSize: 11, fontWeight: '800' },

  // Chips
  chipRow: { flexDirection: 'row', marginBottom: 12 },
  chip: {
    backgroundColor: C.surfHi,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: C.bdr,
  },
  chipActive: { backgroundColor: C.accent, borderColor: C.accent },
  chipTxt: { color: C.txtSec, fontSize: 12, fontWeight: '600' },
  chipTxtActive: { color: '#020617', fontWeight: '800' },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surf,
    borderWidth: 1,
    borderColor: C.bdr,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  searchInput: { flex: 1, color: C.txt, fontSize: 13, paddingVertical: 9 },
  clearSearchBtn: { padding: 4 },
  clearSearchTxt: { color: C.txtSec, fontSize: 13, fontWeight: '700' },

  // Diet
  dietRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  dietChip: {
    flex: 1,
    backgroundColor: C.surfHi,
    borderRadius: 10,
    paddingVertical: 7,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.bdr,
  },
  dietChipActive: { backgroundColor: C.accent, borderColor: C.accent },
  dietChipVegActive: { backgroundColor: '#16a34a', borderColor: '#22c55e' },
  dietChipNonVegActive: { backgroundColor: '#dc2626', borderColor: '#ef4444' },
  dietChipTxt: { color: C.txtSec, fontSize: 11, fontWeight: '700' },
  dietChipTxtActive: { color: '#020617', fontWeight: '800' },

  // Tables
  tablesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  tableCard: {
    width: '48%',
    backgroundColor: C.surf,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
  },
  tableCardSelected: { backgroundColor: '#1e293b' },
  tableNum: { fontSize: 18, fontWeight: '900', color: C.txt },
  tableSeats: { fontSize: 11, color: C.txtSec, marginTop: 4 },
  tableStatusPill: { marginTop: 8, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, alignSelf: 'flex-start' },
  tableStatusTxt: { fontSize: 10, fontWeight: '800' },

  // Table Banner
  tableBanner: { backgroundColor: C.surfHi, padding: 10, borderBottomWidth: 1, borderBottomColor: C.bdr, alignItems: 'center' },
  tableBannerWarn: { backgroundColor: '#451a0333' },
  tableBannerTxt: { color: C.accent, fontWeight: '700', fontSize: 12 },
  tableBannerWarnTxt: { color: '#f97316', fontWeight: '700', fontSize: 12 },

  // Active Order
  activeOrderBox: {
    backgroundColor: C.surf,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.bdr,
  },
  activeOrderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  activeOrderTitle: { color: C.txt, fontWeight: '800', fontSize: 13 },
  activeOrderTotal: { color: C.accent, fontWeight: '800', fontSize: 13 },
  activeOrderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: C.bdr,
  },
  activeItemName: { color: C.txt, fontSize: 12, fontWeight: '600' },
  activeItemStatus: { color: C.txtSec, fontSize: 10, marginTop: 2 },
  txtReady: { color: C.success, fontWeight: '700' },
  txtDone: { color: C.info },
  serveSmall: { backgroundColor: C.accent, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  serveSmallTxt: { color: '#020617', fontWeight: '800', fontSize: 10 },
  cancelItemSmall: { backgroundColor: '#ef444422', borderWidth: 1, borderColor: '#ef444455', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 4 },
  cancelItemTxt: { color: '#f87171', fontWeight: '800', fontSize: 10 },
  reqBillBtn: { backgroundColor: C.accent, borderRadius: 10, paddingVertical: 9, alignItems: 'center', marginTop: 8 },
  reqBillTxt: { color: '#020617', fontWeight: '800', fontSize: 12 },
  billingNote: { backgroundColor: C.info + '15', borderRadius: 8, padding: 8, marginTop: 8 },
  billingNoteTxt: { color: C.info, fontSize: 11, textAlign: 'center' },

  // Menu List
  menuHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  menuListHeaderTitle: { color: C.txtSec, fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  pageIndicatorTxt: { color: C.accent, fontSize: 11, fontWeight: '700' },
  menuCard: {
    backgroundColor: C.surf,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.bdr,
  },
  menuSoldOut: { opacity: 0.5 },
  menuName: { color: C.txt, fontSize: 14, fontWeight: '700' },
  soldOutBadge: { backgroundColor: '#ef444422', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: '#ef4444' },
  soldOutBadgeTxt: { color: '#f87171', fontSize: 9, fontWeight: '900' },
  menuPrice: { color: C.accent, fontSize: 13, fontWeight: '700', marginTop: 2 },
  menuDesc: { color: C.txtSec, fontSize: 11, marginTop: 2 },
  menuTime: { color: C.txtMuted, fontSize: 10, marginTop: 2 },
  addBtn: { backgroundColor: C.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  addBtnTxt: { color: '#020617', fontWeight: '800', fontSize: 12 },
  soldOutBtn: { backgroundColor: '#334155', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  soldOutBtnTxt: { color: '#94a3b8', fontSize: 11, fontWeight: '700' },
  qtyCtrl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surfHi,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.bdr,
    overflow: 'hidden',
  },
  qtyBtn: { paddingHorizontal: 12, paddingVertical: 7 },
  qtyBtnTxt: { color: C.accent, fontSize: 15, fontWeight: '900' },
  qtyNum: { alignItems: 'center', paddingHorizontal: 6 },
  qtyNumTxt: { color: C.txt, fontWeight: '800', fontSize: 13 },

  // Pagination
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 6,
  },
  pageBtn: {
    backgroundColor: C.surfHi,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: C.bdr,
  },
  pageBtnDisabled: { opacity: 0.3 },
  pageBtnTxt: { color: C.accent, fontSize: 12, fontWeight: '700' },
  pageBtnTxtDisabled: { color: C.txtMuted },
  pageStatusTxt: { color: C.txtSec, fontSize: 12, fontWeight: '700' },

  // Cart Bar
  cartBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.surf,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: C.bdr,
  },
  cartItems: { color: C.txtSec, fontSize: 11 },
  cartTotal: { color: C.txt, fontWeight: '800', fontSize: 15, marginTop: 2 },
  cartTaxNote: { color: C.txtMuted, fontSize: 10, fontWeight: '400' },
  sendBtn: { backgroundColor: C.accent, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  sendBtnDisabled: { backgroundColor: '#4a3000' },
  sendBtnTxt: { color: '#020617', fontWeight: '800', fontSize: 13 },

  // Serving Tracker
  servCard: { backgroundColor: C.surf, borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: C.bdr },
  servCardReadyBorder: { borderColor: C.success, borderWidth: 1.5 },
  servHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  servTable: { color: C.txt, fontWeight: '800', fontSize: 14 },
  servPill: { backgroundColor: C.txtMuted + '22', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: C.bdr },
  servPillReady: { backgroundColor: C.success + '22', borderColor: C.success },
  servPillDone: { backgroundColor: C.info + '22', borderColor: C.info },
  servPillTxt: { color: C.txtSec, fontSize: 10, fontWeight: '800' },
  servPillTxtReady: { color: C.success },
  servPillTxtDone: { color: C.info },
  servDish: { color: C.txt, fontSize: 14, fontWeight: '700', marginBottom: 3 },
  servOrder: { color: C.txtMuted, fontSize: 11 },
  servNote: { color: '#fbbf24', fontSize: 11, marginTop: 3, fontStyle: 'italic' },
  serveNowBtn: { backgroundColor: C.accent, borderRadius: 10, paddingVertical: 9, alignItems: 'center', marginTop: 10 },
  serveNowTxt: { color: '#020617', fontWeight: '800', fontSize: 12 },
  doneBox: { backgroundColor: C.info + '15', borderRadius: 6, padding: 7, marginTop: 6 },
  doneTxt: { color: C.info, fontSize: 11, textAlign: 'center' },

  // Kitchen KDS
  kdsCard: {
    backgroundColor: C.surf,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.bdr,
    borderLeftWidth: 4,
  },
  kdsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  kdsTable: { color: C.txt, fontWeight: '900', fontSize: 15 },
  kdsTimer: { color: C.txtSec, fontSize: 10, fontWeight: '700' },
  kdsStatusBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1 },
  kdsStatus: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  kdsDish: { color: C.txt, fontSize: 14, fontWeight: '700', marginBottom: 2 },
  kdsNote: { color: '#fbbf24', fontSize: 11, fontStyle: 'italic', marginBottom: 2 },
  kdsTime: { color: C.txtMuted, fontSize: 10 },
  kdsBtn: { borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  kdsBtnTxt: { fontWeight: '800', fontSize: 12 },

  // Menu Availability (86)
  availCard: {
    backgroundColor: C.surf,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.bdr,
  },
  availName: { color: C.txt, fontSize: 13, fontWeight: '700' },
  availCat: { color: C.txtSec, fontSize: 11, marginTop: 2 },
  availToggle: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  availOn: { backgroundColor: C.success + '22', borderColor: C.success },
  availOff: { backgroundColor: C.danger + '22', borderColor: C.danger },
  availToggleTxt: { fontWeight: '800', fontSize: 11, color: C.txt },

  // Dashboard Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    backgroundColor: C.surf,
    borderRadius: 12,
    padding: 12,
    flex: 1,
    minWidth: '45%',
    borderWidth: 1,
    borderColor: C.bdr,
    borderTopWidth: 3,
    alignItems: 'center',
  },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '900' },
  statLabel: { color: C.txtSec, fontSize: 10, marginTop: 2, textAlign: 'center' },
  perfCard: { backgroundColor: C.surf, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: C.bdr },
  perfName: { color: C.txt, fontWeight: '700', fontSize: 13, marginBottom: 4 },
  perfRow: { flexDirection: 'row', gap: 14 },
  perfStat: { color: C.txtSec, fontSize: 11 },

  // Billing
  billableCard: { backgroundColor: C.info + '11', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: C.info + '33' },
  billableCardRequested: { backgroundColor: '#1e3a8a33', borderColor: '#3b82f6', borderWidth: 2 },
  requestedBadge: { backgroundColor: '#3b82f622', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: '#3b82f6' },
  requestedBadgeTxt: { color: '#60a5fa', fontSize: 9, fontWeight: '900' },
  billableTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  billableNum: { color: C.txt, fontWeight: '800', fontSize: 13 },
  billableTableTxt: { color: C.info, fontWeight: '700', fontSize: 12 },
  billableAmt: { color: C.txt, fontSize: 15, fontWeight: '800', marginBottom: 2 },
  billableInfo: { color: C.txtSec, fontSize: 11, marginBottom: 8 },
  genBillBtn: { backgroundColor: C.info, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  genBillTxt: { color: '#fff', fontWeight: '800', fontSize: 12 },
  billCard: { backgroundColor: C.surf, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: C.bdr },
  billTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  billNum: { color: C.txt, fontWeight: '800', fontSize: 13 },
  billPill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: C.txtMuted + '22' },
  billPillPaid: { backgroundColor: C.success + '22' },
  billPillPending: { backgroundColor: C.accent + '22' },
  billPillTxt: { fontSize: 9, fontWeight: '800', color: C.txt },
  billMeta: { color: C.txtSec, fontSize: 11, marginBottom: 6 },
  billLine: { color: C.txtSec, fontSize: 11, marginBottom: 2 },
  billTotal: { color: C.txt, fontSize: 14, fontWeight: '800', marginTop: 4 },
  payBtn: {
    backgroundColor: C.success + '22',
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: C.success + '44',
  },
  payBtnTxt: { color: C.success, fontWeight: '800', fontSize: 12 },
  paidInfo: { color: C.success, fontSize: 11, marginTop: 6, textAlign: 'center' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: C.surf, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, borderWidth: 1, borderColor: C.bdr },
  modalTitle: { color: C.txt, fontWeight: '900', fontSize: 17, marginBottom: 4 },
  modalSub: { color: C.txtSec, fontSize: 12, marginBottom: 12 },
  noteInput: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.bdr,
    borderRadius: 12,
    padding: 12,
    color: C.txt,
    fontSize: 13,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 14 },
  modalCancel: { flex: 1, backgroundColor: C.surfHi, borderRadius: 10, paddingVertical: 11, alignItems: 'center', borderWidth: 1, borderColor: C.bdr },
  modalCancelTxt: { color: C.txtSec, fontWeight: '700', fontSize: 13 },
  modalSave: { flex: 2, backgroundColor: C.accent, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  modalSaveTxt: { color: '#020617', fontWeight: '800', fontSize: 13 },
  payMethodRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  payMethodBtn: { flex: 1, backgroundColor: C.surfHi, borderRadius: 10, paddingVertical: 11, alignItems: 'center', borderWidth: 1, borderColor: C.bdr },
  payMethodBtnActive: { backgroundColor: C.accent, borderColor: C.accent },
  payMethodTxt: { color: C.txtSec, fontSize: 11, fontWeight: '700' },
  payMethodTxtActive: { color: '#020617' },

  // Empty State
  empty: {
    alignItems: 'center',
    paddingVertical: 36,
    backgroundColor: C.surf,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.bdr,
    marginTop: 8,
  },
  emptyIcon: { fontSize: 32, marginBottom: 8 },
  emptyTxt: { color: C.txtSec, fontSize: 12, textAlign: 'center', paddingHorizontal: 20 },
});
