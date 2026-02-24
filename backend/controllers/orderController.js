const { body, param } = require('express-validator');
const { sequelize } = require('../config/db');
const { Order, Service, User, InvoiceRecord, Milestone } = require('../models');
const createNotification = require('../utils/createNotification');
const { ensureInvoiceRecord } = require('../services/invoiceService');
const { recordWalletTransaction } = require('../utils/wallet');
const { updateSellerReputation } = require('../utils/sellerReputation');
const { validateAndComputeCoupon } = require('../utils/coupon');

const DEFAULT_COMMISSION_PERCENT = Number(process.env.PLATFORM_COMMISSION_PERCENT || 10);
const isIntId = (value) => Number.isInteger(Number(value)) && Number(value) > 0;

const checkoutValidation = [
  body('serviceIds').optional().isArray({ min: 1 }).withMessage('serviceIds must be a non-empty array'),
  body('serviceIds.*').optional().custom((value) => isIntId(value)).withMessage('Invalid service id'),
  body('items').optional().isArray({ min: 1 }).withMessage('items must be a non-empty array'),
  body('items.*.serviceId').optional().custom((value) => isIntId(value)).withMessage('Invalid service id'),
  body('items.*.packageType').optional().isIn(['single', 'basic', 'standard', 'premium']).withMessage('Invalid packageType'),
  body('items.*.milestones').optional().isArray({ min: 1 }).withMessage('milestones must be an array'),
  body('items.*.milestones.*.title').optional().trim().isLength({ min: 3, max: 180 }),
  body('items.*.milestones.*.amount').optional().isFloat({ gt: 0 }).withMessage('milestone amount must be > 0'),
  body('couponCode').optional().trim().isLength({ min: 3, max: 40 })
];

const orderIdValidation = [param('id').custom((value) => isIntId(value)).withMessage('Invalid order id')];
const milestoneIdValidation = [param('milestoneId').custom((value) => isIntId(value)).withMessage('Invalid milestone id')];
const applyCouponValidation = [
  body('code').trim().notEmpty().withMessage('Coupon code is required'),
  body('amount').isFloat({ gt: 0 }).withMessage('amount must be > 0')
];

const getPriceForPackage = (service, packageType) => {
  if (!packageType || packageType === 'single') return Number(service.price);
  const pkg = service.packages?.[packageType];
  if (!pkg || !pkg.price || Number(pkg.price) <= 0) {
    throw new Error(`Package "${packageType}" is not available for service ${service.id}.`);
  }
  return Number(pkg.price);
};

const pushViewedCategory = async (userId, category, transaction) => {
  const user = await User.findByPk(userId, { transaction });
  if (!user) return;
  const history = Array.isArray(user.viewedCategories) ? user.viewedCategories.slice(-19) : [];
  history.push(String(category || '').trim().toLowerCase());
  user.viewedCategories = history;
  await user.save({ transaction });
};

const releaseEscrowToSeller = async ({ order, transaction, reason }) => {
  if (order.escrowStatus === 'Released') return;
  const seller = await User.findByPk(order.sellerId, { transaction });
  if (!seller) return;

  const escrowAmount = Number(order.escrowAmount || order.amount);
  seller.wallet = Number(seller.wallet) + escrowAmount;
  await seller.save({ transaction });
  order.escrowStatus = 'Released';
  await order.save({ transaction });

  await recordWalletTransaction({
    userId: order.sellerId,
    type: 'Credit',
    amount: escrowAmount,
    reason: reason || 'Escrow released',
    relatedOrderId: order.id,
    meta: {
      grossAmount: Number(order.amount),
      commissionAmount: Number(order.commissionAmount || 0),
      netReleased: escrowAmount
    },
    transaction
  });
};

const createOrderMilestones = async ({ order, milestones, transaction }) => {
  if (!Array.isArray(milestones) || !milestones.length) return [];
  const normalized = milestones.map((m) => ({
    orderId: order.id,
    title: m.title,
    amount: Number(m.amount),
    status: 'Pending'
  }));

  const totalMilestones = normalized.reduce((sum, item) => sum + Number(item.amount), 0);
  if (Number(totalMilestones.toFixed(2)) !== Number(Number(order.escrowAmount || order.amount).toFixed(2))) {
    throw new Error(`Milestone total (${totalMilestones}) must equal escrow amount (${order.escrowAmount}).`);
  }

  return Milestone.bulkCreate(normalized, { transaction });
};

const checkout = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const payloadItems =
      Array.isArray(req.body.items) && req.body.items.length
        ? req.body.items.map((item) => ({
            serviceId: Number(item.serviceId),
            packageType: item.packageType || 'single',
            milestones: Array.isArray(item.milestones) ? item.milestones : []
          }))
        : (req.body.serviceIds || []).map((id) => ({ serviceId: Number(id), packageType: 'single', milestones: [] }));

    if (!payloadItems.length) {
      await transaction.rollback();
      return res.status(400).json({ message: 'At least one service is required for checkout.' });
    }

    const uniqueIds = [...new Set(payloadItems.map((item) => item.serviceId))];
    const services = await Service.findAll({ where: { id: uniqueIds, approvalStatus: 'approved' }, transaction });
    if (services.length !== uniqueIds.length) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Some services are unavailable for checkout.' });
    }

    const createdOrders = [];
    const orderDrafts = [];
    for (const item of payloadItems) {
      const service = services.find((entry) => entry.id === item.serviceId);
      const amount = getPriceForPackage(service, item.packageType);
      orderDrafts.push({ item, service, amount });
    }

    const grossTotal = orderDrafts.reduce((sum, entry) => sum + Number(entry.amount), 0);
    let couponMeta = null;
    if (req.body.couponCode) {
      const { coupon, discount, finalAmount } = await validateAndComputeCoupon({
        code: req.body.couponCode,
        amount: grossTotal
      });
      couponMeta = { coupon, discount, finalAmount };
      coupon.usedCount = Number(coupon.usedCount) + 1;
      await coupon.save({ transaction });
    }

    const effectiveTotal = couponMeta ? Number(couponMeta.finalAmount) : grossTotal;
    const couponDiscount = couponMeta ? Number(couponMeta.discount) : 0;

    for (const draft of orderDrafts) {
      const proportionalAmount = grossTotal > 0 ? (Number(draft.amount) / grossTotal) * effectiveTotal : Number(draft.amount);
      const amount = Number(proportionalAmount.toFixed(2));
      const service = draft.service;
      const commissionAmount = Number(((amount * DEFAULT_COMMISSION_PERCENT) / 100).toFixed(2));
      const escrowAmount = Number((amount - commissionAmount).toFixed(2));

      const order = await Order.create(
        {
          buyerId: req.user.id,
          sellerId: service.sellerId,
          serviceId: service.id,
          amount,
          packageType: draft.item.packageType,
          paymentStatus: 'Paid',
          escrowStatus: 'Held',
          commissionAmount,
          escrowAmount,
          platformFeePercent: DEFAULT_COMMISSION_PERCENT
        },
        { transaction }
      );

      await createOrderMilestones({ order, milestones: draft.item.milestones, transaction });
      service.purchases = Number(service.purchases || 0) + 1;
      await service.save({ transaction });
      await pushViewedCategory(req.user.id, service.category, transaction);

      await recordWalletTransaction({
        userId: req.user.id,
        type: 'Debit',
        amount,
        reason: 'Payment made (escrow hold)',
        relatedOrderId: order.id,
        meta: { commissionAmount, escrowAmount, serviceId: service.id },
        transaction
      });

      createdOrders.push(order);
    }

    const sellerTotals = createdOrders.reduce((acc, item) => {
      acc[item.sellerId] = (acc[item.sellerId] || 0) + Number(item.escrowAmount);
      return acc;
    }, {});

    for (const sellerId of Object.keys(sellerTotals)) {
      await createNotification({
        userId: Number(sellerId),
        type: 'order_created',
        title: 'New Order Received',
        message: `A new order worth $${Number(sellerTotals[sellerId]).toFixed(2)} is now in escrow.`,
        meta: { buyerId: req.user.id },
        transaction
      });
    }

    await createNotification({
      userId: req.user.id,
      type: 'checkout_success',
      title: 'Checkout Successful',
      message: `Your checkout is complete for ${createdOrders.length} item(s).`,
      meta: { orderIds: createdOrders.map((item) => item.id) },
      transaction
    });

    await transaction.commit();
    const totalAmount = createdOrders.reduce((sum, order) => sum + Number(order.amount), 0);
    return res.status(201).json({
      message: 'Checkout completed. Funds are held in escrow until completion.',
      commissionPercent: DEFAULT_COMMISSION_PERCENT,
      totalAmount,
      grossTotal: Number(grossTotal.toFixed(2)),
      couponDiscount: Number(couponDiscount.toFixed(2)),
      finalAmount: Number(effectiveTotal.toFixed(2)),
      coupon: couponMeta
        ? {
            code: couponMeta.coupon.code,
            discountType: couponMeta.coupon.discountType,
            discountValue: Number(couponMeta.coupon.discountValue)
          }
        : null,
      orders: createdOrders
    });
  } catch (error) {
    await transaction.rollback();
    if (error.message && error.message.includes('Package "')) return res.status(400).json({ message: error.message });
    if (error.message && error.message.includes('Milestone total')) return res.status(400).json({ message: error.message });
    next(error);
  }
};

const applyCouponForOrder = async (req, res, next) => {
  try {
    const { coupon, discount, finalAmount } = await validateAndComputeCoupon({
      code: req.body.code,
      amount: Number(req.body.amount)
    });

    res.status(200).json({
      valid: true,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: Number(coupon.discountValue),
      discount: Number(discount),
      finalAmount: Number(finalAmount)
    });
  } catch (error) {
    res.status(400).json({ valid: false, message: error.message });
  }
};

const orderInclude = [
  { model: Service, as: 'service', attributes: ['id', 'title', 'price', 'category', 'views', 'purchases'] },
  { model: InvoiceRecord, as: 'invoice', attributes: ['invoiceNumber', 'downloadUrl', 'sentToBuyer', 'sentAt'] },
  { model: Milestone, as: 'milestones', attributes: ['id', 'title', 'amount', 'status', 'completedAt'] }
];

const getBuyerOrders = async (req, res, next) => {
  try {
    const where = req.user.role === 'admin' ? {} : { buyerId: req.user.id };
    const orders = await Order.findAll({
      where,
      include: [...orderInclude, { model: User, as: 'seller', attributes: ['id', 'name', 'email', 'sellerLevel', 'reputationScore'] }],
      order: [['createdAt', 'DESC']]
    });
    res.status(200).json({ count: orders.length, orders });
  } catch (error) {
    next(error);
  }
};

const getSellerOrders = async (req, res, next) => {
  try {
    const where = req.user.role === 'admin' ? {} : { sellerId: req.user.id };
    const orders = await Order.findAll({
      where,
      include: [...orderInclude, { model: User, as: 'buyer', attributes: ['id', 'name', 'email'] }],
      order: [['createdAt', 'DESC']]
    });
    res.status(200).json({ count: orders.length, orders });
  } catch (error) {
    next(error);
  }
};

const getSellerPerformance = async (req, res, next) => {
  try {
    const orders = await Order.findAll({ where: { sellerId: req.user.id } });
    const totalOrders = orders.length;
    const completedOrders = orders.filter((item) => item.status === 'Completed').length;
    const activeOrders = orders.filter((item) => item.status !== 'Completed').length;
    const totalEscrowHeld = orders.filter((item) => item.escrowStatus === 'Held').reduce((sum, item) => sum + Number(item.escrowAmount || 0), 0);
    const totalRevenueReleased = orders
      .filter((item) => item.escrowStatus === 'Released')
      .reduce((sum, item) => sum + Number(item.escrowAmount || 0), 0);
    const totalCommission = orders.reduce((sum, item) => sum + Number(item.commissionAmount || 0), 0);
    const completionRate = totalOrders ? Number(((completedOrders / totalOrders) * 100).toFixed(1)) : 0;

    res.status(200).json({
      totalOrders,
      completedOrders,
      activeOrders,
      completionRate,
      totalEscrowHeld,
      totalRevenueReleased,
      totalCommission
    });
  } catch (error) {
    next(error);
  }
};

const updateOrderStatus = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { status } = req.body;
    const order = await Order.findByPk(Number(req.params.id), { transaction });
    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Order not found' });
    }

    const isSeller = order.sellerId === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isSeller && !isAdmin) {
      await transaction.rollback();
      return res.status(403).json({ message: 'Only seller or admin can update order status' });
    }

    const validTransitions = { Pending: ['Accepted'], Accepted: ['Completed'], Completed: [] };
    if (!validTransitions[order.status].includes(status)) {
      await transaction.rollback();
      return res.status(400).json({ message: `Invalid status transition from ${order.status} to ${status}` });
    }

    order.status = status;
    if (status === 'Accepted') {
      await createNotification({
        userId: order.buyerId,
        type: 'order_accepted',
        title: 'Order Accepted',
        message: `Seller accepted order #${order.id}.`,
        meta: { orderId: order.id },
        transaction
      });
    }

    if (status === 'Completed' && order.escrowStatus === 'Held') {
      const milestones = await Milestone.findAll({ where: { orderId: order.id }, transaction });
      if (milestones.length > 0 && milestones.some((m) => m.status !== 'Completed')) {
        await transaction.rollback();
        return res.status(400).json({ message: 'Complete all milestones before completing order.' });
      }

      await releaseEscrowToSeller({ order, transaction, reason: 'Order completed: escrow released' });
      await updateSellerReputation(order.sellerId, { transaction });
    }

    await order.save({ transaction });
    if (status === 'Completed') {
      const completedOrder = await Order.findByPk(order.id, {
        include: [
          { model: Service, as: 'service', attributes: ['id', 'title', 'price', 'category', 'description'] },
          { model: User, as: 'buyer', attributes: ['id', 'name', 'email'] },
          { model: User, as: 'seller', attributes: ['id', 'name', 'email'] }
        ],
        transaction
      });
      await ensureInvoiceRecord(completedOrder, { transaction });
    }

    await createNotification({
      userId: order.buyerId,
      type: 'order_status',
      title: 'Order Status Updated',
      message: `Your order #${order.id} status changed to ${status}.`,
      meta: { orderId: order.id, status, escrowStatus: order.escrowStatus },
      transaction
    });

    if (status === 'Completed') {
      await createNotification({
        userId: order.sellerId,
        type: 'escrow_released',
        title: 'Escrow Released',
        message: `Funds for order #${order.id} were released to your wallet.`,
        meta: { orderId: order.id, escrowAmount: order.escrowAmount, commission: order.commissionAmount },
        transaction
      });
    }

    await transaction.commit();
    const invoice = status === 'Completed' ? await InvoiceRecord.findOne({ where: { orderId: order.id } }) : null;

    res.status(200).json({
      message: 'Order status updated',
      order,
      invoice: invoice
        ? {
            invoiceNumber: invoice.invoiceNumber,
            invoiceDate: invoice.invoiceDate,
            dueDate: invoice.dueDate,
            totalAmount: Number(invoice.totalAmount),
            commission: Number(invoice.commission || 0),
            downloadUrl: invoice.downloadUrl || `${req.protocol}://${req.get('host')}/api/invoices/${order.id}`
          }
        : null,
      escrow: {
        status: order.escrowStatus,
        releasedAmount: order.escrowStatus === 'Released' ? Number(order.escrowAmount || 0) : 0
      }
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

const completeMilestone = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const order = await Order.findByPk(Number(req.params.id), { transaction });
    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Order not found' });
    }
    if (order.sellerId !== req.user.id && req.user.role !== 'admin') {
      await transaction.rollback();
      return res.status(403).json({ message: 'Only seller/admin can complete milestones.' });
    }

    const milestone = await Milestone.findOne({
      where: { id: Number(req.params.milestoneId), orderId: order.id },
      transaction
    });
    if (!milestone) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Milestone not found' });
    }
    if (milestone.status === 'Completed') {
      await transaction.rollback();
      return res.status(400).json({ message: 'Milestone already completed' });
    }

    milestone.status = 'Completed';
    milestone.completedAt = new Date();
    await milestone.save({ transaction });

    const gross = Number(milestone.amount);
    const commission = Number(((gross * DEFAULT_COMMISSION_PERCENT) / 100).toFixed(2));
    const net = Number((gross - commission).toFixed(2));

    const seller = await User.findByPk(order.sellerId, { transaction });
    if (seller) {
      seller.wallet = Number(seller.wallet) + net;
      await seller.save({ transaction });
    }
    order.escrowAmount = Number((Number(order.escrowAmount) - net).toFixed(2));
    order.commissionAmount = Number((Number(order.commissionAmount) + commission).toFixed(2));
    if (Number(order.escrowAmount) <= 0) order.escrowStatus = 'Released';
    await order.save({ transaction });

    await recordWalletTransaction({
      userId: order.sellerId,
      type: 'Credit',
      amount: net,
      reason: `Milestone completed: ${milestone.title}`,
      relatedOrderId: order.id,
      meta: { milestoneId: milestone.id, gross, commission },
      transaction
    });
    await createNotification({
      userId: order.buyerId,
      type: 'milestone_completed',
      title: 'Milestone Completed',
      message: `Milestone "${milestone.title}" completed for order #${order.id}.`,
      meta: { orderId: order.id, milestoneId: milestone.id },
      transaction
    });

    await updateSellerReputation(order.sellerId, { transaction });
    await transaction.commit();
    return res.status(200).json({ message: 'Milestone completed and funds released.', milestone, order });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

const statusValidation = [body('status').isIn(['Accepted', 'Completed']).withMessage('Status must be Accepted or Completed')];

module.exports = {
  checkoutValidation,
  orderIdValidation,
  milestoneIdValidation,
  applyCouponValidation,
  statusValidation,
  checkout,
  applyCouponForOrder,
  getBuyerOrders,
  getSellerOrders,
  getSellerPerformance,
  updateOrderStatus,
  completeMilestone
};
