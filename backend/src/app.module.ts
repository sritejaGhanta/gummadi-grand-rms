import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

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

import { EventsModule } from './events/events.module';
import { ActivityLogsModule } from './activity-logs/activity-logs.module';
import { SettingsModule } from './settings/settings.module';
import { RolesModule } from './roles/roles.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { FloorsModule } from './floors/floors.module';
import { MenuModule } from './menu/menu.module';
import { OrdersModule } from './orders/orders.module';
import { KitchenModule } from './kitchen/kitchen.module';
import { BillingModule } from './billing/billing.module';
import { ReportsModule } from './reports/reports.module';
import { InventoryModule } from './inventory/inventory.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
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
      ],
      synchronize: true, // Auto-creates and syncs schema with safety
      logging: false,
    }),
    EventsModule,
    ActivityLogsModule,
    SettingsModule,
    RolesModule,
    UsersModule,
    AuthModule,
    FloorsModule,
    MenuModule,
    OrdersModule,
    KitchenModule,
    BillingModule,
    ReportsModule,
    InventoryModule,
  ],
})
export class AppModule {}
