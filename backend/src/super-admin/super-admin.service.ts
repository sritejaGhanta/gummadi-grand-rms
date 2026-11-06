import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { TenantRestaurant, TenantStatus } from '../database/entities/tenant-restaurant.entity';
import { SubscriptionPlan, PlanCode } from '../database/entities/subscription-plan.entity';
import { TenantSubscription, SubscriptionCycle, SubscriptionStatus } from '../database/entities/tenant-subscription.entity';
import { User } from '../database/entities/user.entity';
import { Role } from '../database/entities/role.entity';
import { Order } from '../database/entities/order.entity';
import { Bill } from '../database/entities/bill.entity';

@Injectable()
export class SuperAdminService {
  constructor(
    @InjectRepository(TenantRestaurant)
    private readonly restaurantRepo: Repository<TenantRestaurant>,
    @InjectRepository(SubscriptionPlan)
    private readonly planRepo: Repository<SubscriptionPlan>,
    @InjectRepository(TenantSubscription)
    private readonly subRepo: Repository<TenantSubscription>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Bill)
    private readonly billRepo: Repository<Bill>,
    private readonly dataSource: DataSource,
  ) {}

  async getPlatformMetrics() {
    const totalTenants = await this.restaurantRepo.count();
    const activeTenants = await this.restaurantRepo.count({ where: { status: TenantStatus.ACTIVE } });
    const trialTenants = await this.restaurantRepo.count({ where: { status: TenantStatus.TRIAL } });

    // Calculate MRR from active subscriptions
    const activeSubs = await this.subRepo.find({
      where: { status: SubscriptionStatus.ACTIVE },
      relations: ['plan'],
    });

    let mrr = 0;
    for (const sub of activeSubs) {
      if (sub.billingCycle === SubscriptionCycle.MONTHLY) {
        mrr += Number(sub.amountPaid || sub.plan?.priceMonthly || 0);
      } else {
        mrr += Number(sub.amountPaid || sub.plan?.priceYearly || 0) / 12;
      }
    }

    const totalOrders = await this.orderRepo.count();
    const totalSalesRaw = await this.billRepo
      .createQueryBuilder('bill')
      .select('SUM(bill.grandTotal)', 'sum')
      .where("bill.status = 'PAID'")
      .getRawOne();

    const gmv = parseFloat(totalSalesRaw?.sum || '0');

    return {
      totalTenants,
      activeTenants,
      trialTenants,
      mrr: Math.round(mrr),
      arr: Math.round(mrr * 12),
      totalOrders,
      gmv: Math.round(gmv),
    };
  }

  async getAllRestaurants() {
    const list = await this.restaurantRepo.find({
      order: { createdAt: 'DESC' },
    });

    // Populate plan name, staff count, order count for each
    const enriched = await Promise.all(
      list.map(async (r) => {
        let planName = 'Trial Plan';
        if (r.planId) {
          const p = await this.planRepo.findOne({ where: { id: r.planId } });
          if (p) planName = p.name;
        }

        const staffCount = await this.userRepo.count({ where: { restaurantId: r.id } });
        const ordersCount = await this.orderRepo.count({ where: { restaurantId: r.id } });

        const daysLeft = r.subscriptionEndsAt
          ? Math.max(0, Math.ceil((new Date(r.subscriptionEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
          : r.trialEndsAt
          ? Math.max(0, Math.ceil((new Date(r.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
          : 0;

        return {
          ...r,
          planName,
          staffCount,
          ordersCount,
          daysLeft,
        };
      }),
    );

    return enriched;
  }

  async createRestaurant(dto: {
    name: string;
    slug?: string;
    cuisine?: string;
    contactEmail: string;
    contactPhone: string;
    address?: string;
    city?: string;
    planCode?: PlanCode;
    ownerName: string;
    ownerUsername: string;
    ownerPassword?: string;
  }) {
    const baseSlug = (dto.slug || dto.name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '-');
    const existingSlug = await this.restaurantRepo.findOne({ where: { slug: baseSlug } });
    const slug = existingSlug ? `${baseSlug}-${Math.floor(100 + Math.random() * 900)}` : baseSlug;

    // Find requested or default plan
    const code = dto.planCode || PlanCode.PRO;
    const plan = await this.planRepo.findOne({ where: { code } });

    const trialDays = 14;
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

    const restaurant = this.restaurantRepo.create({
      name: dto.name,
      slug,
      cuisine: dto.cuisine || 'Multicuisine',
      contactEmail: dto.contactEmail,
      contactPhone: dto.contactPhone,
      address: dto.address,
      city: dto.city || 'Hyderabad',
      status: TenantStatus.TRIAL,
      planId: plan?.id || null,
      trialEndsAt,
    });
    const savedRestaurant = await this.restaurantRepo.save(restaurant);

    // Create Owner / Manager user for this restaurant
    const password = dto.ownerPassword || 'owner123';
    const passwordHash = await bcrypt.hash(password, 10);

    let managerRole = await this.roleRepo.findOne({ where: { name: 'manager' } });
    if (!managerRole) {
      managerRole = await this.roleRepo.findOne({ where: { name: 'admin' } });
    }

    const ownerUser = this.userRepo.create({
      name: dto.ownerName,
      username: dto.ownerUsername.toLowerCase().trim(),
      email: dto.contactEmail,
      phone: dto.contactPhone,
      passwordHash,
      roleId: managerRole?.id,
      restaurantId: savedRestaurant.id,
      isActive: true,
    });
    await this.userRepo.save(ownerUser);

    // Record initial trial subscription
    if (plan) {
      const sub = this.subRepo.create({
        restaurantId: savedRestaurant.id,
        planId: plan.id,
        billingCycle: SubscriptionCycle.MONTHLY,
        status: SubscriptionStatus.TRIAL,
        startDate: new Date(),
        endDate: trialEndsAt,
        amountPaid: 0,
        paymentMethod: 'TRIAL',
        invoiceNumber: `INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
        notes: '14-Day Free SaaS Trial',
      });
      await this.subRepo.save(sub);
    }

    return {
      restaurant: savedRestaurant,
      owner: {
        username: ownerUser.username,
        name: ownerUser.name,
        email: ownerUser.email,
        temporaryPassword: password,
      },
      plan: plan?.name || 'Standard Trial',
    };
  }

  async updateTenantStatus(id: string, status: TenantStatus) {
    const r = await this.restaurantRepo.findOne({ where: { id } });
    if (!r) throw new NotFoundException('Restaurant not found');
    r.status = status;
    return this.restaurantRepo.save(r);
  }

  async getPlans() {
    return this.planRepo.find({ order: { priceMonthly: 'ASC' } });
  }

  async recordSubscriptionPayment(dto: {
    restaurantId: string;
    planId: string;
    billingCycle: SubscriptionCycle;
    amountPaid: number;
    paymentMethod: string;
    transactionReference?: string;
    notes?: string;
  }) {
    const restaurant = await this.restaurantRepo.findOne({ where: { id: dto.restaurantId } });
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    const plan = await this.planRepo.findOne({ where: { id: dto.planId } });
    if (!plan) throw new NotFoundException('Subscription plan not found');

    const startDate = new Date();
    const endDate = new Date();
    if (dto.billingCycle === SubscriptionCycle.YEARLY) {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    const invoiceNumber = `INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const sub = this.subRepo.create({
      restaurantId: restaurant.id,
      planId: plan.id,
      billingCycle: dto.billingCycle,
      status: SubscriptionStatus.ACTIVE,
      startDate,
      endDate,
      amountPaid: dto.amountPaid,
      paymentMethod: dto.paymentMethod || 'UPI',
      transactionReference: dto.transactionReference,
      invoiceNumber,
      notes: dto.notes,
    });
    await this.subRepo.save(sub);

    // Update restaurant validity
    restaurant.planId = plan.id;
    restaurant.status = TenantStatus.ACTIVE;
    restaurant.subscriptionEndsAt = endDate;
    await this.restaurantRepo.save(restaurant);

    return {
      success: true,
      subscription: sub,
      validUntil: endDate,
    };
  }

  async getRestaurantStaff(restaurantId: string) {
    return this.userRepo.find({
      where: { restaurantId },
      relations: ['role'],
      order: { createdAt: 'DESC' },
    });
  }

  async createRestaurantStaff(
    restaurantId: string,
    dto: {
      name: string;
      username: string;
      password?: string;
      roleName: 'manager' | 'staff' | 'chef';
      phone?: string;
      email?: string;
    },
  ) {
    const existing = await this.userRepo.findOne({ where: { username: dto.username } });
    if (existing) throw new BadRequestException(`Username "${dto.username}" already taken`);

    const role = await this.roleRepo.findOne({ where: { name: dto.roleName } });
    if (!role) throw new NotFoundException(`Role ${dto.roleName} not found`);

    const passwordHash = await bcrypt.hash(dto.password || 'staff123', 10);
    const user = this.userRepo.create({
      name: dto.name,
      username: dto.username.toLowerCase().trim(),
      email: dto.email,
      phone: dto.phone,
      passwordHash,
      roleId: role.id,
      restaurantId,
      isActive: true,
    });
    return this.userRepo.save(user);
  }
}
