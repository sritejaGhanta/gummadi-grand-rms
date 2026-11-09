import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { TenantRestaurant, TenantStatus } from '../database/entities/tenant-restaurant.entity';
import { SubscriptionPlan, PlanCode } from '../database/entities/subscription-plan.entity';
import { TenantSubscription, SubscriptionCycle, SubscriptionStatus } from '../database/entities/tenant-subscription.entity';
import { User } from '../database/entities/user.entity';
import { Role } from '../database/entities/role.entity';
import { Permission } from '../database/entities/permission.entity';
import { RolePermission } from '../database/entities/role-permission.entity';
import { Order } from '../database/entities/order.entity';
import { Bill } from '../database/entities/bill.entity';
import { ApplicationSetting } from '../database/entities/application-setting.entity';
import { LandingLead } from '../database/entities/landing-lead.entity';
import { AuthService } from '../auth/auth.service';
import { EventsGateway } from '../events/events.gateway';
import * as os from 'os';

@Injectable()
export class SuperAdminService {
  private startTime = Date.now();

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
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepo: Repository<RolePermission>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Bill)
    private readonly billRepo: Repository<Bill>,
    @InjectRepository(ApplicationSetting)
    private readonly settingRepo: Repository<ApplicationSetting>,
    @InjectRepository(LandingLead)
    private readonly leadRepo: Repository<LandingLead>,
    private readonly authService: AuthService,
    private readonly eventsGateway: EventsGateway,
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

    // Platform User & Staff Breakdown (Count only restaurant staff, exclude Super Admin)
    const managerRole = await this.roleRepo.findOne({ where: { name: 'manager' } });
    const staffRole = await this.roleRepo.findOne({ where: { name: 'staff' } });
    const chefRole = await this.roleRepo.findOne({ where: { name: 'chef' } });
    const adminRole = await this.roleRepo.findOne({ where: { name: 'admin' } });

    const totalManagers = managerRole ? await this.userRepo.count({ where: { roleId: managerRole.id } }) : 0;
    const totalStaff = staffRole ? await this.userRepo.count({ where: { roleId: staffRole.id } }) : 0;
    const totalChefs = chefRole ? await this.userRepo.count({ where: { roleId: chefRole.id } }) : 0;
    const totalAdmins = adminRole ? await this.userRepo.count({ where: { roleId: adminRole.id } }) : 0;
    const totalUsers = totalManagers + totalStaff + totalChefs + totalAdmins;

    return {
      totalTenants,
      activeTenants,
      trialTenants,
      mrr: Math.round(mrr),
      arr: Math.round(mrr * 12),
      totalOrders,
      gmv: Math.round(gmv),
      totalUsers,
      totalManagers,
      totalStaff,
      totalChefs,
      totalAdmins,
    };
  }

  async getAllPlatformUsers() {
    const allUsers = await this.userRepo.find({
      relations: ['role'],
      order: { createdAt: 'DESC' },
    });

    // Exclude sovereign Super Admin from restaurant staff list
    const users = allUsers.filter((u) => u.role?.name !== 'superadmin');

    const restaurants = await this.restaurantRepo.find();
    const restMap = new Map(restaurants.map((r) => [r.id, r]));

    return users.map((u) => {
      const rest = u.restaurantId ? restMap.get(u.restaurantId) : null;
      return {
        id: u.id,
        name: u.name,
        username: u.username,
        email: u.email,
        phone: u.phone,
        isActive: u.isActive,
        roleName: u.role?.name || 'user',
        roleDisplayName: u.role?.displayName || u.role?.name || 'Staff',
        restaurantId: u.restaurantId,
        restaurantName: rest?.name || 'Standalone',
        restaurantCity: rest?.city || 'HQ',
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
      };
    });
  }

  async getAllRestaurants() {
    const list = await this.restaurantRepo.find({
      order: { createdAt: 'DESC' },
    });

    const users = await this.userRepo.find({ relations: ['role'] });

    // Populate plan name, staff count, order count for each
    const enriched = await Promise.all(
      list.map(async (r) => {
        let planName = 'Trial Plan';
        if (r.planId) {
          const p = await this.planRepo.findOne({ where: { id: r.planId } });
          if (p) planName = p.name;
        }

        const restUsers = users.filter((u) => u.restaurantId === r.id);
        const managers = restUsers.filter((u) => u.role?.name === 'manager');
        const waiters = restUsers.filter((u) => u.role?.name === 'staff');
        const chefs = restUsers.filter((u) => u.role?.name === 'chef');

        const staffCount = restUsers.length;
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
          managersCount: managers.length,
          waitersCount: waiters.length,
          chefsCount: chefs.length,
          ownerUser: managers[0]?.name || restUsers[0]?.name || 'Not Assigned',
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

  // ==========================================
  // LANDING PAGE CMS & SETTINGS CONTROLLER (Super Admin)
  // ==========================================
  async getLandingCmsSettings() {
    const rawSettings = await this.settingRepo.find({
      where: { category: 'landing' },
    });

    const settingsMap: Record<string, string> = {};
    for (const s of rawSettings) {
      settingsMap[s.key] = s.value;
    }

    const defaultTestimonials = [
      {
        restaurantName: 'Gummadi Grand Restaurant',
        ownerName: 'Suresh Gummadi (Founder)',
        location: 'Kukatpally, Hyderabad',
        quote: 'AharPOS changed our rush-hour table turnover completely. Table sharing and instant KOT to kitchen saved us 20 minutes per table!',
        rating: 5,
        growthMetric: '+35% Faster Table Turnover',
      },
      {
        restaurantName: 'Mandi King Arabian Restaurant',
        ownerName: 'Mohammed R. (Owner)',
        location: 'JNTU Road, Hyderabad',
        quote: 'Our chefs love the KDS screen. No missed orders or handwritten paper slips. Daily closing Z-report on WhatsApp is a blessing.',
        rating: 5,
        growthMetric: '0 Lost KOTs',
      },
      {
        restaurantName: 'Teluguness Restaurant',
        ownerName: 'Chaitanya K. (Managing Partner)',
        location: 'Madhapur, Hi-Tech City',
        quote: 'Petpooja was charging high commissions and hidden fees. AharPOS flat pricing and offline LAN mode is 10x better.',
        rating: 5,
        growthMetric: '₹1.2L Saved in Annual Fees',
      },
    ];

    let testimonials = defaultTestimonials;
    if (settingsMap['landing_testimonials']) {
      try {
        testimonials = JSON.parse(settingsMap['landing_testimonials']);
      } catch (e) {
        testimonials = defaultTestimonials;
      }
    }

    return {
      brandName: settingsMap['landing_brand_name'] || 'AharPOS',
      tagline: settingsMap['landing_tagline'] || 'Smart Dining. High-Yield Operations.',
      heroTitle:
        settingsMap['landing_hero_title'] ||
        'AharPOS — The Operating System for Fast-Growing Restaurants',
      heroSubtitle:
        settingsMap['landing_hero_subtitle'] ||
        'Next-gen Cloud & Local POS, Multi-Guest Table Sharing, Zero-Latency Kitchen KDS, Recipe Yield Inventory & WhatsApp E-Bills built for Indian Food Businesses.',
      trialDays: parseInt(settingsMap['landing_trial_days'] || '30', 10),
      plan6MonthsPrice: parseFloat(settingsMap['landing_price_6_months'] || '10000'),
      plan1YearPrice: parseFloat(settingsMap['landing_price_1_year'] || '20000'),
      bannerText:
        settingsMap['landing_banner_text'] ||
        '🔥 Special Launch Offer: 1-Month Free Unlimited Trial for Restaurants!',
      bannerActive: settingsMap['landing_banner_active'] !== 'false',
      contactPhone: settingsMap['landing_contact_phone'] || '+91 98765 43210',
      contactEmail: settingsMap['landing_contact_email'] || 'sales@aharpos.in',
      contactWhatsapp: settingsMap['landing_contact_whatsapp'] || '+91 98765 43210',
      contactAddress:
        settingsMap['landing_contact_address'] ||
        'HITEC City, Madhapur, Hyderabad, Telangana 500081',
      themePrimary: settingsMap['landing_theme_primary'] || '#f59e0b',
      testimonials,
    };
  }

  async updateLandingCmsSettings(dto: Partial<{
    brandName: string;
    tagline: string;
    heroTitle: string;
    heroSubtitle: string;
    trialDays: number;
    plan6MonthsPrice: number;
    plan1YearPrice: number;
    bannerText: string;
    bannerActive: boolean;
    contactPhone: string;
    contactEmail: string;
    contactWhatsapp: string;
    contactAddress: string;
    themePrimary: string;
    testimonials: any[];
  }>) {
    const keyMap: Record<string, any> = {
      landing_brand_name: dto.brandName,
      landing_tagline: dto.tagline,
      landing_hero_title: dto.heroTitle,
      landing_hero_subtitle: dto.heroSubtitle,
      landing_trial_days: dto.trialDays !== undefined ? String(dto.trialDays) : undefined,
      landing_price_6_months: dto.plan6MonthsPrice !== undefined ? String(dto.plan6MonthsPrice) : undefined,
      landing_price_1_year: dto.plan1YearPrice !== undefined ? String(dto.plan1YearPrice) : undefined,
      landing_banner_text: dto.bannerText,
      landing_banner_active: dto.bannerActive !== undefined ? String(dto.bannerActive) : undefined,
      landing_contact_phone: dto.contactPhone,
      landing_contact_email: dto.contactEmail,
      landing_contact_whatsapp: dto.contactWhatsapp,
      landing_contact_address: dto.contactAddress,
      landing_theme_primary: dto.themePrimary,
      landing_testimonials: dto.testimonials ? JSON.stringify(dto.testimonials) : undefined,
    };

    for (const [key, val] of Object.entries(keyMap)) {
      if (val !== undefined) {
        let setting = await this.settingRepo.findOne({ where: { key } });
        if (!setting) {
          setting = this.settingRepo.create({
            key,
            value: String(val),
            category: 'landing',
            description: `Landing CMS setting for ${key}`,
          });
        } else {
          setting.value = String(val);
        }
        await this.settingRepo.save(setting);
      }
    }

    // Also sync the subscription plan prices if updated
    if (dto.plan6MonthsPrice !== undefined || dto.plan1YearPrice !== undefined) {
      const halfYearPlan = await this.planRepo.findOne({ where: { code: PlanCode.HALF_YEARLY } });
      if (halfYearPlan && dto.plan6MonthsPrice !== undefined) {
        halfYearPlan.priceMonthly = dto.plan6MonthsPrice / 6;
        halfYearPlan.priceYearly = dto.plan6MonthsPrice * 2;
        await this.planRepo.save(halfYearPlan);
      }
      const annualPlan = await this.planRepo.findOne({ where: { code: PlanCode.ANNUAL } });
      if (annualPlan && dto.plan1YearPrice !== undefined) {
        annualPlan.priceMonthly = dto.plan1YearPrice / 12;
        annualPlan.priceYearly = dto.plan1YearPrice;
        await this.planRepo.save(annualPlan);
      }
    }

    return this.getLandingCmsSettings();
  }

  // ==========================================
  // DEMO LEADS & INQUIRIES MANAGEMENT
  // ==========================================
  async createDemoLead(dto: {
    restaurantName: string;
    ownerName: string;
    phone: string;
    email?: string;
    city?: string;
    seatingCapacity?: string;
    preferredPlan?: string;
    notes?: string;
  }) {
    const lead = this.leadRepo.create({
      restaurantName: dto.restaurantName,
      ownerName: dto.ownerName,
      phone: dto.phone,
      email: dto.email,
      city: dto.city || 'Hyderabad',
      seatingCapacity: dto.seatingCapacity,
      preferredPlan: dto.preferredPlan || '1_YEAR',
      notes: dto.notes,
      status: 'NEW',
    });
    return this.leadRepo.save(lead);
  }

  async getAllLeads() {
    return this.leadRepo.find({
      order: { createdAt: 'DESC' },
    });
  }

  async updateLeadStatus(id: string, status: string, notes?: string) {
    const lead = await this.leadRepo.findOne({ where: { id } });
    if (!lead) throw new NotFoundException('Lead inquiry not found');
    lead.status = status;
    if (notes) lead.notes = notes;
    return this.leadRepo.save(lead);
  }

  async convertLeadToTenant(leadId: string) {
    const lead = await this.leadRepo.findOne({ where: { id: leadId } });
    if (!lead) throw new NotFoundException('Lead inquiry not found');

    const username = lead.ownerName.toLowerCase().replace(/[^a-z0-9]/g, '') + '_owner';
    const onboardResult = await this.createRestaurant({
      name: lead.restaurantName,
      cuisine: 'Multi-Cuisine',
      city: lead.city || 'Hyderabad',
      contactPhone: lead.phone,
      contactEmail: lead.email,
      planCode: (lead.preferredPlan === '6_MONTHS' ? 'HALF_YEARLY' : 'ANNUAL') as any,
      ownerName: lead.ownerName,
      ownerUsername: username,
      ownerPassword: 'owner' + Math.floor(1000 + Math.random() * 9000),
    });

    lead.status = 'CONVERTED';
    lead.notes = (lead.notes || '') + ` | Converted to Tenant: ${lead.restaurantName} (User: ${username})`;
    await this.leadRepo.save(lead);

    return { lead, ...onboardResult };
  }

  // ==========================================
  // RESTAURANT CAPABILITIES & FEATURE LICENSING
  // ==========================================
  async updateRestaurantCapabilities(restaurantId: string, capabilities: any) {
    const restaurant = await this.restaurantRepo.findOne({ where: { id: restaurantId } });
    if (!restaurant) throw new NotFoundException('Restaurant not found');
    restaurant.capabilities = {
      ...(restaurant.capabilities || {}),
      ...capabilities,
    };
    return this.restaurantRepo.save(restaurant);
  }

  // ==========================================
  // ROLES & PERMISSIONS MASTER MATRIX
  // ==========================================
  async getPermissionMatrix() {
    const roles = await this.roleRepo.find({ order: { name: 'ASC' } });
    const permissions = await this.permissionRepo.find({ order: { module: 'ASC', key: 'ASC' } });
    const rolePermissions = await this.rolePermissionRepo.find({ relations: ['permission', 'role'] });

    const matrix: Record<string, string[]> = {};
    for (const r of roles) {
      matrix[r.name] = [];
    }
    for (const rp of rolePermissions) {
      if (rp.role?.name && rp.permission?.key) {
        if (!matrix[rp.role.name]) matrix[rp.role.name] = [];
        matrix[rp.role.name].push(rp.permission.key);
      }
    }

    return {
      roles,
      permissions,
      matrix,
    };
  }

  async updateRolePermissions(roleName: string, permissionKeys: string[]) {
    const role = await this.roleRepo.findOne({ where: { name: roleName } });
    if (!role) throw new NotFoundException(`Role ${roleName} not found`);

    const permissions = await this.permissionRepo.find();
    const targetPerms = permissions.filter((p) => permissionKeys.includes(p.key));

    // Remove existing role permissions for this role
    await this.rolePermissionRepo.delete({ roleId: role.id });

    // Insert new role permissions
    if (targetPerms.length > 0) {
      const newEntries = targetPerms.map((p) =>
        this.rolePermissionRepo.create({
          roleId: role.id,
          permissionId: p.id,
        }),
      );
      await this.rolePermissionRepo.save(newEntries);
    }

    return this.getPermissionMatrix();
  }

  // ==========================================
  // CROSS-TENANT USER DIRECTORY CONTROLS
  // ==========================================
  async toggleUserStatus(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    user.isActive = !user.isActive;
    return this.userRepo.save(user);
  }

  async resetUserPassword(userId: string, newPassword?: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const pwd = newPassword || 'AharPOS@123';
    user.passwordHash = await bcrypt.hash(pwd, 10);
    await this.userRepo.save(user);
    return { success: true, message: `Password reset to: ${pwd}`, temporaryPassword: pwd };
  }

  // ==========================================
  // PRODUCT OWNER: IMPERSONATE / SHADOW ACCESS
  // ==========================================
  async impersonateRestaurant(restaurantId: string) {
    const restaurant = await this.restaurantRepo.findOne({ where: { id: restaurantId } });
    if (!restaurant) throw new NotFoundException('Restaurant outlet not found');

    // Find an active manager or admin for this restaurant
    let user = await this.userRepo.findOne({
      where: { restaurantId, isActive: true },
      relations: ['role', 'role.rolePermissions', 'role.rolePermissions.permission'],
      order: { createdAt: 'ASC' },
    });

    if (!user) {
      let managerRole = await this.roleRepo.findOne({ where: { name: 'manager' } });
      if (!managerRole) managerRole = await this.roleRepo.findOne({ where: { name: 'admin' } });
      const passwordHash = await bcrypt.hash('impersonate' + Date.now(), 10);
      user = this.userRepo.create({
        name: `${restaurant.name} Manager`,
        username: `${restaurant.slug || 'outlet'}_mgr`,
        email: restaurant.contactEmail || 'support@aharpos.in',
        phone: restaurant.contactPhone,
        passwordHash,
        roleId: managerRole?.id,
        restaurantId: restaurant.id,
        isActive: true,
      });
      user = await this.userRepo.save(user);
      user = await this.userRepo.findOne({
        where: { id: user.id },
        relations: ['role', 'role.rolePermissions', 'role.rolePermissions.permission'],
      });
    }

    const authResult = await this.authService.login(user);
    return {
      ...authResult,
      isImpersonating: true,
      targetRestaurant: {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        city: restaurant.city,
      },
    };
  }

  // ==========================================
  // PRODUCT OWNER: UPDATE RESTAURANT DETAILS
  // ==========================================
  async updateRestaurantDetails(id: string, dto: any) {
    const restaurant = await this.restaurantRepo.findOne({ where: { id } });
    if (!restaurant) throw new NotFoundException('Restaurant not found');
    if (dto.name !== undefined) restaurant.name = dto.name;
    if (dto.cuisine !== undefined) restaurant.cuisine = dto.cuisine;
    if (dto.contactEmail !== undefined) restaurant.contactEmail = dto.contactEmail;
    if (dto.contactPhone !== undefined) restaurant.contactPhone = dto.contactPhone;
    if (dto.address !== undefined) restaurant.address = dto.address;
    if (dto.city !== undefined) restaurant.city = dto.city;
    if (dto.status !== undefined) restaurant.status = dto.status;
    return this.restaurantRepo.save(restaurant);
  }

  // ==========================================
  // PRODUCT OWNER: B2B SUBSCRIPTION TAX INVOICES
  // ==========================================
  async getSubscriptionInvoices() {
    const subs = await this.subRepo.find({
      relations: ['restaurant', 'plan'],
      order: { createdAt: 'DESC' },
    });
    return subs.map((s) => ({
      id: s.id,
      invoiceNumber: s.invoiceNumber,
      restaurantId: s.restaurantId,
      restaurantName: s.restaurant?.name || 'Restaurant Outlet',
      restaurantCity: s.restaurant?.city || 'Hyderabad',
      restaurantPhone: s.restaurant?.contactPhone || '—',
      restaurantAddress: s.restaurant?.address || 'India',
      planName: s.plan?.name || 'Pro Plan',
      planCode: s.plan?.code || 'PRO',
      amountPaid: Number(s.amountPaid) || 0,
      billingCycle: s.billingCycle,
      status: s.status,
      paymentMethod: s.paymentMethod,
      transactionReference: s.transactionReference || 'REF-LAN-' + s.id.substring(0, 8).toUpperCase(),
      startDate: s.startDate,
      endDate: s.endDate,
      notes: s.notes,
      createdAt: s.createdAt,
    }));
  }

  // ==========================================
  // PRODUCT OWNER: SYSTEM DIAGNOSTICS & TELEMETRY
  // ==========================================
  async getSystemDiagnostics() {
    const uptimeSec = Math.floor((Date.now() - this.startTime) / 1000);
    const days = Math.floor(uptimeSec / 86400);
    const hours = Math.floor((uptimeSec % 86400) / 3600);
    const minutes = Math.floor((uptimeSec % 3600) / 60);
    const seconds = uptimeSec % 60;
    const uptimeFormatted = `${days}d ${hours}h ${minutes}m ${seconds}s`;

    const mem = process.memoryUsage();
    const totalTenants = await this.restaurantRepo.count();
    const totalUsers = await this.userRepo.count();
    const totalOrders = await this.orderRepo.count();
    const totalBills = await this.billRepo.count();
    const totalSubs = await this.subRepo.count();
    const activeSockets = this.eventsGateway.getConnectedClientsCount();

    const maintSetting = await this.settingRepo.findOne({ where: { key: 'platform_maintenance_mode' } });
    let maintenance = { active: false, reason: '' };
    if (maintSetting) {
      try {
        maintenance = JSON.parse(maintSetting.value);
      } catch {}
    }

    return {
      serverUptime: uptimeFormatted,
      uptimeSeconds: uptimeSec,
      nodeVersion: process.version,
      platform: `${os.type()} ${os.release()} (${os.arch()})`,
      memory: {
        rssMb: Math.round(mem.rss / 1024 / 1024),
        heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
      },
      database: {
        connected: true,
        databaseType: 'PostgreSQL 16 (rms_postgres)',
        totalTenants,
        totalUsers,
        totalOrders,
        totalBills,
        totalSubscriptions: totalSubs,
      },
      realtimeSockets: {
        activeClients: activeSockets,
        gatewayStatus: 'ONLINE (Port 3000)',
      },
      maintenanceMode: maintenance,
    };
  }

  async toggleMaintenanceMode(dto: { active: boolean; reason?: string }) {
    let setting = await this.settingRepo.findOne({ where: { key: 'platform_maintenance_mode' } });
    if (!setting) {
      setting = this.settingRepo.create({
        key: 'platform_maintenance_mode',
        category: 'system',
        description: 'Emergency Platform Maintenance Mode Switch',
        value: JSON.stringify(dto),
      });
    } else {
      setting.value = JSON.stringify(dto);
    }
    await this.settingRepo.save(setting);
    this.eventsGateway.notifyPlatformBroadcast({
      type: dto.active ? 'alert' : 'info',
      message: dto.active
        ? `⚠️ Platform Maintenance Active: ${dto.reason || 'System Upgrades underway'}`
        : 'Platform Maintenance has concluded.',
      active: dto.active,
    });
    return dto;
  }

  // ==========================================
  // PRODUCT OWNER: GLOBAL BROADCAST ANNOUNCEMENTS
  // ==========================================
  async getBroadcastAnnouncement() {
    const setting = await this.settingRepo.findOne({ where: { key: 'platform_broadcast_announcement' } });
    if (!setting) {
      return {
        message: 'Welcome to AharPOS Enterprise Suite! Real-time sync and zero-latency KDS active.',
        type: 'info',
        active: false,
      };
    }
    try {
      return JSON.parse(setting.value);
    } catch {
      return { message: setting.value, type: 'info', active: true };
    }
  }

  async updateBroadcastAnnouncement(dto: { message: string; type: string; active: boolean }) {
    let setting = await this.settingRepo.findOne({ where: { key: 'platform_broadcast_announcement' } });
    if (!setting) {
      setting = this.settingRepo.create({
        key: 'platform_broadcast_announcement',
        category: 'system',
        description: 'Global Restaurant Broadcast Announcement Ticker',
        value: JSON.stringify(dto),
      });
    } else {
      setting.value = JSON.stringify(dto);
    }
    await this.settingRepo.save(setting);
    this.eventsGateway.notifyPlatformBroadcast(dto);
    return dto;
  }

  // ==========================================
  // PRODUCT OWNER: SAAS UNIT ECONOMICS & ANALYTICS
  // ==========================================
  async getAnalyticsBreakdown() {
    const allTenants = await this.restaurantRepo.find();
    const allSubs = await this.subRepo.find({ relations: ['plan'] });
    const plans = await this.planRepo.find();
    const planMapById = new Map(plans.map((p) => [p.id, p.name]));

    const cityMap: Record<string, number> = {};
    for (const t of allTenants) {
      const city = t.city || 'Other';
      cityMap[city] = (cityMap[city] || 0) + 1;
    }

    const planCountMap: Record<string, number> = {};
    for (const t of allTenants) {
      const p = (t.planId ? planMapById.get(t.planId) : null) || 'Trial (Free)';
      planCountMap[p] = (planCountMap[p] || 0) + 1;
    }

    const totalRevenue = allSubs.reduce((sum, s) => sum + (Number(s.amountPaid) || 0), 0);
    const totalOrders = await this.orderRepo.count();
    const bills = await this.billRepo.find({ select: ['grandTotal'] });
    const totalGmv = bills.reduce((sum, b) => sum + (Number(b.grandTotal) || 0), 0);

    const arpu = allTenants.length > 0 ? Math.round(totalRevenue / allTenants.length) : 0;
    const aov = totalOrders > 0 ? Math.round(totalGmv / totalOrders) : 0;

    return {
      cityDistribution: Object.entries(cityMap).map(([city, count]) => ({ city, count })),
      planDistribution: Object.entries(planCountMap).map(([plan, count]) => ({ plan, count })),
      totalRevenue,
      totalGmv,
      totalOrders,
      arpu,
      aov,
      totalTenants: allTenants.length,
      activeTenants: allTenants.filter((t) => t.status === TenantStatus.ACTIVE).length,
      trialTenants: allTenants.filter((t) => t.status === TenantStatus.TRIAL).length,
    };
  }
}
