import * as dotenv from 'dotenv';
dotenv.config();
import { DataSource } from 'typeorm';
import { FoodCategory } from './database/entities/food-category.entity';
import { FoodItem } from './database/entities/food-item.entity';
import { FoodAvailability } from './database/entities/food-availability.entity';
import { InventoryItem } from './database/entities/inventory-item.entity';
import { RecipeItem } from './database/entities/recipe-item.entity';
import { Customer } from './database/entities/customer.entity';

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER || 'rms_user',
  password: process.env.DB_PASSWORD || 'rms_password_secure123',
  database: process.env.DB_NAME || 'rms_db',
  entities: [FoodCategory, FoodItem, FoodAvailability, InventoryItem, RecipeItem, Customer],
  synchronize: true,
});

async function seed() {
  await dataSource.initialize();
  console.log('Connected for inventory seed.');

  const invRepo = dataSource.getRepository(InventoryItem);
  const recipeRepo = dataSource.getRepository(RecipeItem);
  const foodRepo = dataSource.getRepository(FoodItem);
  const custRepo = dataSource.getRepository(Customer);

  const existingCount = await invRepo.count();
  if (existingCount === 0) {
    console.log('Seeding initial raw materials...');
    const items = [
      { name: 'Fresh Raw Chicken', category: 'Meat & Poultry', unit: 'kg', currentStock: 45.0, minAlertThreshold: 10.0, costPerUnit: 220 },
      { name: 'Fresh Raw Mutton', category: 'Meat & Poultry', unit: 'kg', currentStock: 18.5, minAlertThreshold: 5.0, costPerUnit: 850 },
      { name: 'Basmati Biryani Rice', category: 'Grains & Cereals', unit: 'kg', currentStock: 80.0, minAlertThreshold: 20.0, costPerUnit: 110 },
      { name: 'Fresh Paneer (Cottage Cheese)', category: 'Dairy', unit: 'kg', currentStock: 12.0, minAlertThreshold: 3.0, costPerUnit: 340 },
      { name: 'Pure Desi Cow Ghee', category: 'Dairy', unit: 'l', currentStock: 8.5, minAlertThreshold: 2.0, costPerUnit: 650 },
      { name: 'Cooking Sunflower Oil', category: 'Spices & Oils', unit: 'l', currentStock: 30.0, minAlertThreshold: 10.0, costPerUnit: 140 },
      { name: 'Farm Fresh Tomatoes', category: 'Vegetables', unit: 'kg', currentStock: 25.0, minAlertThreshold: 5.0, costPerUnit: 35 },
      { name: 'Red Onions', category: 'Vegetables', unit: 'kg', currentStock: 40.0, minAlertThreshold: 10.0, costPerUnit: 45 },
      { name: 'Fresh Milk', category: 'Dairy', unit: 'l', currentStock: 4.0, minAlertThreshold: 5.0, costPerUnit: 60 },
      { name: 'Garam Masala Blend', category: 'Spices & Oils', unit: 'kg', currentStock: 6.0, minAlertThreshold: 2.0, costPerUnit: 450 },
    ];

    for (const it of items) {
      await invRepo.save(invRepo.create(it));
    }
    console.log('✅ Inventory items seeded.');
  }

  // Seed sample recipes
  const foodItems = await foodRepo.find();
  const rawChicken = await invRepo.findOne({ where: { name: 'Fresh Raw Chicken' } });
  const basmati = await invRepo.findOne({ where: { name: 'Basmati Biryani Rice' } });

  if (rawChicken && basmati) {
    for (const food of foodItems) {
      if (food.name.toLowerCase().includes('biryani') && food.name.toLowerCase().includes('chicken')) {
        const existing = await recipeRepo.findOne({ where: { foodItemId: food.id } });
        if (!existing) {
          await recipeRepo.save([
            recipeRepo.create({ foodItemId: food.id, inventoryItemId: rawChicken.id, quantityRequired: 0.25, unit: 'kg' }),
            recipeRepo.create({ foodItemId: food.id, inventoryItemId: basmati.id, quantityRequired: 0.2, unit: 'kg' }),
          ]);
          console.log(`✅ Linked recipe ingredients to ${food.name}`);
        }
      }
    }
  }

  // Seed sample customers
  const custCount = await custRepo.count();
  if (custCount === 0) {
    await custRepo.save([
      custRepo.create({ name: 'Srinivas Rao', phone: '9848012345', totalVisits: 8, totalSpent: 7420, loyaltyPoints: 370 }),
      custRepo.create({ name: 'Lakshmi Narayana', phone: '9989054321', totalVisits: 5, totalSpent: 4850, loyaltyPoints: 240 }),
      custRepo.create({ name: 'Venkata Ramana', phone: '9440187654', totalVisits: 3, totalSpent: 2600, loyaltyPoints: 130 }),
    ]);
    console.log('✅ Sample customers seeded.');
  }

  await dataSource.destroy();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
