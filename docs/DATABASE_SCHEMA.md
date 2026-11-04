# Database Schema Documentation

## Database Engine: PostgreSQL 16
- **Database Name**: `rms_db`
- **Primary Key Standard**: UUID v4 (`uuid_generate_v4()`)
- **Timestamp Standard**: UTC `createdAt` and `updatedAt` default `NOW()`
- **Financial Standards**: `NUMERIC(10,2)` precision for all currency calculations

---

## 1. Relational Tables

| Table Name | Description | Key Relationships |
|---|---|---|
| `users` | System user accounts with hashed credentials and roles | `roleId -> roles.id` |
| `roles` | System roles (admin, manager, chef, staff) | 1-to-many `role_permissions` |
| `permissions` | Granular capability keys (19 system permissions) | Many-to-many with roles |
| `role_permissions` | Role to permission assignment join table | `roleId -> roles.id`, `permissionId -> permissions.id` |
| `floors` | Restaurant dining floor sections (Ground, First, Rooftop) | 1-to-many `tables` |
| `tables` | Dining tables with status (`AVAILABLE`, `OCCUPIED`, `BILLING`) | `floorId -> floors.id` |
| `food_categories` | Menu item categories (Starters, Biryani, Curries, etc.) | 1-to-many `food_items` |
| `food_items` | Menu items with pricing, veg flag, prep time | `categoryId -> food_categories.id` |
| `food_availability` | Daily real-time availability toggle per food item | `foodItemId -> food_items.id` |
| `orders` | Dine-in guest order sessions | `tableId -> tables.id`, `waiterId -> users.id` |
| `order_items` | Individual dishes on an order with kitchen preparation status | `orderId -> orders.id`, `foodItemId -> food_items.id`, `chefId -> users.id` |
| `bills` | Financial invoice generated for an order | `orderId -> orders.id`, `tableId -> tables.id`, `generatedById -> users.id` |
| `payments` | Settlement transactions (Cash, Card, UPI) | `billId -> bills.id`, `recordedById -> users.id` |
| `application_settings` | Key-value application config (tax, restaurant name, address) | Standalone system registry |
| `activity_logs` | Audit trail of security, order, kitchen, and billing events | `userId -> users.id` |
| `notifications` | In-app alerts for kitchen, bill requests, and cancellations | Standalone alerts |

---

## 2. PostgreSQL Analytical Views

### 1. `view_table_occupancy`
Real-time dining floor occupancy status showing floor name, table number, seating capacity, status, active order number, and minutes occupied.

### 2. `view_kitchen_pending_tasks`
Active kitchen order queue showing table number, dish name, quantity, chef notes, order time, and elapsed minutes.

### 3. `view_daily_sales_summary`
Aggregates settled bills, total revenue, tax collected, discounts, net amount, total orders count, and payment method breakdown by date.

### 4. `view_popular_menu_items`
Ranks food items by total units sold, revenue generated, and live availability.

### 5. `view_staff_performance`
Orders taken, total sales volume generated, and average bill size per waiter.

---

## 3. Stored Functions

### `fn_calculate_bill_totals(subtotal numeric, tax_pct numeric, disc_pct numeric)`
Computes subtotal, tax amount, discount amount, and grand total.

### `fn_get_revenue_report(start_date date, end_date date)`
Aggregates sales performance between date ranges.
