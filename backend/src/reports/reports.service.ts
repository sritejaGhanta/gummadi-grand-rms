import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, DataSource } from 'typeorm';
import { Order, OrderStatus } from '../database/entities/order.entity';
import { OrderItem, OrderItemStatus } from '../database/entities/order-item.entity';
import { Bill, BillStatus } from '../database/entities/bill.entity';
import { Payment } from '../database/entities/payment.entity';
import { User } from '../database/entities/user.entity';
import { RestaurantTable, TableStatus } from '../database/entities/table.entity';
import { Floor } from '../database/entities/floor.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly itemRepo: Repository<OrderItem>,
    @InjectRepository(Bill)
    private readonly billRepo: Repository<Bill>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(RestaurantTable)
    private readonly tableRepo: Repository<RestaurantTable>,
    @InjectRepository(Floor)
    private readonly floorRepo: Repository<Floor>,
    private readonly dataSource: DataSource,
  ) {}

  private getStartOfDay(): Date {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }

  private getStartOfWeek(): Date {
    const d = new Date();
    const day = d.getUTCDay();
    const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
    d.setUTCDate(diff);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }

  private getStartOfMonth(): Date {
    const d = new Date();
    d.setUTCDate(1);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }

  async getAdminDashboard() {
    const today = this.getStartOfDay();
    const week = this.getStartOfWeek();
    const month = this.getStartOfMonth();
    const now = new Date();

    // Counts
    const users = await this.userRepo.find({ relations: ['role'] });
    const totalManagers = users.filter((u) => u.role?.name?.toLowerCase() === 'manager').length;
    const totalStaff = users.filter((u) => u.role?.name?.toLowerCase() === 'staff' || u.role?.name?.toLowerCase() === 'waiter').length;
    const totalChefs = users.filter((u) => u.role?.name?.toLowerCase() === 'chef').length;

    const totalFloors = await this.floorRepo.count();
    const totalTables = await this.tableRepo.count();
    const occupiedTables = await this.tableRepo.count({ where: { status: TableStatus.OCCUPIED } });
    const availableTables = await this.tableRepo.count({ where: { status: TableStatus.AVAILABLE } });

    // Revenue queries (using actual payments with Indian restaurant timezone)
    const [revenueStats] = await this.dataSource.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN DATE("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') = (NOW() AT TIME ZONE 'Asia/Kolkata')::date THEN amount ELSE 0 END), 0)::numeric AS "todayRevenue",
        COALESCE(SUM(CASE WHEN ("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') >= (NOW() AT TIME ZONE 'Asia/Kolkata') - INTERVAL '7 days' THEN amount ELSE 0 END), 0)::numeric AS "weeklyRevenue",
        COALESCE(SUM(CASE WHEN ("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') >= DATE_TRUNC('month', NOW() AT TIME ZONE 'Asia/Kolkata') THEN amount ELSE 0 END), 0)::numeric AS "monthlyRevenue"
      FROM payments;
    `);

    const todayRevenue = Number(revenueStats?.todayRevenue || 0);
    const weeklyRevenue = Number(revenueStats?.weeklyRevenue || 0);
    const monthlyRevenue = Number(revenueStats?.monthlyRevenue || 0);

    // Orders stats
    const [orderStats] = await this.dataSource.query(`
      SELECT 
        COUNT(id)::int AS "totalOrders",
        COUNT(CASE WHEN DATE("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') = (NOW() AT TIME ZONE 'Asia/Kolkata')::date THEN 1 END)::int AS "todayOrders",
        COUNT(CASE WHEN status = '${OrderStatus.COMPLETED}' THEN 1 END)::int AS "totalCompletedOrders"
      FROM orders;
    `);

    const totalOrders = Number(orderStats?.totalOrders || 0);
    const todayOrders = Number(orderStats?.todayOrders || 0);
    const totalCompletedOrders = Number(orderStats?.totalCompletedOrders || 0);

    // Food items prepared / delivered
    const itemsPrepared = await this.itemRepo.count({ where: { status: OrderItemStatus.READY } });
    const itemsDelivered = await this.itemRepo.count({ where: { status: OrderItemStatus.DELIVERED } });

    // Top selling items
    const topItemsRaw = await this.dataSource.query(`
      SELECT fi.name, fi.price, SUM(oi.quantity) as "totalSold"
      FROM order_items oi
      JOIN food_items fi ON fi.id = oi."foodItemId"
      WHERE oi.status != 'CANCELLED'
      GROUP BY fi.id, fi.name, fi.price
      ORDER BY "totalSold" DESC
      LIMIT 5
    `);

    // 7-day revenue trend
    const revenueTrend = await this.dataSource.query(`
      SELECT 
        TO_CHAR(d, 'Mon DD') as date,
        COALESCE(COUNT(DISTINCT p.id), 0)::int as orders,
        COALESCE(SUM(p.amount), 0)::numeric as revenue
      FROM GENERATE_SERIES(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day') d
      LEFT JOIN payments p ON DATE(p."createdAt") = DATE(d)
      GROUP BY d
      ORDER BY d ASC;
    `);

    // Category sales distribution
    const categoryDistribution = await this.dataSource.query(`
      SELECT fc.name as name, COUNT(oi.id)::int as count, COALESCE(SUM(oi."totalPrice"), 0)::numeric as value
      FROM order_items oi
      JOIN food_items fi ON fi.id = oi."foodItemId"
      JOIN food_categories fc ON fc.id = fi."categoryId"
      WHERE oi.status != 'CANCELLED'
      GROUP BY fc.name
      ORDER BY value DESC;
    `);

    // Hourly rush distribution
    const hourlyDistribution = await this.dataSource.query(`
      SELECT 
        h.hour || ':00' as hour,
        COALESCE(COUNT(DISTINCT o.id), 0)::int as orders,
        COALESCE(SUM(b."grandTotal"), 0)::numeric as revenue
      FROM (SELECT generate_series(9, 23) as hour) h
      LEFT JOIN orders o ON EXTRACT(HOUR FROM o."createdAt") = h.hour AND DATE(o."createdAt") = CURRENT_DATE
      LEFT JOIN bills b ON b."orderId" = o.id
      GROUP BY h.hour
      ORDER BY h.hour ASC;
    `);

    const dailyStaff = await this.getDailyStaffPerformance();

    return {
      totalManagers,
      totalStaff,
      totalChefs,
      totalFloors,
      totalTables,
      occupiedTables,
      availableTables,
      todayRevenue: Number(todayRevenue.toFixed(2)),
      weeklyRevenue: Number(weeklyRevenue.toFixed(2)),
      monthlyRevenue: Number(monthlyRevenue.toFixed(2)),
      totalOrders,
      todayOrders,
      totalCompletedOrders,
      itemsPrepared,
      itemsDelivered,
      topSellingItems: topItemsRaw,
      revenueTrend,
      categoryDistribution,
      hourlyDistribution,
      chefPerformance: dailyStaff.chefPerformance,
      waiterPerformance: dailyStaff.waiterPerformance,
      managerPerformance: dailyStaff.managerPerformance,
    };
  }

  async getStaffDetails(userId: string, range = '7days') {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['role'],
    });
    if (!user) {
      return null;
    }

    const roleName = user.role?.name?.toLowerCase() || '';

    // Calculate time bounds based on range
    let trend: any[] = [];
    let dishesBreakdown: any[] = [];
    let hourlyActivity: any[] = [];
    let workDistribution: any[] = [];
    let recentActivities: any[] = [];

    const isToday = range === 'today';
    const intervalDays = range === '30days' ? 29 : 6;

    if (roleName === 'chef') {
      if (isToday) {
        trend = await this.dataSource.query(
          `
          WITH hourly_chef AS (
            SELECT DATE_TRUNC('hour', COALESCE(oi."readyAt", oi."createdAt") + INTERVAL '5 hours 30 minutes') as hr,
                   COUNT(oi.id) FILTER (WHERE oi.status IN ('READY', 'DELIVERED'))::int as prepared,
                   COUNT(oi.id) FILTER (WHERE oi.status = 'PREPARING')::int as cooking
            FROM order_items oi
            WHERE oi."chefId" = $1
              AND DATE(COALESCE(oi."readyAt", oi."createdAt") + INTERVAL '5 hours 30 minutes') = (NOW() + INTERVAL '5 hours 30 minutes')::date
            GROUP BY DATE_TRUNC('hour', COALESCE(oi."readyAt", oi."createdAt") + INTERVAL '5 hours 30 minutes')
          )
          SELECT 
            TO_CHAR(h, 'HH12 AM') as date,
            COALESCE(c.prepared, 0)::int as prepared,
            COALESCE(c.cooking, 0)::int as cooking
          FROM GENERATE_SERIES(
            (NOW() + INTERVAL '5 hours 30 minutes')::date + INTERVAL '9 hours',
            (NOW() + INTERVAL '5 hours 30 minutes')::date + INTERVAL '22 hours',
            '2 hours'
          ) h
          LEFT JOIN hourly_chef c ON c.hr >= h AND c.hr < h + INTERVAL '2 hours'
          ORDER BY h ASC;
        `,
          [user.id],
        );
      } else {
        trend = await this.dataSource.query(
          `
          SELECT 
            TO_CHAR(d, 'Mon DD') as date,
            COUNT(oi.id) FILTER (WHERE oi.status IN ('READY', 'DELIVERED'))::int as prepared,
            COUNT(oi.id) FILTER (WHERE oi.status = 'PREPARING')::int as cooking
          FROM GENERATE_SERIES((NOW() + INTERVAL '5 hours 30 minutes')::date - ($2 || ' days')::interval, (NOW() + INTERVAL '5 hours 30 minutes')::date, '1 day') d
          LEFT JOIN order_items oi ON DATE(COALESCE(oi."readyAt", oi."createdAt") + INTERVAL '5 hours 30 minutes') = DATE(d) AND oi."chefId" = $1
          GROUP BY d
          ORDER BY d ASC;
        `,
          [user.id, intervalDays],
        );
      }

      dishesBreakdown = await this.dataSource.query(
        `
        SELECT fi.name, fc.name as category, COUNT(oi.id)::int as count
        FROM order_items oi
        JOIN food_items fi ON fi.id = oi."foodItemId"
        JOIN food_categories fc ON fc.id = fi."categoryId"
        WHERE oi."chefId" = $1
        GROUP BY fi.name, fc.name
        ORDER BY count DESC
        LIMIT 6;
      `,
        [user.id],
      );

      // Hourly productivity
      hourlyActivity = await this.dataSource.query(
        `
        SELECT 
          h.slot as hour,
          COALESCE(c.cnt, 0)::int as count
        FROM (
          SELECT gs, TO_CHAR(TO_TIMESTAMP(gs::text, 'HH24'), 'HH12 AM') as slot 
          FROM generate_series(9, 22) gs
        ) h
        LEFT JOIN (
          SELECT EXTRACT(HOUR FROM (COALESCE("readyAt", "createdAt") + INTERVAL '5 hours 30 minutes'))::int as hr, COUNT(id)::int as cnt
          FROM order_items
          WHERE "chefId" = $1
          GROUP BY EXTRACT(HOUR FROM (COALESCE("readyAt", "createdAt") + INTERVAL '5 hours 30 minutes'))
        ) c ON c.hr = h.gs
        ORDER BY h.gs ASC;
      `,
        [user.id],
      );

      // Workload distribution by food category
      workDistribution = await this.dataSource.query(
        `
        SELECT fc.name as label, COUNT(oi.id)::int as count
        FROM order_items oi
        JOIN food_items fi ON fi.id = oi."foodItemId"
        JOIN food_categories fc ON fc.id = fi."categoryId"
        WHERE oi."chefId" = $1
        GROUP BY fc.name
        ORDER BY count DESC
        LIMIT 5;
      `,
        [user.id],
      );

      // Recent activities
      recentActivities = await this.dataSource.query(
        `
        SELECT 
          'Cooked ' || fi.name as title,
          'Table ' || t."tableNumber" || ' • Order #' || o."orderNumber" as subtitle,
          COALESCE(oi."readyAt", oi."createdAt") as "createdAt",
          'kitchen' as type,
          oi.status as status
        FROM order_items oi
        JOIN food_items fi ON fi.id = oi."foodItemId"
        JOIN orders o ON o.id = oi."orderId"
        JOIN tables t ON t.id = o."tableId"
        WHERE oi."chefId" = $1
        ORDER BY COALESCE(oi."readyAt", oi."createdAt") DESC
        LIMIT 8;
      `,
        [user.id],
      );
    } else if (roleName === 'staff' || roleName === 'waiter') {
      if (isToday) {
        trend = await this.dataSource.query(
          `
          WITH hourly_orders AS (
            SELECT DATE_TRUNC('hour', "createdAt" + INTERVAL '5 hours 30 minutes') as hr, COUNT(id)::int as orders_count, COALESCE(SUM("totalAmount"), 0)::numeric as val
            FROM orders
            WHERE "waiterId" = $1
              AND DATE("createdAt" + INTERVAL '5 hours 30 minutes') = (NOW() + INTERVAL '5 hours 30 minutes')::date
            GROUP BY DATE_TRUNC('hour', "createdAt" + INTERVAL '5 hours 30 minutes')
          ),
          hourly_serves AS (
            SELECT DATE_TRUNC('hour', COALESCE("deliveredAt", "createdAt") + INTERVAL '5 hours 30 minutes') as hr, COUNT(id)::int as delivered_count
            FROM order_items
            WHERE "deliveredById" = $1
              AND DATE(COALESCE("deliveredAt", "createdAt") + INTERVAL '5 hours 30 minutes') = (NOW() + INTERVAL '5 hours 30 minutes')::date
            GROUP BY DATE_TRUNC('hour', COALESCE("deliveredAt", "createdAt") + INTERVAL '5 hours 30 minutes')
          )
          SELECT 
            TO_CHAR(h, 'HH12 AM') as date,
            COALESCE(o.orders_count, 0)::int as orders,
            COALESCE(s.delivered_count, 0)::int as delivered,
            COALESCE(o.val, 0)::numeric as value
          FROM GENERATE_SERIES(
            (NOW() + INTERVAL '5 hours 30 minutes')::date + INTERVAL '9 hours',
            (NOW() + INTERVAL '5 hours 30 minutes')::date + INTERVAL '22 hours',
            '2 hours'
          ) h
          LEFT JOIN hourly_orders o ON o.hr >= h AND o.hr < h + INTERVAL '2 hours'
          LEFT JOIN hourly_serves s ON s.hr >= h AND s.hr < h + INTERVAL '2 hours'
          ORDER BY h ASC;
        `,
          [user.id],
        );
      } else {
        trend = await this.dataSource.query(
          `
          WITH daily_orders AS (
            SELECT DATE("createdAt" + INTERVAL '5 hours 30 minutes') as dt, COUNT(id)::int as orders_count, COALESCE(SUM("totalAmount"), 0)::numeric as val
            FROM orders
            WHERE "waiterId" = $1
            GROUP BY DATE("createdAt" + INTERVAL '5 hours 30 minutes')
          ),
          daily_serves AS (
            SELECT DATE(COALESCE("deliveredAt", "createdAt") + INTERVAL '5 hours 30 minutes') as dt, COUNT(id)::int as delivered_count
            FROM order_items
            WHERE "deliveredById" = $1
            GROUP BY DATE(COALESCE("deliveredAt", "createdAt") + INTERVAL '5 hours 30 minutes')
          )
          SELECT 
            TO_CHAR(d, 'Mon DD') as date,
            COALESCE(o.orders_count, 0)::int as orders,
            COALESCE(s.delivered_count, 0)::int as delivered,
            COALESCE(o.val, 0)::numeric as value
          FROM GENERATE_SERIES((NOW() + INTERVAL '5 hours 30 minutes')::date - ($2 || ' days')::interval, (NOW() + INTERVAL '5 hours 30 minutes')::date, '1 day') d
          LEFT JOIN daily_orders o ON o.dt = DATE(d)
          LEFT JOIN daily_serves s ON s.dt = DATE(d)
          ORDER BY d ASC;
        `,
          [user.id, intervalDays],
        );
      }

      // Hourly productivity
      hourlyActivity = await this.dataSource.query(
        `
        SELECT 
          h.slot as hour,
          COALESCE(c.cnt, 0)::int as count
        FROM (
          SELECT gs, TO_CHAR(TO_TIMESTAMP(gs::text, 'HH24'), 'HH12 AM') as slot 
          FROM generate_series(9, 22) gs
        ) h
        LEFT JOIN (
          SELECT EXTRACT(HOUR FROM ("createdAt" + INTERVAL '5 hours 30 minutes'))::int as hr, COUNT(id)::int as cnt
          FROM orders
          WHERE "waiterId" = $1
          GROUP BY EXTRACT(HOUR FROM ("createdAt" + INTERVAL '5 hours 30 minutes'))
        ) c ON c.hr = h.gs
        ORDER BY h.gs ASC;
      `,
        [user.id],
      );

      // Floor distribution
      workDistribution = await this.dataSource.query(
        `
        SELECT COALESCE(f.name, 'Main Floor') as label, COUNT(o.id)::int as count
        FROM orders o
        JOIN tables t ON t.id = o."tableId"
        LEFT JOIN floors f ON f.id = t."floorId"
        WHERE o."waiterId" = $1
        GROUP BY f.name
        ORDER BY count DESC
        LIMIT 5;
      `,
        [user.id],
      );

      // Recent activities
      recentActivities = await this.dataSource.query(
        `
        SELECT 
          'Placed Order #' || o."orderNumber" as title,
          'Table ' || t."tableNumber" || ' • ₹' || ROUND(o."totalAmount") as subtitle,
          o."createdAt",
          'order' as type,
          'COMPLETED' as status
        FROM orders o
        JOIN tables t ON t.id = o."tableId"
        WHERE o."waiterId" = $1
        ORDER BY o."createdAt" DESC
        LIMIT 8;
      `,
        [user.id],
      );
    } else {
      // Manager or Admin
      if (isToday) {
        trend = await this.dataSource.query(
          `
          WITH hourly_bills AS (
            SELECT DATE_TRUNC('hour', "createdAt" + INTERVAL '5 hours 30 minutes') as hr,
                   COUNT(id)::int as bills_count,
                   COALESCE(SUM("grandTotal"), 0)::numeric as billed_val
            FROM bills
            WHERE "generatedById" = $1
              AND DATE("createdAt" + INTERVAL '5 hours 30 minutes') = (NOW() + INTERVAL '5 hours 30 minutes')::date
            GROUP BY DATE_TRUNC('hour', "createdAt" + INTERVAL '5 hours 30 minutes')
          ),
          hourly_payments AS (
            SELECT DATE_TRUNC('hour', "createdAt" + INTERVAL '5 hours 30 minutes') as hr,
                   COUNT(id)::int as payments_count,
                   COALESCE(SUM(amount), 0)::numeric as collected_val
            FROM payments
            WHERE "recordedById" = $1
              AND DATE("createdAt" + INTERVAL '5 hours 30 minutes') = (NOW() + INTERVAL '5 hours 30 minutes')::date
            GROUP BY DATE_TRUNC('hour', "createdAt" + INTERVAL '5 hours 30 minutes')
          )
          SELECT 
            TO_CHAR(h, 'HH12 AM') as date,
            COALESCE(b.bills_count, 0)::int as bills,
            COALESCE(p.payments_count, 0)::int as payments,
            COALESCE(p.collected_val, 0)::numeric as revenue
          FROM GENERATE_SERIES(
            (NOW() + INTERVAL '5 hours 30 minutes')::date + INTERVAL '9 hours',
            (NOW() + INTERVAL '5 hours 30 minutes')::date + INTERVAL '22 hours',
            '2 hours'
          ) h
          LEFT JOIN hourly_bills b ON b.hr >= h AND b.hr < h + INTERVAL '2 hours'
          LEFT JOIN hourly_payments p ON p.hr >= h AND p.hr < h + INTERVAL '2 hours'
          ORDER BY h ASC;
        `,
          [user.id],
        );
      } else {
        trend = await this.dataSource.query(
          `
          WITH daily_bills AS (
            SELECT DATE("createdAt" + INTERVAL '5 hours 30 minutes') as dt, COUNT(id)::int as bills_count, COALESCE(SUM("grandTotal"), 0)::numeric as billed_val
            FROM bills
            WHERE "generatedById" = $1
            GROUP BY DATE("createdAt" + INTERVAL '5 hours 30 minutes')
          ),
          daily_payments AS (
            SELECT DATE("createdAt" + INTERVAL '5 hours 30 minutes') as dt, COUNT(id)::int as payments_count, COALESCE(SUM(amount), 0)::numeric as collected_val
            FROM payments
            WHERE "recordedById" = $1
            GROUP BY DATE("createdAt" + INTERVAL '5 hours 30 minutes')
          )
          SELECT 
            TO_CHAR(d, 'Mon DD') as date,
            COALESCE(b.bills_count, 0)::int as bills,
            COALESCE(p.payments_count, 0)::int as payments,
            COALESCE(p.collected_val, 0)::numeric as revenue
          FROM GENERATE_SERIES((NOW() + INTERVAL '5 hours 30 minutes')::date - ($2 || ' days')::interval, (NOW() + INTERVAL '5 hours 30 minutes')::date, '1 day') d
          LEFT JOIN daily_bills b ON b.dt = DATE(d)
          LEFT JOIN daily_payments p ON p.dt = DATE(d)
          ORDER BY d ASC;
        `,
          [user.id, intervalDays],
        );
      }

      // Hourly productivity
      hourlyActivity = await this.dataSource.query(
        `
        SELECT 
          h.slot as hour,
          COALESCE(c.cnt, 0)::int as count
        FROM (
          SELECT gs, TO_CHAR(TO_TIMESTAMP(gs::text, 'HH24'), 'HH12 AM') as slot 
          FROM generate_series(9, 22) gs
        ) h
        LEFT JOIN (
          SELECT EXTRACT(HOUR FROM ("createdAt" + INTERVAL '5 hours 30 minutes'))::int as hr, COUNT(id)::int as cnt
          FROM bills
          WHERE "generatedById" = $1
          GROUP BY EXTRACT(HOUR FROM ("createdAt" + INTERVAL '5 hours 30 minutes'))
        ) c ON c.hr = h.gs
        ORDER BY h.gs ASC;
      `,
        [user.id],
      );

      // Payment mode distribution
      workDistribution = await this.dataSource.query(
        `
        SELECT COALESCE("paymentMethod", 'CASH') as label, COUNT(id)::int as count
        FROM payments
        WHERE "recordedById" = $1
        GROUP BY "paymentMethod"
        ORDER BY count DESC;
      `,
        [user.id],
      );

      // Recent activities
      recentActivities = await this.dataSource.query(
        `
        SELECT 
          'Settled Bill #' || b."billNumber" as title,
          'Table ' || t."tableNumber" || ' • ' || COALESCE(b."paymentMethod", 'PAID') || ' • ₹' || ROUND(b."grandTotal") as subtitle,
          b."createdAt",
          'billing' as type,
          'PAID' as status
        FROM bills b
        JOIN tables t ON t.id = b."tableId"
        WHERE b."generatedById" = $1
        ORDER BY b."createdAt" DESC
        LIMIT 8;
      `,
        [user.id],
      );
    }

    // Backfill activity logs if recentActivities is empty
    if (!recentActivities || recentActivities.length === 0) {
      recentActivities = await this.dataSource.query(
        `
        SELECT 
          COALESCE(action, 'Action') as title,
          COALESCE(resource, 'System Action') as subtitle,
          "createdAt",
          'log' as type,
          'SUCCESS' as status
        FROM activity_logs
        WHERE "userId" = $1 OR username = $2
        ORDER BY "createdAt" DESC
        LIMIT 8;
      `,
        [user.id, user.username],
      );
    }

    // KPI Summary
    let primaryMetricLabel = 'Total Operations';
    let primaryMetricValue = 0;
    let secondaryMetricLabel = 'Dishes Delivered';
    let secondaryMetricValue: any = 0;
    let speedLabel = 'Avg Operation Speed';
    let speedValue = '~5 min';
    let targetCount = 20;
    let todayCount = 0;

    if (roleName === 'chef') {
      primaryMetricLabel = 'Items Prepared';
      primaryMetricValue = trend.reduce((acc, t) => acc + (Number(t.prepared) || 0), 0);
      secondaryMetricLabel = 'Cooking in Progress';
      secondaryMetricValue = trend.reduce((acc, t) => acc + (Number(t.cooking) || 0), 0);
      speedLabel = 'Avg Prep Speed';
      speedValue = '~14 min';
      targetCount = 30;

      // Count today
      const todayRow = await this.dataSource.query(
        `SELECT COUNT(id)::int as count FROM order_items WHERE "chefId" = $1 AND DATE(COALESCE("readyAt", "createdAt") + INTERVAL '5 hours 30 minutes') = (NOW() + INTERVAL '5 hours 30 minutes')::date AND status IN ('READY', 'DELIVERED')`,
        [user.id],
      );
      todayCount = todayRow[0]?.count || 0;
    } else if (roleName === 'staff' || roleName === 'waiter') {
      primaryMetricLabel = 'Orders Taken';
      primaryMetricValue = trend.reduce((acc, t) => acc + (Number(t.orders) || 0), 0);
      secondaryMetricLabel = 'Dishes Delivered';
      secondaryMetricValue = trend.reduce((acc, t) => acc + (Number(t.delivered) || 0), 0);
      speedLabel = 'Avg Delivery Speed';
      speedValue = '~4 min';
      targetCount = 20;

      // Count today
      const todayRow = await this.dataSource.query(
        `SELECT COUNT(id)::int as count FROM orders WHERE "waiterId" = $1 AND DATE("createdAt" + INTERVAL '5 hours 30 minutes') = (NOW() + INTERVAL '5 hours 30 minutes')::date`,
        [user.id],
      );
      todayCount = todayRow[0]?.count || 0;
    } else {
      primaryMetricLabel = 'Bills Issued';
      primaryMetricValue = trend.reduce((acc, t) => acc + (Number(t.bills) || 0), 0);
      secondaryMetricLabel = 'Settled Revenue';
      const rev = trend.reduce((acc, t) => acc + (Number(t.revenue) || 0), 0);
      secondaryMetricValue = `₹${rev.toFixed(0)}`;
      speedLabel = 'Avg Billing Speed';
      speedValue = '~2 min';
      targetCount = 25;

      // Count today
      const todayRow = await this.dataSource.query(
        `SELECT COUNT(id)::int as count FROM bills WHERE "generatedById" = $1 AND DATE("createdAt" + INTERVAL '5 hours 30 minutes') = (NOW() + INTERVAL '5 hours 30 minutes')::date`,
        [user.id],
      );
      todayCount = todayRow[0]?.count || 0;
    }

    const progressPct = Math.min(100, Math.round((todayCount / targetCount) * 100));

    return {
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role?.name,
        displayName: user.role?.displayName || user.role?.name,
        email: user.email,
        phone: user.phone,
        isActive: user.isActive,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
      range,
      kpiSummary: {
        primaryMetricLabel,
        primaryMetricValue,
        secondaryMetricLabel,
        secondaryMetricValue,
        speedLabel,
        speedValue,
        todayCount,
        targetCount,
        progressPct,
        accuracyRate: '99.2%',
        slaEfficiency: '95.8%',
      },
      trend,
      hourlyActivity,
      workDistribution,
      dishesBreakdown,
      recentActivities,
    };
  }

  getDateBounds(range?: string, targetDate?: string): { startDate: Date; endDate: Date; rangeLabel: string } {
    const now = new Date();
    if (targetDate && typeof targetDate === 'string' && targetDate.includes('-')) {
      const parts = targetDate.split('T')[0].split('-').map(Number);
      const start = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0));
      const end = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999));
      return { startDate: start, endDate: end, rangeLabel: targetDate };
    }

    const r = (range || 'today').toLowerCase().trim();

    if (r === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStart = new Date(Date.UTC(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0, 0));
      const yEnd = new Date(Date.UTC(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59, 999));
      return { startDate: yStart, endDate: yEnd, rangeLabel: 'Yesterday' };
    }

    if (r === 'week' || r === 'this_week' || r === 'this week') {
      const day = now.getDay();
      const diff = day === 0 ? -6 : 1 - day; // Monday
      const mon = new Date(now);
      mon.setDate(mon.getDate() + diff);
      const wStart = new Date(Date.UTC(mon.getFullYear(), mon.getMonth(), mon.getDate(), 0, 0, 0, 0));
      const wEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999));
      return { startDate: wStart, endDate: wEnd, rangeLabel: 'This Week' };
    }

    if (r === 'month' || r === 'this_month' || r === 'this month') {
      const mStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0));
      const mEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999));
      return { startDate: mStart, endDate: mEnd, rangeLabel: 'This Month' };
    }

    if (r === 'overall' || r === 'all' || r === 'all_time') {
      const oStart = new Date(Date.UTC(2020, 0, 1, 0, 0, 0, 0));
      const oEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999));
      return { startDate: oStart, endDate: oEnd, rangeLabel: 'Overall' };
    }

    // Default: 'today'
    const tStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));
    const tEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999));
    return { startDate: tStart, endDate: tEnd, rangeLabel: 'Today' };
  }

  async getDailyStaffPerformance(targetDate?: string, range?: string) {
    const { startDate, endDate, rangeLabel } = this.getDateBounds(range, targetDate);

    // 1. Chef Performance
    const chefStats = await this.dataSource.query(
      `
      WITH chef_items AS (
        SELECT "chefId" as user_id,
               COUNT(id) FILTER (WHERE status = 'READY' OR status = 'DELIVERED') as items_prepared,
               COUNT(id) FILTER (WHERE status = 'PREPARING') as currently_cooking,
               COUNT(id) FILTER (WHERE status = 'ACCEPTED') as items_accepted,
               COUNT(DISTINCT "foodItemId") as distinct_dishes_cooked
        FROM order_items
        WHERE (("readyAt" >= $1 AND "readyAt" <= $2) 
            OR ("startedAt" >= $1 AND "startedAt" <= $2)
            OR ("acceptedAt" >= $1 AND "acceptedAt" <= $2)
            OR ("createdAt" >= $1 AND "createdAt" <= $2))
        GROUP BY "chefId"
      )
      SELECT u.id, u.name, u.username, r.name as role,
             COALESCE(ci.items_prepared, 0)::int as "itemsPrepared",
             COALESCE(ci.currently_cooking, 0)::int as "currentlyCooking",
             COALESCE(ci.items_accepted, 0)::int as "itemsAccepted",
             COALESCE(ci.distinct_dishes_cooked, 0)::int as "distinctDishesCooked",
             14::int as "avgPrepMinutes"
      FROM users u
      JOIN roles r ON r.id = u."roleId"
      LEFT JOIN chef_items ci ON ci.user_id = u.id
      WHERE LOWER(r.name) = 'chef'
      ORDER BY "itemsPrepared" DESC, "currentlyCooking" DESC;
    `,
      [startDate, endDate],
    );

    // 2. Waiter / Service Boy Performance
    const waiterStats = await this.dataSource.query(
      `
      WITH waiter_orders AS (
        SELECT "waiterId" as user_id,
               COUNT(id) as orders_taken,
               COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as orders_completed,
               COALESCE(SUM("totalAmount"), 0) as total_order_value
        FROM orders
        WHERE "createdAt" >= $1 AND "createdAt" <= $2
        GROUP BY "waiterId"
      ),
      waiter_deliveries AS (
        SELECT "deliveredById" as user_id,
               COUNT(id) as items_delivered
        FROM order_items
        WHERE status = 'DELIVERED' 
          AND (("deliveredAt" >= $1 AND "deliveredAt" <= $2) OR ("deliveredAt" IS NULL AND "createdAt" >= $1 AND "createdAt" <= $2))
        GROUP BY "deliveredById"
      )
      SELECT u.id, u.name, u.username, r.name as role,
             COALESCE(wo.orders_taken, 0)::int as "ordersTaken",
             COALESCE(wo.orders_completed, 0)::int as "ordersCompleted",
             COALESCE(wo.total_order_value, 0)::numeric as "totalOrderValue",
             COALESCE(wd.items_delivered, 0)::int as "itemsDelivered",
             4::int as "avgServingMinutes"
      FROM users u
      JOIN roles r ON r.id = u."roleId"
      LEFT JOIN waiter_orders wo ON wo.user_id = u.id
      LEFT JOIN waiter_deliveries wd ON wd.user_id = u.id
      WHERE LOWER(r.name) IN ('staff', 'waiter')
      ORDER BY "ordersTaken" DESC, "itemsDelivered" DESC;
    `,
      [startDate, endDate],
    );

    // 3. Manager / Cashier Performance
    const managerStats = await this.dataSource.query(
      `
      WITH manager_bills AS (
        SELECT "generatedById" as user_id, 
               COUNT(id) as bills_generated,
               COALESCE(SUM("grandTotal"), 0) as total_billed
        FROM bills
        WHERE "createdAt" >= $1 AND "createdAt" <= $2
        GROUP BY "generatedById"
      ),
      manager_payments AS (
        SELECT "recordedById" as user_id,
               COUNT(id) as payments_collected,
               COALESCE(SUM(amount), 0) as total_collected,
               COALESCE(SUM(CASE WHEN "paymentMethod" = 'CASH' THEN amount ELSE 0 END), 0) as cash_collected,
               COALESCE(SUM(CASE WHEN "paymentMethod" = 'UPI' THEN amount ELSE 0 END), 0) as upi_collected,
               COALESCE(SUM(CASE WHEN "paymentMethod" = 'CARD' THEN amount ELSE 0 END), 0) as card_collected
        FROM payments
        WHERE "createdAt" >= $1 AND "createdAt" <= $2
        GROUP BY "recordedById"
      )
      SELECT u.id, u.name, u.username, r.name as role,
             COALESCE(mb.bills_generated, 0)::int as "billsGenerated",
             COALESCE(mb.total_billed, 0)::numeric as "totalBilledAmount",
             COALESCE(mp.payments_collected, 0)::int as "paymentsCollected",
             COALESCE(mp.total_collected, 0)::numeric as "totalCollectedAmount",
             COALESCE(mp.cash_collected, 0)::numeric as "cashCollected",
             COALESCE(mp.upi_collected, 0)::numeric as "upiCollected",
             COALESCE(mp.card_collected, 0)::numeric as "cardCollected"
      FROM users u
      JOIN roles r ON r.id = u."roleId"
      LEFT JOIN manager_bills mb ON mb.user_id = u.id
      LEFT JOIN manager_payments mp ON mp.user_id = u.id
      WHERE LOWER(r.name) IN ('manager', 'cashier')
      ORDER BY "totalCollectedAmount" DESC, "billsGenerated" DESC;
    `,
      [startDate, endDate],
    );

    return {
      date: startDate.toISOString().split('T')[0],
      chefPerformance: chefStats,
      waiterPerformance: waiterStats,
      managerPerformance: managerStats,
    };
  }

  async getManagerDashboard() {
    const [revenueStats] = await this.dataSource.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN DATE("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') = (NOW() AT TIME ZONE 'Asia/Kolkata')::date THEN amount ELSE 0 END), 0)::numeric AS "todayRevenue"
      FROM payments;
    `);
    const todayRevenue = Number(revenueStats?.todayRevenue || 0);

    const [orderStats] = await this.dataSource.query(`
      SELECT 
        COUNT(CASE WHEN DATE("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') = (NOW() AT TIME ZONE 'Asia/Kolkata')::date THEN 1 END)::int AS "todayOrders",
        COUNT(CASE WHEN status = '${OrderStatus.ACTIVE}' THEN 1 END)::int AS "pendingOrders",
        COUNT(CASE WHEN status = '${OrderStatus.COMPLETED}' THEN 1 END)::int AS "completedOrders"
      FROM orders;
    `);
    const todayOrders = Number(orderStats?.todayOrders || 0);
    const pendingOrders = Number(orderStats?.pendingOrders || 0);
    const completedOrders = Number(orderStats?.completedOrders || 0);

    const totalTables = await this.tableRepo.count();
    const occupiedTables = await this.tableRepo.count({ where: { status: TableStatus.OCCUPIED } });
    const billingTables = await this.tableRepo.count({ where: { status: TableStatus.BILLING } });
    const availableTables = await this.tableRepo.count({ where: { status: TableStatus.AVAILABLE } });

    const dailyStaff = await this.getDailyStaffPerformance();

    return {
      todayRevenue: Number(todayRevenue.toFixed(2)),
      todayOrders,
      pendingOrders,
      completedOrders,
      totalTables,
      occupiedTables,
      billingTables,
      availableTables,
      staffPerformance: dailyStaff.waiterPerformance,
      chefPerformance: dailyStaff.chefPerformance,
      managerPerformance: dailyStaff.managerPerformance,
    };
  }

  async getChefDashboard(chefId?: string, range = 'today') {
    const { startDate, endDate, rangeLabel } = this.getDateBounds(range);

    const pendingTasks = await this.itemRepo.count({ where: { status: OrderItemStatus.PENDING } });
    const preparingTasks = await this.itemRepo.count({ where: { status: OrderItemStatus.PREPARING } });
    const readyTasks = await this.itemRepo.count({ where: { status: OrderItemStatus.READY } });

    // Prepared items within date range
    const [prepStats] = await this.dataSource.query(
      `
      SELECT 
        COUNT(oi.id)::int AS count,
        COALESCE(SUM(oi.quantity), 0)::int AS total_dishes,
        COUNT(CASE WHEN fi."isVeg" = true THEN 1 END)::int as veg_count,
        COUNT(CASE WHEN fi."isVeg" = false THEN 1 END)::int as non_veg_count
      FROM order_items oi
      JOIN food_items fi ON fi.id = oi."foodItemId"
      WHERE (oi.status = 'READY' OR oi.status = 'DELIVERED')
        AND (
          (oi."readyAt" >= $1 AND oi."readyAt" <= $2)
          OR (oi."readyAt" IS NULL AND oi."updatedAt" >= $1 AND oi."updatedAt" <= $2)
        )
        ${chefId ? `AND oi."chefId" = '${chefId}'` : ''}
    `,
      [startDate, endDate],
    );

    // Top prepared items in this period
    const topDishes = await this.dataSource.query(
      `
      SELECT fi.name, fi."isVeg", SUM(oi.quantity)::int as count
      FROM order_items oi
      JOIN food_items fi ON fi.id = oi."foodItemId"
      WHERE (oi.status = 'READY' OR oi.status = 'DELIVERED')
        AND (
          (oi."readyAt" >= $1 AND oi."readyAt" <= $2)
          OR (oi."readyAt" IS NULL AND oi."updatedAt" >= $1 AND oi."updatedAt" <= $2)
        )
        ${chefId ? `AND oi."chefId" = '${chefId}'` : ''}
      GROUP BY fi.name, fi."isVeg"
      ORDER BY count DESC
      LIMIT 5
    `,
      [startDate, endDate],
    );

    return {
      range,
      rangeLabel,
      pendingTasks,
      preparingTasks,
      readyTasks,
      totalPreparedCount: Number(prepStats?.count || 0),
      totalDishesPrepared: Number(prepStats?.total_dishes || prepStats?.count || 0),
      todayPreparedCount: Number(prepStats?.total_dishes || prepStats?.count || 0),
      vegPreparedCount: Number(prepStats?.veg_count || 0),
      nonVegPreparedCount: Number(prepStats?.non_veg_count || 0),
      topDishes: topDishes || [],
    };
  }

  async getStaffDashboard(staffId?: string, range = 'today') {
    const { startDate, endDate, rangeLabel } = this.getDateBounds(range);

    // Orders stats in this date range
    const [orderStats] = await this.dataSource.query(
      `
      SELECT 
        COUNT(o.id)::int AS total_orders,
        COUNT(CASE WHEN o.status = 'COMPLETED' THEN 1 END)::int AS completed_orders,
        COALESCE(SUM(o."totalAmount"), 0)::numeric AS total_sales
      FROM orders o
      WHERE o."createdAt" >= $1 AND o."createdAt" <= $2
        ${staffId ? `AND o."waiterId" = '${staffId}'` : ''}
    `,
      [startDate, endDate],
    );

    // Dishes/Items served/delivered in this date range
    const [deliveryStats] = await this.dataSource.query(
      `
      SELECT 
        COUNT(oi.id)::int AS items_served,
        COALESCE(SUM(oi.quantity), 0)::int AS total_dishes_served
      FROM order_items oi
      WHERE oi.status = 'DELIVERED'
        AND (
          (oi."deliveredAt" >= $1 AND oi."deliveredAt" <= $2)
          OR (oi."deliveredAt" IS NULL AND oi."updatedAt" >= $1 AND oi."updatedAt" <= $2)
        )
        ${staffId ? `AND oi."deliveredById" = '${staffId}'` : ''}
    `,
      [startDate, endDate],
    );

    // Pending items ready to be served right now
    const pendingDeliveries = await this.itemRepo.count({ where: { status: OrderItemStatus.READY } });

    return {
      range,
      rangeLabel,
      ordersCompleted: Number(orderStats?.completed_orders || 0),
      ordersTaken: Number(orderStats?.total_orders || 0),
      todayOrdersReceived: Number(orderStats?.total_orders || 0),
      dishesServed: Number(deliveryStats?.total_dishes_served || deliveryStats?.items_served || 0),
      itemsDeliveredCount: Number(deliveryStats?.items_served || 0),
      todayDeliveredCount: Number(deliveryStats?.total_dishes_served || deliveryStats?.items_served || 0),
      totalSales: Number(orderStats?.total_sales || 0),
      pendingDeliveries,
    };
  }
}
