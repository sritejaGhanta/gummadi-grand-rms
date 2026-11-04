import * as dotenv from 'dotenv';
dotenv.config();
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './database/entities/user.entity';
import { Role } from './database/entities/role.entity';
import { Permission } from './database/entities/permission.entity';
import { RolePermission } from './database/entities/role-permission.entity';
import { Floor } from './database/entities/floor.entity';
import { RestaurantTable, TableStatus } from './database/entities/table.entity';
import { FoodCategory } from './database/entities/food-category.entity';
import { FoodItem } from './database/entities/food-item.entity';
import { FoodAvailability } from './database/entities/food-availability.entity';
import { ApplicationSetting } from './database/entities/application-setting.entity';

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
    ApplicationSetting,
  ],
  synchronize: true,
});

async function runSeed() {
  console.log('🌱 Starting RMS Seed Process...');
  await dataSource.initialize();
  console.log('✅ Connected to database.');

  const permRepo = dataSource.getRepository(Permission);
  const roleRepo = dataSource.getRepository(Role);
  const rolePermRepo = dataSource.getRepository(RolePermission);
  const userRepo = dataSource.getRepository(User);
  const floorRepo = dataSource.getRepository(Floor);
  const tableRepo = dataSource.getRepository(RestaurantTable);
  const catRepo = dataSource.getRepository(FoodCategory);
  const itemRepo = dataSource.getRepository(FoodItem);
  const availRepo = dataSource.getRepository(FoodAvailability);
  const settingRepo = dataSource.getRepository(ApplicationSetting);

  // 1. Permissions
  const permissionsList = [
    { key: 'dashboard.view', module: 'dashboard', description: 'View system dashboards' },
    { key: 'orders.create', module: 'orders', description: 'Create and submit new table orders' },
    { key: 'orders.view', module: 'orders', description: 'View restaurant orders' },
    { key: 'orders.update', module: 'orders', description: 'Update orders and mark delivered' },
    { key: 'kitchen.view', module: 'kitchen', description: 'View kitchen order queue' },
    { key: 'kitchen.accept', module: 'kitchen', description: 'Accept incoming order items' },
    { key: 'kitchen.prepare', module: 'kitchen', description: 'Start preparing food items' },
    { key: 'kitchen.mark_ready', module: 'kitchen', description: 'Mark food items as ready' },
    { key: 'menu.view', module: 'menu', description: 'View restaurant menu' },
    { key: 'menu.manage', module: 'menu', description: 'Create and edit menu items' },
    { key: 'menu.availability.update', module: 'menu', description: 'Toggle food availability (Sold Out)' },
    { key: 'tables.manage', module: 'tables', description: 'Manage floors, tables, and statuses' },
    { key: 'billing.create', module: 'billing', description: 'Generate bills and accept payments' },
    { key: 'billing.view', module: 'billing', description: 'View invoices and receipts' },
    { key: 'reports.view', module: 'reports', description: 'View revenue and performance reports' },
    { key: 'users.manage', module: 'users', description: 'Create, update, deactivate staff' },
    { key: 'roles.manage', module: 'roles', description: 'Configure dynamic roles & permissions' },
    { key: 'settings.manage', module: 'settings', description: 'Configure branding and restaurant settings' },
    { key: 'audit.view', module: 'audit', description: 'View system audit and activity logs' },
  ];

  const permEntities: Record<string, Permission> = {};
  for (const p of permissionsList) {
    let perm = await permRepo.findOne({ where: { key: p.key } });
    if (!perm) {
      perm = await permRepo.save(permRepo.create(p));
    }
    permEntities[p.key] = perm;
  }
  console.log('✅ Permissions initialized.');

  // 2. Roles
  const rolesDef = [
    {
      name: 'admin',
      displayName: 'System Administrator',
      description: 'Full uninhibited access to all modules and configurations',
      isSystem: true,
      permissions: Object.keys(permEntities),
    },
    {
      name: 'manager',
      displayName: 'Restaurant Manager',
      description: 'Operations, revenue reporting, staff monitoring, and bill settlement',
      isSystem: true,
      permissions: [
        'dashboard.view',
        'orders.create',
        'orders.view',
        'orders.update',
        'kitchen.view',
        'menu.view',
        'menu.manage',
        'menu.availability.update',
        'tables.manage',
        'billing.view',
        'billing.create',
        'reports.view',
        'users.manage',
        'audit.view',
      ],
    },
    {
      name: 'chef',
      displayName: 'Head / Line Chef',
      description: 'Kitchen display system, preparation workflows, and food item availability',
      isSystem: true,
      permissions: [
        'dashboard.view',
        'kitchen.view',
        'kitchen.accept',
        'kitchen.prepare',
        'kitchen.mark_ready',
        'menu.view',
        'menu.availability.update',
      ],
    },
    {
      name: 'staff',
      displayName: 'Service Staff / Waiter',
      description: 'Table order taking, delivery status tracking, and customer service',
      isSystem: true,
      permissions: [
        'dashboard.view',
        'orders.create',
        'orders.view',
        'orders.update',
        'menu.view',
        'tables.manage',
        'billing.view',
      ],
    },
  ];

  const roleEntities: Record<string, Role> = {};
  for (const r of rolesDef) {
    let role = await roleRepo.findOne({ where: { name: r.name } });
    if (!role) {
      role = await roleRepo.save(
        roleRepo.create({
          name: r.name,
          displayName: r.displayName,
          description: r.description,
          isSystem: r.isSystem,
        }),
      );
    }
    roleEntities[r.name] = role;

    // Assign permissions
    await rolePermRepo.delete({ roleId: role.id });
    for (const pKey of r.permissions) {
      const p = permEntities[pKey];
      if (p) {
        await rolePermRepo.save(rolePermRepo.create({ roleId: role.id, permissionId: p.id }));
      }
    }
  }
  console.log('✅ Roles & permissions mapped.');

  // 3. Default Users
  const passwordHash = await bcrypt.hash('admin123', 10);
  const managerHash = await bcrypt.hash('manager123', 10);
  const chefHash = await bcrypt.hash('chef123', 10);
  const waiterHash = await bcrypt.hash('waiter123', 10);

  const usersDef = [
    { username: 'admin', passwordHash, name: 'Admin Sovereign', email: 'admin@royalfeast.com', role: roleEntities['admin'] },
    { username: 'manager', passwordHash: managerHash, name: 'Vikram Malhotra', email: 'manager@royalfeast.com', role: roleEntities['manager'] },
    { username: 'chef', passwordHash: chefHash, name: 'Chef Sanjeev', email: 'chef@royalfeast.com', role: roleEntities['chef'] },
    { username: 'waiter', passwordHash: waiterHash, name: 'Raju Waiter', email: 'waiter@royalfeast.com', role: roleEntities['staff'] },
  ];

  for (const u of usersDef) {
    let user = await userRepo.findOne({ where: { username: u.username } });
    if (!user) {
      user = userRepo.create({
        username: u.username,
        passwordHash: u.passwordHash,
        name: u.name,
        email: u.email,
        roleId: u.role.id,
        isActive: true,
      });
      await userRepo.save(user);
    }
  }
  console.log('✅ Seed users created.');

  // 4. Floors & Tables
  const floorsDef = [
    { name: 'Ground Floor', floorNumber: 0, description: 'Main dining hall and family booths' },
    { name: 'First Floor', floorNumber: 1, description: 'Executive lounge and banquet tables' },
    { name: 'Rooftop Terrace', floorNumber: 2, description: 'Open air sunset seating' },
  ];

  const floorEntities: Record<string, Floor> = {};
  for (const f of floorsDef) {
    let floor = await floorRepo.findOne({ where: { name: f.name } });
    if (!floor) {
      floor = await floorRepo.save(floorRepo.create(f));
    }
    floorEntities[f.name] = floor;
  }

  const tablesDef = [
    { tableNumber: 'T-01', floor: floorEntities['Ground Floor'], seatingCapacity: 2 },
    { tableNumber: 'T-02', floor: floorEntities['Ground Floor'], seatingCapacity: 4 },
    { tableNumber: 'T-03', floor: floorEntities['Ground Floor'], seatingCapacity: 6 },
    { tableNumber: 'T-04', floor: floorEntities['Ground Floor'], seatingCapacity: 8 },
    { tableNumber: 'T-05', floor: floorEntities['First Floor'], seatingCapacity: 4 },
    { tableNumber: 'T-06', floor: floorEntities['First Floor'], seatingCapacity: 4 },
    { tableNumber: 'T-07', floor: floorEntities['First Floor'], seatingCapacity: 6 },
    { tableNumber: 'T-08', floor: floorEntities['Rooftop Terrace'], seatingCapacity: 2 },
    { tableNumber: 'T-09', floor: floorEntities['Rooftop Terrace'], seatingCapacity: 4 },
  ];

  for (const t of tablesDef) {
    let table = await tableRepo.findOne({ where: { tableNumber: t.tableNumber } });
    if (!table) {
      table = tableRepo.create({
        tableNumber: t.tableNumber,
        floorId: t.floor.id,
        seatingCapacity: t.seatingCapacity,
        status: TableStatus.AVAILABLE,
        isActive: true,
      });
      await tableRepo.save(table);
    }
  }
  console.log('✅ Floors and tables seeded.');

  // 5. Food Categories & Items
  const categoriesDef = [
    { name: 'Starters', description: 'Crispy appetizers & kebabs', displayOrder: 1 },
    { name: 'Biryani Specials', description: 'Authentic aromatic dum biryanis', displayOrder: 2 },
    { name: 'Curries & Main Course', description: 'Rich gravies & slow cooked specialties', displayOrder: 3 },
    { name: 'Breads & Tandoor', description: 'Fresh oven baked naans and rotis', displayOrder: 4 },
    { name: 'Beverages', description: 'Refreshing mocktails, lassis & juices', displayOrder: 5 },
    { name: 'Desserts', description: 'Sweet traditional & modern treats', displayOrder: 6 },
  ];

  const catMap: Record<string, FoodCategory> = {};
  for (const c of categoriesDef) {
    let cat = await catRepo.findOne({ where: { name: c.name } });
    if (!cat) {
      cat = await catRepo.save(catRepo.create(c));
    }
    catMap[c.name] = cat;
  }

  const itemsDef = [
    // Starters
    { name: 'Paneer Tikka', category: 'Starters', price: 280, isVeg: true, prepTime: 12, description: 'Marinated cottage cheese cubes grilled to perfection with bell peppers' },
    { name: 'Chicken 65', category: 'Starters', price: 320, isVeg: false, prepTime: 15, description: 'Spicy, deep-fried chicken tossed in curry leaves and mustard seeds' },
    { name: 'Crispy Corn Salt & Pepper', category: 'Starters', price: 220, isVeg: true, prepTime: 10, description: 'Crunchy golden sweet corn kernel bites spiced with black pepper' },
    { name: 'Mutton Seekh Kebab', category: 'Starters', price: 420, isVeg: false, prepTime: 18, description: 'Minced lamb spiced with royal herbs skewered over charcoal' },

    // Biryani
    { name: 'Hyderabadi Chicken Dum Biryani', category: 'Biryani Specials', price: 380, isVeg: false, prepTime: 15, description: 'Traditional long grain basmati rice slow-cooked with tender chicken' },
    { name: 'Special Mutton Dum Biryani', category: 'Biryani Specials', price: 480, isVeg: false, prepTime: 20, description: 'Succulent goat meat marinated in saffron spices and aromatic ghee' },
    { name: 'Royal Paneer Biryani', category: 'Biryani Specials', price: 310, isVeg: true, prepTime: 15, description: 'Layers of fragranced basmati rice layered with herb marinated paneer' },

    // Curries
    { name: 'Butter Chicken', category: 'Curries & Main Course', price: 360, isVeg: false, prepTime: 15, description: 'Roasted tandoori chicken simmered in rich creamy tomato butter sauce' },
    { name: 'Paneer Butter Masala', category: 'Curries & Main Course', price: 310, isVeg: true, prepTime: 14, description: 'Cottage cheese chunks cooked in mildly spiced tomato-cashew gravy' },
    { name: 'Dal Makhani', category: 'Curries & Main Course', price: 260, isVeg: true, prepTime: 12, description: 'Black lentils slow cooked overnight with churned butter and fresh cream' },

    // Breads
    { name: 'Butter Naan', category: 'Breads & Tandoor', price: 60, isVeg: true, prepTime: 6, description: 'Fluffy clay oven leavened bread brushed with melted butter' },
    { name: 'Garlic Butter Naan', category: 'Breads & Tandoor', price: 75, isVeg: true, prepTime: 7, description: 'Tandoori bread studded with minced garlic and coriander' },
    { name: 'Tandoori Roti', category: 'Breads & Tandoor', price: 40, isVeg: true, prepTime: 5, description: 'Whole wheat round flatbread baked in the clay tandoor' },

    // Beverages
    { name: 'Mango Lassi', category: 'Beverages', price: 120, isVeg: true, prepTime: 5, description: 'Thick churned sweet yogurt blended with Alphonso mango pulp' },
    { name: 'Fresh Mint Lime Soda', category: 'Beverages', price: 90, isVeg: true, prepTime: 4, description: 'Sparkling soda with fresh lime juice, crushed mint and rock salt' },

    // Desserts
    { name: 'Gulab Jamun with Ice Cream', category: 'Desserts', price: 150, isVeg: true, prepTime: 5, description: 'Warm milk solid dumplings in cardamom syrup paired with vanilla bean scoop' },
    { name: 'Shahi Tukda', category: 'Desserts', price: 180, isVeg: true, prepTime: 8, description: 'Mughlai bread pudding soaked in saffron rabri and silver leaf' },
  ];

  for (const it of itemsDef) {
    let item = await itemRepo.findOne({ where: { name: it.name } });
    if (!item) {
      item = itemRepo.create({
        name: it.name,
        categoryId: catMap[it.category].id,
        price: it.price,
        isVeg: it.isVeg,
        preparationTimeMinutes: it.prepTime,
        description: it.description,
        isActive: true,
      });
      const saved = await itemRepo.save(item);

      const avail = availRepo.create({
        foodItemId: saved.id,
        isAvailable: true,
      });
      await availRepo.save(avail);
    }
  }
  console.log('✅ Menu categories and delicious items seeded.');

  console.log('🎉 Seed complete! Default Credentials:');
  console.log('👤 Admin: admin / admin123');
  console.log('👤 Manager: manager / manager123');
  console.log('👤 Chef: chef / chef123');
  console.log('👤 Staff/Waiter: waiter / waiter123');

  await dataSource.destroy();
}

runSeed().catch((err) => {
  console.error('❌ Seed error:', err);
  process.exit(1);
});
