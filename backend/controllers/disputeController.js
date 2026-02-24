const { body, param } = require('express-validator');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { Dispute, Order, User, Service } = require('../models');
const createNotification = require('../utils/createNotification');
const { recordWalletTransaction } = require('../utils/wallet');
const { updateSellerReputation } = require('../utils/sellerReputation');

const isIntId = (value) => Number.isInteger(Number(value)) && Number(value) > 0;

const raiseDisputeValidation = [
  body('orderId').custom((value) => isIntId(value)).withMessage('Invalid order id'),
  body('reason').trim().isLength({ min: 10, max: 500 }).withMessage('Reason should be between 10 and 500 characters'),
  body('proofUrl').optional().isURL().withMessage('proofUrl must be a valid URL')
];

const disputeIdValidation = [param('id').custom((value) => isIntId(value)).withMessage('Invalid dispute id')];

const resolveDisputeValidation = [
  body('status').isIn(['UnderReview', 'Resolved', 'Rejected']).withMessage('Invalid dispute status'),
  body('decision').optional().isIn(['refund_buyer', 'release_seller', 'none']).withMessage('Invalid admin decision'),
  body('adminNotes').optional().isLength({ max: 1500 }).withMessage('adminNotes too long')
];

const raiseDispute = async (req, res, next) => {
  try {
    const order = await Order.findByPk(Number(req.body.orderId));
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.buyerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only buyer can raise dispute for this order' });
    }
    if (order.status !== 'Completed' && order.status !== 'Accepted') {
      return res.status(400).json({ message: 'Dispute can be raised only for accepted/completed orders' });
    }

    const existingOpen = await Dispute.findOne({
      where: { orderId: order.id, status: { [Op.in]: ['Open', 'UnderReview'] } }
    });
    if (existingOpen) return res.status(409).json({ message: 'An active dispute already exists for this order.' });

    const dispute = await Dispute.create({
      orderId: order.id,
      raisedById: req.user.id,
      reason: req.body.reason,
      proofUrl: req.body.proofUrl || null,
      status: 'Open'
    });

    await createNotification({
      userId: order.sellerId,
      type: 'dispute_raised',
      title: 'Dispute Raised',
      message: `A dispute has been raised for order #${order.id}.`,
      meta: { disputeId: dispute.id, orderId: order.id }
    });

    res.status(201).json({ message: 'Dispute raised successfully.', dispute });
  } catch (error) {
    next(error);
  }
};

const getMyDisputes = async (req, res, next) => {
  try {
    const where =
      req.user.role === 'admin'
        ? {}
        : {
            raisedById: req.user.id
          };

    const disputes = await Dispute.findAll({
      where,
      include: [
        { model: Order, as: 'order', include: [{ model: Service, as: 'service', attributes: ['id', 'title', 'category'] }] },
        { model: User, as: 'raisedBy', attributes: ['id', 'name', 'email'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({ count: disputes.length, disputes });
  } catch (error) {
    next(error);
  }
};

const resolveDispute = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const dispute = await Dispute.findByPk(Number(req.params.id), {
      include: [{ model: Order, as: 'order' }],
      transaction
    });
    if (!dispute) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Dispute not found' });
    }

    const decision = req.body.decision || dispute.adminDecision || 'none';
    dispute.status = req.body.status;
    dispute.adminDecision = decision;
    dispute.adminNotes = req.body.adminNotes || dispute.adminNotes;
    if (req.body.status === 'Resolved' || req.body.status === 'Rejected') {
      dispute.resolvedAt = new Date();
    }

    const order = dispute.order;
    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Related order not found' });
    }

    if (dispute.status === 'Resolved' && decision === 'refund_buyer') {
      const buyer = await User.findByPk(order.buyerId, { transaction });
      if (buyer) {
        buyer.wallet = Number(buyer.wallet) + Number(order.escrowAmount || order.amount);
        await buyer.save({ transaction });
      }
      order.escrowStatus = 'Refunded';
      order.status = 'Completed';
      await recordWalletTransaction({
        userId: order.buyerId,
        type: 'Credit',
        amount: order.escrowAmount || order.amount,
        reason: 'Dispute resolved: refund issued',
        relatedOrderId: order.id,
        meta: { disputeId: dispute.id },
        transaction
      });
    }

    if (dispute.status === 'Resolved' && decision === 'release_seller') {
      const seller = await User.findByPk(order.sellerId, { transaction });
      const releasableAmount = Number(order.escrowAmount || order.amount);
      if (seller && order.escrowStatus !== 'Released') {
        seller.wallet = Number(seller.wallet) + releasableAmount;
        await seller.save({ transaction });
        await recordWalletTransaction({
          userId: order.sellerId,
          type: 'Credit',
          amount: releasableAmount,
          reason: 'Dispute resolved: escrow released',
          relatedOrderId: order.id,
          meta: { disputeId: dispute.id, commission: order.commissionAmount || 0 },
          transaction
        });
      }
      order.escrowStatus = 'Released';
      order.status = 'Completed';
    }

    await dispute.save({ transaction });
    await order.save({ transaction });

    await createNotification({
      userId: order.buyerId,
      type: 'dispute_update',
      title: 'Dispute Updated',
      message: `Dispute #${dispute.id} is now ${dispute.status}.`,
      meta: { disputeId: dispute.id, decision },
      transaction
    });
    await createNotification({
      userId: order.sellerId,
      type: 'dispute_update',
      title: 'Dispute Updated',
      message: `Dispute #${dispute.id} is now ${dispute.status}.`,
      meta: { disputeId: dispute.id, decision },
      transaction
    });

    await updateSellerReputation(order.sellerId, { transaction });
    await transaction.commit();

    return res.status(200).json({ message: 'Dispute updated successfully', dispute });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

module.exports = {
  raiseDisputeValidation,
  disputeIdValidation,
  resolveDisputeValidation,
  raiseDispute,
  getMyDisputes,
  resolveDispute
};
