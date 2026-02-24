const { body, param } = require('express-validator');
const { sequelize } = require('../config/db');
const { WithdrawalRequest, User } = require('../models');
const { recordWalletTransaction } = require('../utils/wallet');
const createNotification = require('../utils/createNotification');

const isIntId = (value) => Number.isInteger(Number(value)) && Number(value) > 0;

const requestValidation = [body('amount').isFloat({ gt: 0 }).withMessage('amount must be greater than 0')];
const adminProcessValidation = [
  param('id').custom((value) => isIntId(value)).withMessage('Invalid request id'),
  body('status').isIn(['Approved', 'Rejected']).withMessage('status must be Approved or Rejected'),
  body('note').optional().isLength({ max: 500 })
];

const createWithdrawalRequest = async (req, res, next) => {
  try {
    if (!['seller', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only sellers can request withdrawals.' });
    }
    const amount = Number(req.body.amount);
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (Number(user.wallet) < amount) return res.status(400).json({ message: 'Insufficient wallet balance.' });

    const existingPending = await WithdrawalRequest.findOne({
      where: { sellerId: req.user.id, status: 'Pending' }
    });
    if (existingPending) return res.status(409).json({ message: 'You already have a pending withdrawal request.' });

    const request = await WithdrawalRequest.create({
      sellerId: req.user.id,
      amount,
      status: 'Pending',
      requestedAt: new Date()
    });

    res.status(201).json({ message: 'Withdrawal request submitted.', request });
  } catch (error) {
    next(error);
  }
};

const getMyWithdrawalRequests = async (req, res, next) => {
  try {
    const requests = await WithdrawalRequest.findAll({
      where: { sellerId: req.user.id },
      order: [['requestedAt', 'DESC']]
    });
    res.status(200).json({ count: requests.length, requests });
  } catch (error) {
    next(error);
  }
};

const getPendingWithdrawalRequests = async (req, res, next) => {
  try {
    const requests = await WithdrawalRequest.findAll({
      where: { status: 'Pending' },
      include: [{ model: User, as: 'seller', attributes: ['id', 'name', 'email'] }],
      order: [['requestedAt', 'DESC']]
    });
    res.status(200).json({ count: requests.length, requests });
  } catch (error) {
    next(error);
  }
};

const processWithdrawalRequest = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const request = await WithdrawalRequest.findByPk(Number(req.params.id), { transaction });
    if (!request) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Withdrawal request not found.' });
    }
    if (request.status !== 'Pending') {
      await transaction.rollback();
      return res.status(400).json({ message: 'Request already processed.' });
    }

    request.status = req.body.status;
    request.note = req.body.note || request.note;
    request.processedAt = new Date();

    const seller = await User.findByPk(request.sellerId, { transaction });
    if (!seller) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Seller not found.' });
    }

    if (request.status === 'Approved') {
      if (Number(seller.wallet) < Number(request.amount)) {
        await transaction.rollback();
        return res.status(400).json({ message: 'Seller wallet balance is no longer sufficient.' });
      }
      seller.wallet = Number(seller.wallet) - Number(request.amount);
      await seller.save({ transaction });
      await recordWalletTransaction({
        userId: seller.id,
        type: 'Debit',
        amount: Number(request.amount),
        reason: 'Withdrawal approved',
        meta: { withdrawalRequestId: request.id },
        transaction
      });
    }

    await request.save({ transaction });
    await createNotification({
      userId: seller.id,
      type: 'withdrawal_update',
      title: 'Withdrawal Request Updated',
      message: `Your withdrawal request #${request.id} was ${request.status}.`,
      meta: { requestId: request.id, status: request.status },
      transaction
    });
    await transaction.commit();
    return res.status(200).json({ message: 'Withdrawal request processed.', request });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

module.exports = {
  requestValidation,
  adminProcessValidation,
  createWithdrawalRequest,
  getMyWithdrawalRequests,
  getPendingWithdrawalRequests,
  processWithdrawalRequest
};
