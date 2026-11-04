-- ====================================================================
-- RESTAURANT MANAGEMENT SYSTEM (RMS) - DATABASE VIEWS & STORED FUNCTIONS
-- ====================================================================

DROP VIEW IF EXISTS view_table_occupancy CASCADE;
DROP VIEW IF EXISTS view_kitchen_pending_tasks CASCADE;
DROP VIEW IF EXISTS view_daily_sales_summary CASCADE;
DROP VIEW IF EXISTS view_popular_menu_items CASCADE;
DROP VIEW IF EXISTS view_staff_performance CASCADE;
DROP VIEW IF EXISTS view_chef_daily_performance CASCADE;
DROP VIEW IF EXISTS view_waiter_daily_performance CASCADE;
DROP VIEW IF EXISTS view_manager_daily_performance CASCADE;
DROP FUNCTION IF EXISTS fn_calculate_bill_totals(NUMERIC, NUMERIC, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS fn_get_revenue_report(DATE, DATE) CASCADE;
DROP FUNCTION IF EXISTS fn_get_daily_staff_kpi(DATE) CASCADE;

-- 1. View: Table Occupancy Status with Floor and Active Order Information
CREATE VIEW view_table_occupancy AS
SELECT 
    t.id AS table_id,
    t."tableNumber" AS table_number,
    t."seatingCapacity" AS seating_capacity,
    t.status AS table_status,
    f.id AS floor_id,
    f.name AS floor_name,
    o.id AS active_order_id,
    o."orderNumber" AS active_order_number,
    o.status AS active_order_status,
    o."createdAt" AS order_started_at,
    ROUND(EXTRACT(EPOCH FROM (NOW() - o."createdAt")) / 60) AS minutes_occupied
FROM tables t
JOIN floors f ON t."floorId" = f.id
LEFT JOIN orders o ON t.id = o."tableId" AND o.status = 'ACTIVE'
ORDER BY f.name, t."tableNumber";

-- 2. View: Kitchen Live Tasks Queue
CREATE VIEW view_kitchen_pending_tasks AS
SELECT 
    oi.id AS order_item_id,
    o."orderNumber" AS order_number,
    t."tableNumber" AS table_number,
    f.name AS floor_name,
    fi.name AS item_name,
    oi.quantity,
    oi.status AS item_status,
    oi."specialInstructions" AS chef_notes,
    oi."createdAt" AS item_ordered_at,
    ROUND(EXTRACT(EPOCH FROM (NOW() - oi."createdAt")) / 60) AS elapsed_minutes
FROM order_items oi
JOIN orders o ON oi."orderId" = o.id
JOIN tables t ON o."tableId" = t.id
JOIN floors f ON t."floorId" = f.id
JOIN food_items fi ON oi."foodItemId" = fi.id
WHERE oi.status IN ('PENDING', 'ACCEPTED', 'PREPARING')
ORDER BY oi."createdAt" ASC;

-- 3. View: Daily Sales & Revenue Breakdown
CREATE VIEW view_daily_sales_summary AS
SELECT 
    DATE(b."createdAt") AS sales_date,
    COUNT(b.id) AS total_bills_count,
    COUNT(CASE WHEN b.status = 'PAID' THEN 1 END) AS paid_bills_count,
    COALESCE(SUM(b.subtotal), 0) AS total_subtotal,
    COALESCE(SUM(b."taxAmount"), 0) AS total_tax_collected,
    COALESCE(SUM(b."discountAmount"), 0) AS total_discounts_given,
    COALESCE(SUM(b."grandTotal"), 0) AS total_gross_revenue,
    COALESCE(SUM(CASE WHEN b.status = 'PAID' THEN b."grandTotal" ELSE 0 END), 0) AS total_settled_revenue
FROM bills b
GROUP BY DATE(b."createdAt")
ORDER BY sales_date DESC;

-- 4. View: Popular Menu Items & Sales Statistics
CREATE VIEW view_popular_menu_items AS
SELECT 
    fi.id AS food_item_id,
    fi.name AS food_name,
    fc.name AS category_name,
    fi.price,
    fi."isActive" AS is_active,
    COALESCE(fa."isAvailable", true) AS is_available_today,
    COALESCE(SUM(oi.quantity), 0) AS total_units_sold,
    COALESCE(SUM(oi."totalPrice"), 0) AS total_revenue_generated
FROM food_items fi
JOIN food_categories fc ON fi."categoryId" = fc.id
LEFT JOIN food_availability fa ON fi.id = fa."foodItemId"
LEFT JOIN order_items oi ON fi.id = oi."foodItemId" AND oi.status != 'CANCELLED'
GROUP BY fi.id, fi.name, fc.name, fi.price, fi."isActive", fa."isAvailable"
ORDER BY total_units_sold DESC, total_revenue_generated DESC;

-- 5. View: Chef Daily Cooking Performance (Per Day & Lifetime)
CREATE VIEW view_chef_daily_performance AS
SELECT 
    u.id AS chef_id,
    u.name AS chef_name,
    u.username AS chef_username,
    DATE(COALESCE(oi."readyAt", oi."startedAt", oi."createdAt")) AS work_date,
    COUNT(oi.id) FILTER (WHERE oi.status IN ('READY', 'DELIVERED')) AS items_prepared,
    COUNT(oi.id) FILTER (WHERE oi.status = 'PREPARING') AS currently_cooking,
    COUNT(oi.id) FILTER (WHERE oi.status = 'ACCEPTED') AS items_accepted,
    COUNT(DISTINCT oi."foodItemId") AS distinct_dishes_cooked
FROM users u
JOIN roles r ON r.id = u."roleId"
LEFT JOIN order_items oi ON oi."chefId" = u.id
WHERE LOWER(r.name) IN ('chef', 'admin')
GROUP BY u.id, u.name, u.username, DATE(COALESCE(oi."readyAt", oi."startedAt", oi."createdAt"))
ORDER BY work_date DESC, items_prepared DESC;

-- 6. View: Service Boy / Waiter Daily Performance (Orders Taken & Dishes Served)
CREATE VIEW view_waiter_daily_performance AS
WITH daily_orders AS (
    SELECT 
        "waiterId" AS user_id,
        DATE("createdAt") AS work_date,
        COUNT(id) AS orders_taken,
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) AS orders_completed,
        COALESCE(SUM("totalAmount"), 0) AS total_order_value
    FROM orders
    GROUP BY "waiterId", DATE("createdAt")
),
daily_deliveries AS (
    SELECT 
        "deliveredById" AS user_id,
        DATE(COALESCE("deliveredAt", "createdAt")) AS work_date,
        COUNT(id) AS dishes_served
    FROM order_items
    WHERE status = 'DELIVERED'
    GROUP BY "deliveredById", DATE(COALESCE("deliveredAt", "createdAt"))
)
SELECT 
    u.id AS waiter_id,
    u.name AS waiter_name,
    u.username AS waiter_username,
    COALESCE(o.work_date, d.work_date, CURRENT_DATE) AS work_date,
    COALESCE(o.orders_taken, 0) AS orders_taken,
    COALESCE(o.orders_completed, 0) AS orders_completed,
    COALESCE(o.total_order_value, 0) AS total_order_value,
    COALESCE(d.dishes_served, 0) AS dishes_served
FROM users u
JOIN roles r ON r.id = u."roleId"
LEFT JOIN daily_orders o ON o.user_id = u.id
LEFT JOIN daily_deliveries d ON d.user_id = u.id AND (o.work_date IS NULL OR d.work_date = o.work_date)
WHERE LOWER(r.name) IN ('staff', 'waiter', 'admin')
ORDER BY work_date DESC, orders_taken DESC;

-- 7. View: Manager / Cashier Daily Billing & Settlement Performance
CREATE VIEW view_manager_daily_performance AS
WITH daily_bills AS (
    SELECT 
        "generatedById" AS user_id,
        DATE("createdAt") AS work_date,
        COUNT(id) AS bills_generated,
        COALESCE(SUM("grandTotal"), 0) AS total_billed_amount
    FROM bills
    GROUP BY "generatedById", DATE("createdAt")
),
daily_payments AS (
    SELECT 
        "recordedById" AS user_id,
        DATE("createdAt") AS work_date,
        COUNT(id) AS payments_collected,
        COALESCE(SUM(amount), 0) AS total_collected_amount,
        COALESCE(SUM(CASE WHEN "paymentMethod" = 'CASH' THEN amount ELSE 0 END), 0) AS cash_collected,
        COALESCE(SUM(CASE WHEN "paymentMethod" = 'UPI' THEN amount ELSE 0 END), 0) AS upi_collected,
        COALESCE(SUM(CASE WHEN "paymentMethod" = 'CARD' THEN amount ELSE 0 END), 0) AS card_collected
    FROM payments
    GROUP BY "recordedById", DATE("createdAt")
)
SELECT 
    u.id AS manager_id,
    u.name AS manager_name,
    u.username AS manager_username,
    COALESCE(b.work_date, p.work_date, CURRENT_DATE) AS work_date,
    COALESCE(b.bills_generated, 0) AS bills_generated,
    COALESCE(b.total_billed_amount, 0) AS total_billed_amount,
    COALESCE(p.payments_collected, 0) AS payments_collected,
    COALESCE(p.total_collected_amount, 0) AS total_collected_amount,
    COALESCE(p.cash_collected, 0) AS cash_collected,
    COALESCE(p.upi_collected, 0) AS upi_collected,
    COALESCE(p.card_collected, 0) AS card_collected
FROM users u
JOIN roles r ON r.id = u."roleId"
LEFT JOIN daily_bills b ON b.user_id = u.id
LEFT JOIN daily_payments p ON p.user_id = u.id AND (b.work_date IS NULL OR p.work_date = b.work_date)
WHERE LOWER(r.name) IN ('manager', 'admin', 'cashier')
ORDER BY work_date DESC, total_collected_amount DESC;

-- 8. Stored Function: Compute Bill Totals (Subtotal, Tax, Discount -> Final Amount)
CREATE FUNCTION fn_calculate_bill_totals(
    p_subtotal NUMERIC,
    p_tax_percentage NUMERIC DEFAULT 5.0,
    p_discount_percentage NUMERIC DEFAULT 0.0
)
RETURNS TABLE (
    subtotal NUMERIC,
    tax_amount NUMERIC,
    discount_amount NUMERIC,
    grand_total NUMERIC
) AS $$
DECLARE
    v_tax NUMERIC;
    v_disc NUMERIC;
    v_total NUMERIC;
BEGIN
    v_tax := ROUND((p_subtotal * (p_tax_percentage / 100.0)), 2);
    v_disc := ROUND((p_subtotal * (p_discount_percentage / 100.0)), 2);
    v_total := ROUND((p_subtotal + v_tax - v_disc), 2);
    
    RETURN QUERY SELECT p_subtotal, v_tax, v_disc, v_total;
END;
$$ LANGUAGE plpgsql;

-- 9. Stored Function: Revenue Report by Date Range
CREATE FUNCTION fn_get_revenue_report(
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    report_start DATE,
    report_end DATE,
    total_orders BIGINT,
    total_settled_bills BIGINT,
    gross_subtotal NUMERIC,
    total_tax NUMERIC,
    total_discount NUMERIC,
    net_revenue NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p_start_date,
        p_end_date,
        (SELECT COUNT(*) FROM orders WHERE DATE("createdAt") BETWEEN p_start_date AND p_end_date),
        COUNT(b.id),
        COALESCE(SUM(b.subtotal), 0),
        COALESCE(SUM(b."taxAmount"), 0),
        COALESCE(SUM(b."discountAmount"), 0),
        COALESCE(SUM(b."grandTotal"), 0)
    FROM bills b
    WHERE b.status = 'PAID'
      AND DATE(b."createdAt") BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql;

-- 10. Stored Function: Staff Daily Comprehensive KPI Report
CREATE FUNCTION fn_get_daily_staff_kpi(
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    user_id UUID,
    user_name VARCHAR,
    role_name VARCHAR,
    items_prepared BIGINT,
    items_served BIGINT,
    orders_taken BIGINT,
    bills_generated BIGINT,
    payments_collected BIGINT,
    total_amount NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id AS user_id,
        u.name AS user_name,
        r.name AS role_name,
        -- Chef KPI
        (SELECT COUNT(*) FROM order_items oi WHERE oi."chefId" = u.id AND oi.status IN ('READY', 'DELIVERED') AND DATE(oi."readyAt") = p_date),
        -- Waiter Delivery KPI
        (SELECT COUNT(*) FROM order_items oi WHERE oi."deliveredById" = u.id AND oi.status = 'DELIVERED' AND DATE(oi."deliveredAt") = p_date),
        -- Waiter Order KPI
        (SELECT COUNT(*) FROM orders o WHERE o."waiterId" = u.id AND DATE(o."createdAt") = p_date),
        -- Manager Bill KPI
        (SELECT COUNT(*) FROM bills b WHERE b."generatedById" = u.id AND DATE(b."createdAt") = p_date),
        -- Manager Payment KPI
        (SELECT COUNT(*) FROM payments p WHERE p."recordedById" = u.id AND DATE(p."createdAt") = p_date),
        -- Financial Volume (Manager collection or Waiter sales)
        COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p."recordedById" = u.id AND DATE(p."createdAt") = p_date), 0)
    FROM users u
    JOIN roles r ON r.id = u."roleId"
    ORDER BY role_name, user_name;
END;
$$ LANGUAGE plpgsql;
