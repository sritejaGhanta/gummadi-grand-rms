import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Bill, BillStatus } from '../database/entities/bill.entity';
import { Payment, PaymentMethod } from '../database/entities/payment.entity';
import { Order, OrderStatus } from '../database/entities/order.entity';
import { RestaurantTable, TableStatus } from '../database/entities/table.entity';
import { ApplicationSetting } from '../database/entities/application-setting.entity';
import { EventsGateway } from '../events/events.gateway';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

@Injectable()
export class BillingService {
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

  async generateBill(orderId: string, discountAmount = 0, user?: any) {
    // Check if bill already exists (Business Rule 8: Prevent duplicate bill generation)
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

    const discount = Math.min(discountAmount, subtotal);
    const taxableAmount = Math.max(0, subtotal - discount);
    const taxAmount = Number(((taxableAmount * taxRate) / 100).toFixed(2));
    const grandTotal = Number((taxableAmount + taxAmount).toFixed(2));

    const billNumber = `BILL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const bill = this.billRepo.create({
      billNumber,
      orderId: order.id,
      tableId: order.tableId,
      generatedById: user?.id,
      subtotal,
      taxPercentage: taxRate,
      taxAmount,
      discountAmount: discount,
      grandTotal,
      status: BillStatus.UNPAID,
    });

    const savedBill = await this.billRepo.save(bill);

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

    // Prevent duplicate payment recording if already paid (Business Rule 9)
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

        // Free the table to AVAILABLE
        await queryRunner.manager.update(RestaurantTable, bill.tableId, { status: TableStatus.AVAILABLE });
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
}
