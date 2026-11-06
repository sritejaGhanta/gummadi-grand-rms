import 'dotenv/config';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';

import { User } from './database/entities/user.entity';
import { Role } from './database/entities/role.entity';
import { Permission } from './database/entities/permission.entity';
import { RolePermission } from './database/entities/role-permission.entity';
import { Floor } from './database/entities/floor.entity';
import { RestaurantTable } from './database/entities/table.entity';
import { FoodCategory } from './database/entities/food-category.entity';
import { FoodItem } from './database/entities/food-item.entity';
import { FoodAvailability } from './database/entities/food-availability.entity';
import { Order } from './database/entities/order.entity';
import { OrderItem } from './database/entities/order-item.entity';
import { Bill } from './database/entities/bill.entity';
import { Payment } from './database/entities/payment.entity';
import { ActivityLog } from './database/entities/activity-log.entity';
import { ApplicationSetting } from './database/entities/application-setting.entity';
import { Notification } from './database/entities/notification.entity';
import { InventoryItem } from './database/entities/inventory-item.entity';
import { RecipeItem } from './database/entities/recipe-item.entity';
import { InventoryLog } from './database/entities/inventory-log.entity';
import { Customer } from './database/entities/customer.entity';
import { DayClose } from './database/entities/day-close.entity';
import { TenantRestaurant, TenantStatus } from './database/entities/tenant-restaurant.entity';
import { SubscriptionPlan, PlanCode } from './database/entities/subscription-plan.entity';
import { TenantSubscription, SubscriptionCycle, SubscriptionStatus } from './database/entities/tenant-subscription.entity';

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'rms_db',
  entities: [
    User,
    Role,
    Permission,
    RolePermission,
    Floor,
    RestaurantTable,
    FoodCategory,
    FoodItem,
    FoodAvailability,
    Order,
    OrderItem,
    Bill,
    Payment,
    ActivityLog,
    ApplicationSetting,
    Notification,
    InventoryItem,
    RecipeItem,
    InventoryLog,
    Customer,
    DayClose,
    TenantRestaurant,
    SubscriptionPlan,
    TenantSubscription,
  ],
  synchronize: true,
});

async function seedSaaS() {
  await dataSource.initialize();
  console.log('📦 Connected to PostgreSQL for SaaS Multi-Tenant Seeding...');

  const planRepo = dataSource.getRepository(SubscriptionPlan);
  const tenantRepo = dataSource.getRepository(TenantRestaurant);
  const subRepo = dataSource.getRepository(TenantSubscription);
  const roleRepo = dataSource.getRepository(Role);
  const userRepo = dataSource.getRepository(User);
  const permRepo = dataSource.getRepository(Permission);
  const rolePermRepo = dataSource.getRepository(RolePermission);

  // 1. Seed Subscription Plans
  console.log('1. Seeding Subscription Plans...');
  const plans = [
    {
      name: 'Starter Plan',
      code: PlanCode.STARTER,
      priceMonthly: 999.0,
      priceYearly: 9990.0,
      maxOutlets: 1,
      maxStaff: 5,
      maxTables: 15,
      features: ['pos_billing', 'table_orders', 'thermal_receipts', 'basic_reports'],
    },
    {
      name: 'Pro Plan',
      code: PlanCode.PRO,
      priceMonthly: 1999.0,
      priceYearly: 19990.0,
      maxOutlets: 2,
      maxStaff: 15,
      maxTables: 40,
      features: [
        'pos_billing',
        'table_orders',
        'table_sharing',
        'kds_kitchen',
        'thermal_receipts',
        'whatsapp_bill',
        'staff_performance',
      ],
    },
    {
      name: 'Enterprise Plan',
      code: PlanCode.ENTERPRISE,
      priceMonthly: 3499.0,
      priceYearly: 34990.0,
      maxOutlets: 10,
      maxStaff: 50,
      maxTables: 150,
      features: [
        'pos_billing',
        'table_orders',
        'table_sharing',
        'kds_kitchen',
        'inventory_management',
        'recipe_auto_deduction',
        'crm_loyalty_wallet',
        'eod_day_close',
        'whatsapp_bill',
        'multi_branch',
      ],
    },
  ];

  const planEntities: Record<string, SubscriptionPlan> = {};
  for (const p of plans) {
    let plan = await planRepo.findOne({ where: { code: p.code } });
    if (!plan) {
      plan = planRepo.create(p);
      await planRepo.save(plan);
    }
    planEntities[p.code] = plan;
  }
  console.log('✅ Subscription Plans verified.');

  // 2. Seed Super Admin Role & User
  console.log('2. Seeding Super Admin...');
  let superAdminRole = await roleRepo.findOne({ where: { name: 'superadmin' } });
  if (!superAdminRole) {
    superAdminRole = roleRepo.create({
      name: 'superadmin',
      displayName: 'SaaS Super Administrator',
      description: 'Master owner of SaaS platform with access to all tenants and subscriptions',
      isSystem: true,
    });
    await roleRepo.save(superAdminRole);
  }

  // Map all permissions to super admin
  const allPerms = await permRepo.find();
  for (const perm of allPerms) {
    const exists = await rolePermRepo.findOne({
      where: { roleId: superAdminRole.id, permissionId: perm.id },
    });
    if (!exists) {
      await rolePermRepo.save(rolePermRepo.create({ roleId: superAdminRole.id, permissionId: perm.id }));
    }
  }

  const superAdminPasswordHash = await bcrypt.hash('superadmin123', 10);
  let superAdminUser = await userRepo.findOne({ where: { username: 'superadmin' } });
  if (!superAdminUser) {
    superAdminUser = userRepo.create({
      username: 'superadmin',
      name: 'Platform Sovereign SuperAdmin',
      email: 'superadmin@saasplatform.com',
      passwordHash: superAdminPasswordHash,
      roleId: superAdminRole.id,
      restaurantId: null, // Global platform level
      isActive: true,
    });
    await userRepo.save(superAdminUser);
    console.log('✅ Super Admin user created: superadmin / superadmin123');
  } else {
    superAdminUser.roleId = superAdminRole.id;
    await userRepo.save(superAdminUser);
  }

  // 3. Seed Default Primary Tenant: Royal Feast Grand Palace
  console.log('3. Seeding Default Tenant: Royal Feast Grand Palace...');
  let defaultTenant = await tenantRepo.findOne({ where: { slug: 'royal-feast' } });
  if (!defaultTenant) {
    const subEnd = new Date();
    subEnd.setFullYear(subEnd.getFullYear() + 1);

    defaultTenant = tenantRepo.create({
      name: 'Royal Feast Grand Palace',
      slug: 'royal-feast',
      cuisine: 'Hyderabadi & Mughlai',
      brandLogo: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=120&auto=format&fit=crop',
      address: 'Road No. 36, Jubilee Hills',
      city: 'Hyderabad',
      state: 'Telangana',
      contactEmail: 'contact@royalfeast.com',
      contactPhone: '+91 98765 43210',
      gstNumber: '36AABCU9603R1ZM',
      fssaiNumber: '13621014000452',
      status: TenantStatus.ACTIVE,
      planId: planEntities[PlanCode.ENTERPRISE]?.id,
      subscriptionEndsAt: subEnd,
    });
    await tenantRepo.save(defaultTenant);

    // Initial subscription record
    await subRepo.save(
      subRepo.create({
        restaurantId: defaultTenant.id,
        planId: planEntities[PlanCode.ENTERPRISE].id,
        billingCycle: SubscriptionCycle.YEARLY,
        status: SubscriptionStatus.ACTIVE,
        startDate: new Date(),
        endDate: subEnd,
        amountPaid: 34990.0,
        paymentMethod: 'ONLINE_UPI',
        invoiceNumber: 'INV-202611-0001',
        notes: 'Annual Enterprise Plan Renewal',
      }),
    );
  }

  // Tag all existing single-tenant records to defaultTenant.id
  console.log('4. Scoping existing records to Royal Feast Grand Palace...');
  await dataSource.query(`UPDATE users SET "restaurantId" = $1 WHERE "restaurantId" IS NULL AND username != 'superadmin'`, [defaultTenant.id]);
  await dataSource.query(`UPDATE floors SET "restaurantId" = $1 WHERE "restaurantId" IS NULL`, [defaultTenant.id]);
  await dataSource.query(`UPDATE tables SET "restaurantId" = $1 WHERE "restaurantId" IS NULL`, [defaultTenant.id]);
  await dataSource.query(`UPDATE food_categories SET "restaurantId" = $1 WHERE "restaurantId" IS NULL`, [defaultTenant.id]);
  await dataSource.query(`UPDATE food_items SET "restaurantId" = $1 WHERE "restaurantId" IS NULL`, [defaultTenant.id]);
  await dataSource.query(`UPDATE orders SET "restaurantId" = $1 WHERE "restaurantId" IS NULL`, [defaultTenant.id]);
  await dataSource.query(`UPDATE bills SET "restaurantId" = $1 WHERE "restaurantId" IS NULL`, [defaultTenant.id]);
  await dataSource.query(`UPDATE inventory_items SET "restaurantId" = $1 WHERE "restaurantId" IS NULL`, [defaultTenant.id]);
  await dataSource.query(`UPDATE customers SET "restaurantId" = $1 WHERE "restaurantId" IS NULL`, [defaultTenant.id]);
  await dataSource.query(`UPDATE day_closes SET "restaurantId" = $1 WHERE "restaurantId" IS NULL`, [defaultTenant.id]);

  // 5. Seed 2nd Tenant: Mandi King Arabian Restaurant
  console.log('5. Seeding 2nd Tenant: Mandi King Arabian Restaurant...');
  let mandiKing = await tenantRepo.findOne({ where: { slug: 'mandi-king' } });
  if (!mandiKing) {
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);

    mandiKing = tenantRepo.create({
      name: 'Mandi King Arabian Restaurant',
      slug: 'mandi-king',
      cuisine: 'Arabian Mandi & Grills',
      brandLogo: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=120&auto=format&fit=crop',
      address: 'KPHB Phase 1, JNTU Road, Kukatpally',
      city: 'Hyderabad',
      state: 'Telangana',
      contactEmail: 'mandiking.hyd@gmail.com',
      contactPhone: '+91 81429 99802',
      gstNumber: '36BBCDE1234F1Z5',
      fssaiNumber: '13622015000889',
      status: TenantStatus.TRIAL,
      planId: planEntities[PlanCode.PRO]?.id,
      trialEndsAt: trialEnd,
    });
    await tenantRepo.save(mandiKing);

    // Create Owner for Mandi King
    const ownerRole = await roleRepo.findOne({ where: { name: 'manager' } });
    const mandiOwnerPass = await bcrypt.hash('mandiking123', 10);
    const mandiOwner = userRepo.create({
      username: 'mandiking_owner',
      name: 'Aslam Khan (Owner)',
      email: 'mandiking.hyd@gmail.com',
      phone: '+91 81429 99802',
      passwordHash: mandiOwnerPass,
      roleId: ownerRole?.id,
      restaurantId: mandiKing.id,
      isActive: true,
    });
    await userRepo.save(mandiOwner);

    // Initial trial sub
    await subRepo.save(
      subRepo.create({
        restaurantId: mandiKing.id,
        planId: planEntities[PlanCode.PRO].id,
        billingCycle: SubscriptionCycle.MONTHLY,
        status: SubscriptionStatus.TRIAL,
        startDate: new Date(),
        endDate: trialEnd,
        amountPaid: 0,
        paymentMethod: 'TRIAL',
        invoiceNumber: 'INV-202611-0002',
        notes: '14-Day Free SaaS Trial',
      }),
    );
  }

  console.log('🎉 SaaS Multi-Tenant Seeding Complete!');
  await dataSource.destroy();
}

seedSaaS().catch(console.error);
