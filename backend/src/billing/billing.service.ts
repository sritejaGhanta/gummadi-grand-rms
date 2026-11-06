import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between } from 'typeorm';
import { Bill, BillStatus } from '../database/entities/bill.entity';
import { Payment, PaymentMethod } from '../database/entities/payment.entity';
import { Order, OrderStatus } from '../database/entities/order.entity';
import { RestaurantTable, TableStatus } from '../database/entities/table.entity';
import { ApplicationSetting } from '../database/entities/application-setting.entity';
import { Customer } from '../database/entities/customer.entity';
import { DayClose } from '../database/entities/day-close.entity';
import { EventsGateway } from '../events/events.gateway';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @InjectRepository(Bill)
    private readonly billRepo: Repository<Bill>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(RestaurantTable)
    private readonly tableRepo: Repository<RestaurantTable>,
    @InjectRepository(ApplicationSetting)
    private readonly settingRepo: Repository<ApplicationSetting>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(DayClose)
    private readonly dayCloseRepo: Repository<DayClose>,
    private readonly dataSource: DataSource,
    private readonly eventsGateway: EventsGateway,
    private readonly logService: ActivityLogsService,
  ) {}

  async findAll(status?: BillStatus) {
    const where: any = {};
    if (status) where.status = status;
    return this.billRepo.find({
      where,
      relations: ['table', 'table.floor', 'generatedBy', 'order', 'order.waiter', 'order.items', 'order.items.foodItem', 'payments', 'payments.recordedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const bill = await this.billRepo.findOne({
      where: { id },
      relations: ['table', 'table.floor', 'generatedBy', 'order', 'order.waiter', 'order.items', 'order.items.foodItem', 'payments', 'payments.recordedBy'],
    });
    if (!bill) throw new NotFoundException(`Bill ${id} not found`);
    return bill;
  }

  async findByOrderId(orderId: string) {
    return this.billRepo.findOne({
      where: { orderId },
      relations: ['table', 'table.floor', 'generatedBy', 'order', 'order.waiter', 'order.items', 'order.items.foodItem', 'payments', 'payments.recordedBy'],
    });
  }

  // --- Customer CRM Lookup ---
  async lookupCustomer(phone: string) {
    const cleanPhone = phone.trim().replace(/\D/g, '');
    let customer = await this.customerRepo.findOne({ where: { phone: cleanPhone } });
    if (!customer) {
      return { found: false, phone: cleanPhone, totalVisits: 0, loyaltyPoints: 0 };
    }
    return { found: true, customer };
  }

  async getTopCustomers() {
    return this.customerRepo.find({
      order: { totalSpent: 'DESC' },
      take: 50,
    });
  }

  async generateBill(
    orderId: string,
    discountAmount = 0,
    user?: any,
    customerDetails?: { name?: string; phone?: string; redeemPoints?: number },
  ) {
    // Check if bill already exists
    const existingBill = await this.billRepo.findOne({ where: { orderId } });
    if (existingBill) {
      return this.findOne(existingBill.id);
    }

    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['items', 'items.foodItem', 'table'],
    });
    if (!order) throw new NotFoundException('Order not found');

    if (!order.items || order.items.length === 0) {
      throw new BadRequestException('Cannot generate a bill for an order with no items');
    }

    // Get tax setting
    const taxSetting = await this.settingRepo.findOne({ where: { key: 'tax_percentage' } });
    const taxRate = taxSetting ? parseFloat(taxSetting.value) : 5.0;

    let subtotal = 0;
    for (const item of order.items) {
      if (item.status !== 'CANCELLED') {
        subtotal += Number(item.totalPrice);
      }
    }

    let discount = Math.min(Number(discountAmount) || 0, subtotal);
    const redeemPoints = Number(customerDetails?.redeemPoints) || 0;
    if (redeemPoints > 0) {
      discount += redeemPoints;
      discount = Math.min(discount, subtotal);
    }

    const taxableAmount = Math.max(0, subtotal - discount);
    const taxAmount = Number(((taxableAmount * taxRate) / 100).toFixed(2));
    const grandTotal = Number((taxableAmount + taxAmount).toFixed(2));

    const billNumber = `BILL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const loyaltyPointsEarned = Math.round(grandTotal * 0.05); // 5% cashback as points

    const bill = this.billRepo.create({
      billNumber,
      orderId: order.id,
      tableId: order.tableId,
      subOrder: order.subOrder || 'A',
      generatedById: user?.id,
      subtotal,
      taxPercentage: taxRate,
      taxAmount,
      discountAmount: discount,
      grandTotal,
      customerName: customerDetails?.name || order.customerName || null,
      customerPhone: customerDetails?.phone?.trim() || null,
      loyaltyPointsEarned,
      loyaltyPointsRedeemed: redeemPoints,
      status: BillStatus.UNPAID,
    });

    const savedBill = await this.billRepo.save(bill);

    // Update Customer CRM
    if (customerDetails?.phone) {
      const cleanPhone = customerDetails.phone.trim().replace(/\D/g, '');
      let cust = await this.customerRepo.findOne({ where: { phone: cleanPhone } });
      if (!cust) {
        cust = this.customerRepo.create({
          phone: cleanPhone,
          name: customerDetails.name || 'Valued Guest',
          totalVisits: 1,
          totalSpent: grandTotal,
          loyaltyPoints: loyaltyPointsEarned,
          lastVisit: new Date(),
        });
      } else {
        cust.totalVisits = Number(cust.totalVisits || 0) + 1;
        cust.totalSpent = Number(cust.totalSpent || 0) + grandTotal;
        const currentPoints = Number(cust.loyaltyPoints || 0);
        cust.loyaltyPoints = Math.max(0, currentPoints - redeemPoints + loyaltyPointsEarned);
        cust.lastVisit = new Date();
        if (customerDetails.name) cust.name = customerDetails.name;
      }
      await this.customerRepo.save(cust);
    }

    // Update table status to BILLING
    await this.tableRepo.update(order.tableId, { status: TableStatus.BILLING });

    await this.logService.log({
      userId: user?.id,
      username: user?.username,
      roleName: user?.role?.name,
      action: 'BILL_GENERATED',
      resource: 'bills',
      resourceId: savedBill.id,
      details: { billNumber: savedBill.billNumber, grandTotal: savedBill.grandTotal },
    });

    return this.findOne(savedBill.id);
  }

  async recordPayment(
    billId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    transactionReference?: string,
    notes?: string,
    user?: any,
  ) {
    if (!amount || Number(amount) <= 0) {
      throw new BadRequestException('Payment amount must be greater than 0');
    }
    if (!paymentMethod || !Object.values(PaymentMethod).includes(paymentMethod)) {
      throw new BadRequestException(`Invalid payment method: ${paymentMethod}`);
    }

    const bill = await this.findOne(billId);

    if (bill.status === BillStatus.PAID) {
      throw new BadRequestException('This bill has already been fully paid and closed');
    }

    const previousPayments = bill.payments || [];
    const totalPaid = previousPayments.reduce((acc, p) => acc + Number(p.amount), 0) + Number(amount);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const payment = queryRunner.manager.create(Payment, {
        billId: bill.id,
        amount,
        paymentMethod,
        transactionReference,
        notes,
        recordedById: user?.id || null,
      });
      await queryRunner.manager.save(payment);

      if (totalPaid >= Number(bill.grandTotal)) {
        await queryRunner.manager.update(Bill, bill.id, { status: BillStatus.PAID });

        // Mark order as COMPLETED
        await queryRunner.manager.update(Order, bill.orderId, { status: OrderStatus.COMPLETED });

        // Check if any other ACTIVE orders remain on this shared table
        const remainingActive = await queryRunner.manager.find(Order, {
          where: { tableId: bill.tableId, status: OrderStatus.ACTIVE },
        });

        if (remainingActive.length === 0) {
          // All sub-orders settled! Table is free!
          await queryRunner.manager.update(RestaurantTable, bill.tableId, { status: TableStatus.AVAILABLE });
        } else {
          // Other sub-orders are still eating on this shared table
          await queryRunner.manager.update(RestaurantTable, bill.tableId, { status: TableStatus.OCCUPIED });
        }
      }

      await queryRunner.commitTransaction();

      const updatedBill = await this.findOne(billId);
      const freedTable = await this.tableRepo.findOne({ where: { id: bill.tableId } });

      this.eventsGateway.notifyBillPaid(updatedBill);
      if (freedTable) {
        this.eventsGateway.notifyTableStatus(freedTable);
      }

      await this.logService.log({
        userId: user?.id,
        username: user?.username,
        roleName: user?.role?.name,
        action: 'PAYMENT_RECORDED',
        resource: 'payments',
        resourceId: bill.id,
        details: { amount, paymentMethod, billNumber: bill.billNumber, isClosed: totalPaid >= Number(bill.grandTotal) },
      });

      return updatedBill;
    } catch (err) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // --- WhatsApp Digital Bill Generator ---
  async generateWhatsAppBill(billId: string) {
    const bill = await this.findOne(billId);
    const restName = 'Gummadi Grand Restaurant';
    const dateFormatted = new Date(bill.createdAt).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    let itemsText = '';
    const items = bill.order?.items || [];
    for (const it of items) {
      if (it.status !== 'CANCELLED') {
        itemsText += `• ${it.quantity}x ${it.foodItem?.name} - ₹${it.totalPrice}\n`;
      }
    }

    const message =
      `🍽️ *${restName}*\n` +
      `🧾 *Bill:* ${bill.billNumber}\n` +
      `🪑 *Table:* ${bill.table?.tableNumber || 'N/A'}\n` +
      `📅 *Date:* ${dateFormatted}\n` +
      `--------------------------------\n` +
      itemsText +
      `--------------------------------\n` +
      `Subtotal: ₹${bill.subtotal}\n` +
      `GST (${bill.taxPercentage}%): ₹${bill.taxAmount}\n` +
      (Number(bill.discountAmount) > 0 ? `Discount: -₹${bill.discountAmount}\n` : '') +
      `*Grand Total: ₹${bill.grandTotal}*\n` +
      `Status: ${bill.status}\n` +
      `--------------------------------\n` +
      (Number(bill.loyaltyPointsEarned) > 0 ? `⭐ Points Earned: ${bill.loyaltyPointsEarned} pts\n` : '') +
      `🙏 Thank you for dining with us! Please visit again.`;

    const cleanPhone = (bill.customerPhone || '').replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const waUrl = cleanPhone
      ? `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    return {
      message,
      waUrl,
      phone: bill.customerPhone,
      billNumber: bill.billNumber,
    };
  }

  // --- Day-End Cash Reconciliation (EOD / Z-Report) ---
  async getDaySummary(dateStr?: string) {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59);

    const bills = await this.billRepo.find({
      where: { createdAt: Between(startOfDay, endOfDay) },
      relations: ['payments'],
    });

    let totalSales = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let totalCash = 0;
    let totalUpi = 0;
    let totalCard = 0;

    for (const b of bills) {
      if (b.status === BillStatus.PAID) {
        totalSales += Number(b.grandTotal);
        totalDiscount += Number(b.discountAmount || 0);
        totalTax += Number(b.taxAmount || 0);

        for (const p of b.payments || []) {
          const amt = Number(p.amount);
          if (p.paymentMethod === PaymentMethod.CASH) totalCash += amt;
          else if (p.paymentMethod === PaymentMethod.UPI) totalUpi += amt;
          else if (p.paymentMethod === PaymentMethod.CARD) totalCard += amt;
        }
      }
    }

    const dateKey = startOfDay.toISOString().split('T')[0];
    const existingClose = await this.dayCloseRepo.findOne({ where: { closeDate: dateKey } });

    return {
      date: dateKey,
      totalOrders: bills.length,
      paidBillsCount: bills.filter((b) => b.status === BillStatus.PAID).length,
      totalSales: Number(totalSales.toFixed(2)),
      totalDiscount: Number(totalDiscount.toFixed(2)),
      totalTax: Number(totalTax.toFixed(2)),
      totalCash: Number(totalCash.toFixed(2)),
      totalUpi: Number(totalUpi.toFixed(2)),
      totalCard: Number(totalCard.toFixed(2)),
      expectedCash: Number(totalCash.toFixed(2)),
      isClosed: !!existingClose,
      dayCloseRecord: existingClose || null,
    };
  }

  async recordDayClose(data: { date?: string; actualCashCounted: number; notes?: string }, user?: any) {
    const summary = await this.getDaySummary(data.date);
    const actualCash = Number(data.actualCashCounted) || 0;
    const variance = Number((actualCash - summary.expectedCash).toFixed(2));

    const dayClose = this.dayCloseRepo.create({
      closeDate: summary.date,
      closedById: user?.id,
      totalOrders: summary.totalOrders,
      totalSales: summary.totalSales,
      totalCash: summary.totalCash,
      totalUpi: summary.totalUpi,
      totalCard: summary.totalCard,
      totalDiscount: summary.totalDiscount,
      totalTax: summary.totalTax,
      expectedCash: summary.expectedCash,
      actualCashCounted: actualCash,
      variance,
      notes: data.notes || '',
    });

    const saved = await this.dayCloseRepo.save(dayClose);

    await this.logService.log({
      userId: user?.id,
      username: user?.username,
      roleName: user?.role?.name,
      action: 'DAY_CLOSED',
      resource: 'day_closes',
      resourceId: saved.id,
      details: {
        date: summary.date,
        totalSales: summary.totalSales,
        expectedCash: summary.expectedCash,
        actualCash,
        variance,
      },
    });

    return saved;
  }

  async getDayCloseHistory() {
    return this.dayCloseRepo.find({
      relations: ['closedBy'],
      order: { closeDate: 'DESC' },
      take: 60,
    });
  }
}
