# Role & Permission Matrix

The Restaurant Management System uses a **Dynamic Role-Based Access Control (RBAC)** architecture. Permissions are stored in the database (`permissions` table) and dynamically mapped to roles via `role_permissions`.

---

## 1. System Permission Keys (19 Permissions)

| Permission Key | Description | Module |
|---|---|---|
| `dashboard.view` | View primary operational analytics and metrics | Analytics |
| `orders.create` | Place new dine-in table orders | Orders |
| `orders.view` | View current and past orders | Orders |
| `orders.update` | Modify order items, notes, or deliver status | Orders |
| `orders.cancel` | Cancel order tickets or dishes | Orders |
| `kitchen.view` | Access Kitchen Display System (KDS) live queue | Kitchen |
| `kitchen.accept` | Line cook accepts incoming dish ticket | Kitchen |
| `kitchen.prepare` | Line cook starts preparing dish | Kitchen |
| `kitchen.mark_ready` | Line cook marks dish ready to serve | Kitchen |
| `menu.view` | Browse food items and categories | Menu |
| `menu.create` | Create new dishes or food categories | Menu |
| `menu.update` | Edit dish prices, descriptions, images | Menu |
| `menu.delete` | Soft-delete or archive dishes | Menu |
| `menu.availability.update` | Toggle dish daily availability (SOLD OUT / IN STOCK) | Menu |
| `tables.manage` | Add or configure dining floors and tables | Floor/Tables |
| `billing.view` | View invoices, bills, and payment records | Billing |
| `billing.create` | Generate bills and collect payments | Billing |
| `reports.view` | Access executive financial and staff performance reports | Analytics |
| `settings.manage` | Modify restaurant branding, tax rates, currency | System |

---

## 2. Default Role Matrix

| Permission Key | Administrator (`admin`) | Restaurant Manager (`manager`) | Executive Chef (`chef`) | Service Staff / Waiter (`staff`) |
|---|:---:|:---:|:---:|:---:|
| `dashboard.view` | ✅ | ✅ | ✅ | ✅ |
| `orders.create` | ✅ | ✅ | ❌ | ✅ |
| `orders.view` | ✅ | ✅ | ❌ | ✅ |
| `orders.update` | ✅ | ✅ | ❌ | ✅ |
| `orders.cancel` | ✅ | ✅ | ❌ | ❌ |
| `kitchen.view` | ✅ | ✅ | ✅ | ❌ |
| `kitchen.accept` | ✅ | ❌ | ✅ | ❌ |
| `kitchen.prepare` | ✅ | ❌ | ✅ | ❌ |
| `kitchen.mark_ready` | ✅ | ❌ | ✅ | ❌ |
| `menu.view` | ✅ | ✅ | ✅ | ✅ |
| `menu.create` | ✅ | ✅ | ❌ | ❌ |
| `menu.update` | ✅ | ✅ | ❌ | ❌ |
| `menu.delete` | ✅ | ❌ | ❌ | ❌ |
| `menu.availability.update` | ✅ | ✅ | ✅ | ❌ |
| `tables.manage` | ✅ | ✅ | ❌ | ✅ |
| `billing.view` | ✅ | ✅ | ❌ | ✅ |
| `billing.create` | ✅ | ✅ | ❌ | ❌ |
| `reports.view` | ✅ | ✅ | ❌ | ❌ |
| `settings.manage` | ✅ | ❌ | ❌ | ❌ |
