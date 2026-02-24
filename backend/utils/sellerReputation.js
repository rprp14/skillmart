const { Op, fn, col } = require('sequelize');
const { Order, Review, Service, Dispute, User } = require('../models');

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const resolveSellerLevel = ({ completedOrders, rating, disputeCount, revenue }) => {
  if (completedOrders >= 50 && rating >= 4.7 && disputeCount <= 2 && revenue >= 5000) return 'TopRated';
  if (completedOrders >= 20 && rating >= 4.4 && disputeCount <= 4 && revenue >= 2000) return 'Level2';
  if (completedOrders >= 8 && rating >= 4.0 && disputeCount <= 6 && revenue >= 500) return 'Level1';
  return 'New';
};

const updateSellerReputation = async (sellerId, options = {}) => {
  const whereOrders = { sellerId, status: 'Completed' };
  const whereDisputes = { status: { [Op.in]: ['Open', 'UnderReview', 'Resolved'] } };

  const [completedOrders, revenueRows, reviewRows, disputeCount] = await Promise.all([
    Order.count({ where: whereOrders, transaction: options.transaction }),
    Order.findAll({
      where: whereOrders,
      attributes: [[fn('COALESCE', fn('SUM', col('amount')), 0), 'revenue']],
      raw: true,
      transaction: options.transaction
    }),
    Review.findAll({
      include: [{ model: Service, as: 'service', attributes: [], where: { sellerId } }],
      attributes: [[fn('COALESCE', fn('AVG', col('Review.rating')), 0), 'avgRating']],
      raw: true,
      transaction: options.transaction
    }),
    Dispute.count({
      include: [{ model: Order, as: 'order', attributes: [], where: { sellerId } }],
      where: whereDisputes,
      transaction: options.transaction
    })
  ]);

  const revenue = Number(revenueRows[0]?.revenue || 0);
  const rating = Number(reviewRows[0]?.avgRating || 0);
  const reputationScore = clamp(
    Number((completedOrders * 1.2 + rating * 15 - disputeCount * 8 + revenue / 200).toFixed(2)),
    0,
    100
  );
  const sellerLevel = resolveSellerLevel({ completedOrders, rating, disputeCount, revenue });

  await User.update(
    { reputationScore, sellerLevel },
    { where: { id: sellerId }, transaction: options.transaction }
  );

  return { sellerId, completedOrders, rating, disputeCount, revenue, reputationScore, sellerLevel };
};

module.exports = { updateSellerReputation };
