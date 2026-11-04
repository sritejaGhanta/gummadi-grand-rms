# REST API Documentation

- **Base URL**: `http://<SERVER_LAN_IP>:3000/api`
- **Interactive Swagger UI**: `http://<SERVER_LAN_IP>:3000/api/docs`
- **Authentication**: Bearer JWT Token (`Authorization: Bearer <TOKEN>`)

---

## 1. Authentication Endpoints

### `POST /auth/login`
Authenticates a user and returns a signed JWT access token along with assigned dynamic permissions.

- **Request Body**:
```json
{
  "username": "admin",
  "password": "admin123"
}
```
- **Success Response (201)**:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOi...",
    "user": {
      "id": "uuid",
      "username": "admin",
      "name": "Admin Sovereign",
      "permissions": ["dashboard.view", "menu.create", "billing.create", "..."]
    }
  }
}
```
- **Error Responses**:
  - `400 Bad Request`: Username and password are required.
  - `401 Unauthorized`: Invalid credentials.

### `GET /auth/profile`
Fetches current logged-in user profile, role, and active permissions.

---

## 2. Restaurant Settings

### `GET /settings/public`
Unauthenticated endpoint returning restaurant name, GST number, tax percentage, and contact info.

### `PUT /settings`
Requires `settings.manage` permission. Updates restaurant settings.

---

## 3. Floors & Dining Tables

### `GET /floors`
Returns all dining floor levels with nested tables.

### `POST /floors`
Requires `tables.manage`. Creates a new floor section.
- **Request Body**: `{ "name": "Rooftop Garden", "floorNumber": 3 }`

### `GET /tables`
Query parameter: `?floorId=<UUID>`. Returns table status (`AVAILABLE`, `OCCUPIED`, `BILLING`).

### `POST /tables`
Requires `tables.manage`. Creates a table under a specific floor.
- **Request Body**: `{ "tableNumber": "T-15", "floorId": "<UUID>", "seatingCapacity": 6 }`

---

## 4. Menu & Daily Food Availability

### `GET /menu/categories`
Returns all menu categories sorted by display order.

### `GET /menu/items`
Returns all menu items with category details and daily availability status.

### `PUT /menu/items/:id/availability`
Requires `menu.availability.update`. Sets an item to `SOLD OUT` (`false`) or `AVAILABLE` (`true`).
- **Request Body**: `{ "isAvailable": false }`
- Emits real-time WebSocket event `food:availability` to all connected clients.

---

## 5. Orders & Kitchen Display System (KDS)

### `POST /orders`
Requires `orders.create`. Places a customer order for a dining table.
- **Request Body**:
```json
{
  "tableId": "<TABLE_UUID>",
  "customerName": "Mr. Sharma",
  "notes": "Less spicy",
  "items": [
    {
      "foodItemId": "<FOOD_ITEM_UUID>",
      "quantity": 2,
      "specialInstructions": "Extra crispy"
    }
  ]
}
```
- **Validation Rules**:
  - Automatically rejects orders with 400 Bad Request if any item is currently marked SOLD OUT.
  - Automatically transitions Table status to `OCCUPIED`.

### `GET /kitchen/tasks`
Requires `kitchen.view`. Returns active kitchen orders awaiting preparation.

### `PUT /kitchen/items/:id/accept`
Requires `kitchen.accept`. Transitions item to `ACCEPTED`.

### `PUT /kitchen/items/:id/prepare`
Requires `kitchen.prepare`. Transitions item to `PREPARING`.

### `PUT /kitchen/items/:id/ready`
Requires `kitchen.mark_ready`. Transitions item to `READY`.

### `PUT /orders/items/:id/deliver`
Requires `orders.update`. Waiter marks dish delivered to table (`DELIVERED`).

---

## 6. Billing & Payments

### `POST /billing/generate`
Requires `billing.create`. Generates invoice for table order with GST and discount calculations.
- **Request Body**:
```json
{
  "orderId": "<ORDER_UUID>",
  "discountAmount": 20
}
```
- Automatically marks Table status as `BILLING`.
- Idempotent: Calling multiple times returns the active bill without duplication.

### `POST /billing/:id/payment`
Requires `billing.create`. Records settlement for bill.
- **Request Body**:
```json
{
  "amount": 420.00,
  "paymentMethod": "UPI",
  "transactionReference": "UPI-REF-12345678"
}
```
- Allowed Payment Methods: `CASH`, `CARD`, `UPI`.
- Automatically transitions Table back to `AVAILABLE`.
- Automatically transitions Order status to `COMPLETED`.
- Rejects duplicate payments on closed bills with `400 Bad Request`.
