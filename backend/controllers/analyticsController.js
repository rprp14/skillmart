const { fn, col } = require('sequelize');
const { Order, Service } = require('../models');

const getSellerAnalytics = async (req, res, next) => {
  try {
    const sellerId = req.user.id;
    const [orders, serviceRows] = await Promise.all([
      Order.findAll({
        where: { sellerId },
        attributes: ['id', 'amount', 'status', 'commissionAmount']
      }),
      Service.findAll({
        where: { sellerId },
        attributes: ['id', 'title', 'category', 'views', 'purchases', 'rating', 'ratingCount']
      })
    ]);

    const totalOrders = orders.length;
    const completed = orders.filter((item) => item.status === 'Completed');
    const totalRevenue = completed.reduce(
      (sum, item) => sum + (Number(item.amount) - Number(item.commissionAmount || 0)),
      0
    );
    const totalViews = serviceRows.reduce((sum, item) => sum + Number(item.views || 0), 0);
    const totalPurchases = serviceRows.reduce((sum, item) => sum + Number(item.purchases || 0), 0);
    const conversionRate = totalViews ? Number(((totalPurchases / totalViews) * 100).toFixed(2)) : 0;
    const topService =
      serviceRows
        .slice()
        .sort((a, b) => {
          if (Number(b.purchases) !== Number(a.purchases)) return Number(b.purchases) - Number(a.purchases);
          return Number(b.rating) - Number(a.rating);
        })[0] || null;

    return res.status(200).json({
      sellerId,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalOrders,
      conversionRate,
      topService: topService
        ? {
            id: topService.id,
            title: topService.title,
            category: topService.category,
            purchases: Number(topService.purchases || 0),
            views: Number(topService.views || 0),
            rating: Number(topService.rating || 0)
          }
        : null
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSellerAnalytics
};
