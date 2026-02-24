const { body } = require('express-validator');
const { sequelize } = require('../config/db');
const { User, WalletTransaction } = require('../models');
const { recordWalletTransaction } = require('../utils/wallet');

const withdrawValidation = [
  body('amount').isFloat({ gt: 0 }).withMessage('Withdrawal amount must be greater than zero')
];

const getMyWalletTransactions = async (req, res, next) => {
  try {
    const transactions = await WalletTransaction.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({ count: transactions.length, transactions });
  } catch (error) {
    next(error);
  }
};

const requestWithdrawal = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const amount = Number(req.body.amount);
    const user = await User.findByPk(req.user.id, { transaction });
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ message: 'User not found' });
    }
    if (Number(user.wallet) < amount) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Insufficient wallet balance' });
    }

    user.wallet = Number(user.wallet) - amount;
    await user.save({ transaction });
    await recordWalletTransaction({
      userId: user.id,
      type: 'Debit',
      amount,
      reason: 'Withdrawal processed',
      meta: { processedBy: 'system' },
      transaction
    });

    await transaction.commit();
    return res.status(200).json({ message: 'Withdrawal processed', wallet: user.wallet });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

module.exports = {
  withdrawValidation,
  getMyWalletTransactions,
  requestWithdrawal
};
