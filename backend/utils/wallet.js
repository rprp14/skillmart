const { WalletTransaction } = require('../models');

const recordWalletTransaction = async ({
  userId,
  type,
  amount,
  reason,
  relatedOrderId = null,
  meta = null,
  transaction = null
}) =>
  WalletTransaction.create(
    {
      userId,
      type,
      amount: Number(amount || 0),
      reason,
      relatedOrderId,
      meta
    },
    transaction ? { transaction } : {}
  );

module.exports = { recordWalletTransaction };
