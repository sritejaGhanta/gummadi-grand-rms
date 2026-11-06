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
import { LandingLead } from './database/entities/landing-lead.entity';

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
    LandingLead,
  ],
  synchronize: true,
});

async function seedSaaS() {
  await dataSource.initialize();
  console.log('📦 Connected to PostgreSQL for AharPOS SaaS Multi-Tenant Seeding...');

  const planRepo = dataSource.getRepository(SubscriptionPlan);
  const tenantRepo = dataSource.getRepository(TenantRestaurant);
  const subRepo = dataSource.getRepository(TenantSubscription);
  const roleRepo = dataSource.getRepository(Role);
  const userRepo = dataSource.getRepository(User);
  const permRepo = dataSource.getRepository(Permission);
  const rolePermRepo = dataSource.getRepository(RolePermission);
  const floorRepo = dataSource.getRepository(Floor);
  const tableRepo = dataSource.getRepository(RestaurantTable);
  const catRepo = dataSource.getRepository(FoodCategory);
  const foodRepo = dataSource.getRepository(FoodItem);
  const settingRepo = dataSource.getRepository(ApplicationSetting);
  const leadRepo = dataSource.getRepository(LandingLead);

  // 1. Seed Subscription Plans (including user's 10k/6mo and 20k/yr pricing)
  console.log('1. Seeding Subscription Plans (10K for 6 Months, 20K for 1 Year)...');
  const plans = [
    {
      name: 'Half-Yearly Plan (6 Months)',
      code: PlanCode.HALF_YEARLY,
      priceMonthly: 1666.67,
      priceYearly: 10000.0,
      maxOutlets: 1,
      maxStaff: 20,
      maxTables: 50,
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
      ],
    },
    {
      name: 'Annual Flagship Plan (1 Year)',
      code: PlanCode.ANNUAL,
      priceMonthly: 1666.67,
      priceYearly: 20000.0,
      maxOutlets: 2,
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
        'priority_support',
      ],
    },
  ];

  const planEntities: Record<string, SubscriptionPlan> = {};
  for (const p of plans) {
    let plan = await planRepo.findOne({ where: { code: p.code } });
    if (!plan) {
      plan = planRepo.create(p);
      await planRepo.save(plan);
    } else {
      plan.name = p.name;
      plan.priceMonthly = p.priceMonthly;
      plan.priceYearly = p.priceYearly;
      await planRepo.save(plan);
    }
    planEntities[p.code] = plan;
  }
  console.log('✅ Subscription Plans verified.');

  // 2. Roles
  const roles = await roleRepo.find();
  const managerRole = roles.find(r => r.name === 'manager') || roles.find(r => r.name === 'admin');
  const chefRole = roles.find(r => r.name === 'chef');
  const waiterRole = roles.find(r => r.name === 'staff');

  // 3. Seed Tenant: Gummadi Grand Restaurant
  console.log('2. Seeding Tenant: Gummadi Grand Restaurant...');
  let gummadi = await tenantRepo.findOne({ where: { slug: 'gummadi-grand' } });
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 30); // 1-Month (30 Days) Trial

  if (!gummadi) {
    gummadi = tenantRepo.create({
      name: 'Gummadi Grand Restaurant',
      slug: 'gummadi-grand',
      cuisine: 'Andhra & Rayalaseema Grand Dining',
      brandLogo: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=120&auto=format&fit=crop',
      address: 'Plot 42, KPHB Colony, Kukatpally',
      city: 'Hyderabad',
      state: 'Telangana',
      contactEmail: 'gummadi.grand@gmail.com',
      contactPhone: '+91 99480 12345',
      gstNumber: '36AAACG1234G1Z9',
      fssaiNumber: '13623015000777',
      status: TenantStatus.ACTIVE,
      planId: planEntities[PlanCode.ANNUAL]?.id || planEntities[PlanCode.HALF_YEARLY]?.id,
      trialEndsAt: trialEnd,
      subscriptionEndsAt: trialEnd,
    });
    await tenantRepo.save(gummadi);

    // Initial subscription
    await subRepo.save(
      subRepo.create({
        restaurantId: gummadi.id,
        planId: planEntities[PlanCode.ANNUAL]?.id || planEntities[PlanCode.HALF_YEARLY]?.id,
        billingCycle: SubscriptionCycle.YEARLY,
        status: SubscriptionStatus.ACTIVE,
        startDate: new Date(),
        endDate: trialEnd,
        amountPaid: 20000.0,
        paymentMethod: 'ONLINE_UPI',
        invoiceNumber: 'INV-GUMMADI-001',
        notes: 'Annual Flagship Plan - Gummadi Grand Outlets',
      }),
    );
  }

  // 4. Seed Gummadi Grand Staff (Owner, Manager, Chef, Waiter)
  console.log('3. Seeding Gummadi Grand Staff & Roles...');
  const gummadiPass = await bcrypt.hash('gummadi123', 10);

  const staffUsers = [
    {
      username: 'gummadi_owner',
      name: 'Suresh Gummadi (Owner)',
      email: 'suresh@gummadigrand.com',
      roleId: managerRole?.id,
      phone: '+91 99480 12345',
    },
    {
      username: 'gummadi_mgr',
      name: 'Kiran (Store Manager)',
      email: 'kiran.mgr@gummadigrand.com',
      roleId: managerRole?.id,
      phone: '+91 99480 12346',
    },
    {
      username: 'gummadi_chef',
      name: 'Chef Subbarao (Head Chef)',
      email: 'chef@gummadigrand.com',
      roleId: chefRole?.id,
      phone: '+91 99480 12347',
    },
    {
      username: 'gummadi_waiter',
      name: 'Ramu (Floor Captain)',
      email: 'ramu@gummadigrand.com',
      roleId: waiterRole?.id,
      phone: '+91 99480 12348',
    },
  ];

  for (const s of staffUsers) {
    let u = await userRepo.findOne({ where: { username: s.username } });
    if (!u) {
      u = userRepo.create({
        username: s.username,
        name: s.name,
        email: s.email,
        phone: s.phone,
        passwordHash: gummadiPass,
        roleId: s.roleId!,
        restaurantId: gummadi.id,
        isActive: true,
      });
      await userRepo.save(u);
    }
  }

  // 5. Seed Gummadi Grand Floor & Tables
  let gummadiFloor = await floorRepo.findOne({ where: { restaurantId: gummadi.id } });
  if (!gummadiFloor) {
    gummadiFloor = floorRepo.create({
      name: 'Gummadi Main AC Dining',
      floorNumber: 1,
      restaurantId: gummadi.id,
    });
    await floorRepo.save(gummadiFloor);

    const tables = [
      { tableNumber: 'G-01', seatingCapacity: 4 },
      { tableNumber: 'G-02', seatingCapacity: 6 },
      { tableNumber: 'G-03', seatingCapacity: 2 },
      { tableNumber: 'G-04', seatingCapacity: 8 },
    ];
    for (const t of tables) {
      await tableRepo.save(
        tableRepo.create({
          tableNumber: t.tableNumber,
          seatingCapacity: t.seatingCapacity,
          status: 'AVAILABLE' as any,
          floorId: gummadiFloor.id,
          restaurantId: gummadi.id,
        }),
      );
    }
  }

  // 6. Seed Gummadi Grand Menu Items
  let gummadiCat = await catRepo.findOne({ where: { restaurantId: gummadi.id } });
  if (!gummadiCat) {
    gummadiCat = catRepo.create({
      name: 'Gummadi Grand Specials',
      description: 'Authentic Andhra & Rayalaseema Delicacies',
      restaurantId: gummadi.id,
    });
    await catRepo.save(gummadiCat);
  }

  const items = [
    {
      name: 'Gummadi Special Royyala Biryani',
      price: 380,
      portions: [
        { name: 'Full', price: 380, code: 'FULL' },
        { name: 'Half (1/2)', price: 240, code: 'HALF' },
        { name: 'Single (1/3)', price: 160, code: 'SINGLE' },
        { name: 'Family Pack', price: 850, code: 'FAMILY' },
      ],
      isVeg: false,
      isActive: true,
    },
    {
      name: 'Natukodi Pulusu & Ragi Sankati',
      price: 320,
      portions: [
        { name: 'Full', price: 320, code: 'FULL' },
        { name: 'Half (1/2)', price: 200, code: 'HALF' },
      ],
      isVeg: false,
      isActive: true,
    },
    {
      name: 'Gongura Mutton Roast',
      price: 360,
      portions: [
        { name: 'Full', price: 360, code: 'FULL' },
        { name: 'Half (1/2)', price: 220, code: 'HALF' },
      ],
      isVeg: false,
      isActive: true,
    },
    {
      name: 'Andhra Royal Bhojanam',
      price: 220,
      portions: [
        { name: 'Full Meals', price: 220, code: 'FULL' },
        { name: 'Mini Meals (1/2)', price: 140, code: 'HALF' },
      ],
      isVeg: true,
      isActive: true,
    },
    {
      name: 'Apricot Delight Dessert',
      price: 150,
      portions: [
        { name: 'Standard (Single)', price: 150, code: 'STD' },
        { name: 'Family Pack (4 pcs)', price: 480, code: 'FAMILY' },
      ],
      isVeg: true,
      isActive: true,
    },
  ];
  for (const item of items) {
    const existing = await foodRepo.findOne({
      where: { name: item.name, restaurantId: gummadi.id },
    });
    if (existing) {
      existing.price = item.price;
      existing.portions = item.portions;
      existing.isActive = item.isActive;
      existing.isVeg = item.isVeg;
      await foodRepo.save(existing);
    } else {
      await foodRepo.save(
        foodRepo.create({
          name: item.name,
          price: item.price,
          portions: item.portions,
          isVeg: item.isVeg,
          isActive: item.isActive,
          categoryId: gummadiCat.id,
          restaurantId: gummadi.id,
        }),
      );
    }
  }

  // 7. Seed Default Landing CMS Settings
  console.log('4. Seeding Default Landing CMS Settings for AharPOS...');
  const cmsDefaults: Record<string, string> = {
    landing_brand_name: 'AharPOS',
    landing_tagline: 'Smart Dining. High-Yield Operations.',
    landing_hero_title: 'AharPOS — The Operating System for Fast-Growing Restaurants',
    landing_hero_subtitle: 'All-in-One Cloud & Local POS, Multi-Guest Table Sharing, Zero-Latency Kitchen KDS, Recipe Yield Inventory & WhatsApp E-Bills built for Indian Food Businesses.',
    landing_trial_days: '30', // 1 Month trial controllable by Super Admin
    landing_price_6_months: '10000',
    landing_price_1_year: '20000',
    landing_banner_text: '🔥 Special Launch Offer: 1-Month Free Unlimited Trial for Restaurants!',
    landing_banner_active: 'true',
    landing_contact_phone: '+91 98765 43210',
    landing_contact_whatsapp: '+91 98765 43210',
    landing_contact_email: 'sales@aharpos.in',
    landing_contact_address: 'HITEC City, Madhapur, Hyderabad, Telangana 500081',
    landing_theme_primary: '#f59e0b',
  };

  for (const [key, val] of Object.entries(cmsDefaults)) {
    let setting = await settingRepo.findOne({ where: { key } });
    if (!setting) {
      setting = settingRepo.create({
        key,
        value: val,
        category: 'landing',
        description: `Landing CMS setting for ${key}`,
      });
      await settingRepo.save(setting);
    }
  }

  // 8. Seed sample demo inquiries / leads
  console.log('5. Seeding Sample Demo Leads for Super Admin...');
  const leads = [
    {
      restaurantName: 'Platform 65 Train Restaurant',
      ownerName: 'Venkatesh Rao',
      phone: '+91 88018 30831',
      email: 'venkat@platform65.in',
      city: 'Dilsukhnagar, Hyderabad',
      seatingCapacity: '120 Seats',
      preferredPlan: '1_YEAR',
      notes: 'Interested in Table Sharing & Sound Alert Kitchen KDS. Looking to deploy across 2 outlets.',
      status: 'DEMO_SCHEDULED',
    },
    {
      restaurantName: 'Flechazo Mediterranean Buffet',
      ownerName: 'Sunil Verma',
      phone: '+91 80088 83032',
      email: 'sunil@flechazo.in',
      city: 'Madhapur, Hyderabad',
      seatingCapacity: '200 Seats',
      preferredPlan: '1_YEAR',
      notes: 'Wants automated recipe wastage tracking and live table turnover reports.',
      status: 'NEW',
    },
  ];

  for (const l of leads) {
    const existing = await leadRepo.findOne({ where: { phone: l.phone } });
    if (!existing) {
      await leadRepo.save(leadRepo.create(l));
    }
  }

  console.log('🎉 AharPOS Seed Complete! Gummadi Grand, Pricing (10K/20K), CMS & Leads ready.');
  await dataSource.destroy();
}

seedSaaS().catch(console.error);
