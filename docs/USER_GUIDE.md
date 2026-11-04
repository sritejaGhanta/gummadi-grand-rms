# End-User Operational Guide

This document guides restaurant staff through daily workflows in the Restaurant Management System.

---

## 1. Default Access Credentials

| Role | Username | Password | Default Portal |
|---|---|---|---|
| **Administrator** | `admin` | `admin123` | Admin Executive Dashboard |
| **Restaurant Manager** | `manager` | `manager123` | Manager Floor & Billing Operations |
| **Executive Chef** | `chef` | `chef123` | Kitchen Display System (KDS) |
| **Service Staff / Waiter** | `waiter` | `waiter123` | Staff Mobile & POS Ordering |

---

## 2. Waiter Workflow: Table Order Placement
1. Log in using `waiter / waiter123` or click **Staff POS** on the login page.
2. Select your dining floor tab (e.g., **Ground Floor**).
3. Click an available green table (e.g., **T-02**).
4. Tap category chips (Starters, Biryani Specials, Curries, Breads, Beverages, Desserts).
5. Tap **Add to Order** on desired dishes. Notice that any dish marked **Sold Out** by the chef is disabled and cannot be added.
6. Optional: Add customer name or special instructions (e.g., "Make it crispy", "Less spicy").
7. Click **Send Order to Kitchen**. The table turns orange (**Occupied**), and tickets appear instantly on kitchen screens via WebSocket.

---

## 3. Chef Workflow: Kitchen Display System (KDS)
1. Log in as `chef / chef123` or tap **Kitchen KDS**.
2. **Order Tickets**:
   - New incoming items arrive with yellow **PENDING** badges.
   - Click **Accept** to claim the ticket (turns blue **ACCEPTED**).
   - Click **Start Cooking** (turns purple **PREPARING**).
   - Once plated, click **Ready to Serve** (turns green **READY**).
   - Waiters receive instant alerts to pick up the dish.
3. **Daily Food Availability**:
   - Switch to the **Daily Availability** tab in KDS.
   - If an ingredient runs out during shift, toggle the dish to **Sold Out**.
   - All waiter POS tablets instantly disable the item.

---

## 4. Manager / Cashier Workflow: Billing & Settlement
1. Log in as `manager / manager123` or tap **Manager Portal**.
2. Click on a table that has requested the bill.
3. Review ordered items and subtotal.
4. Enter any authorized customer discount amount.
5. Click **Generate Bill**. The table status transitions to **Billing**.
6. Click **Print Bill** to display the 80mm thermal receipt preview.
7. Under Settlement, select payment mode (**CASH**, **CARD**, or **UPI**).
8. Click **Collect Payment & Free Table**.
9. The invoice is marked **PAID**, and the table automatically turns green (**Available**) for the next guests.

---

## 5. Administrator Workflow: Management & Oversight
1. Log in as `admin / admin123`.
2. **Executive Overview**: Monitor today's sales, active orders count, table occupancy rate, and kitchen ticket velocity.
3. **Menu Management**: Add new categories, create new dishes, upload photo URLs, set prices, and configure veg/non-veg tags.
4. **Floor & Tables**: Add new floor levels or configure tables with seating capacities.
5. **Roles & Permissions**: Fine-tune dynamic permissions for each staff role.
6. **Activity Logs**: Audit security logins, bill generation, cancellations, and transactions.
7. **Restaurant Settings**: Configure restaurant name, GST number, tax percentage (CGST/SGST), address, and receipt footer message.
