const { param } = require('express-validator');
const { fn, col, Op } = require('sequelize');
const { User, Service, Order, Dispute } = require('../models');
const createNotification = require('../utils/createNotification');

const isIntId = (value) => Number.isInteger(Number(value)) && Number(value) > 0;

const mongoIdValidation = [
  param('id').custom((value) => isIntId(value)).withMessage('Invalid id')
];

const getUsers = async (req, res, next) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({ count: users.length, users });
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (req.user.id === id) {
      return res.status(400).json({ message: 'Admin cannot delete own account.' });
    }

    const deleted = await User.destroy({ where: { id } });
    if (!deleted) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const getAllServices = async (req, res, next) => {
  try {
    const services = await Service.findAll({
      include: [{ model: User, as: 'seller', attributes: ['id', 'name', 'email'] }],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({ count: services.length, services });
  } catch (error) {
    next(error);
  }
};

const approveService = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const service = await Service.findByPk(id);

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    service.approvalStatus = 'approved';
    await service.save();
    await createNotification({
      userId: service.sellerId,
      type: 'service_approved',
      title: 'Service Approved',
      message: `Your service "${service.title}" is now approved and visible to buyers.`,
      meta: { serviceId: service.id }
    });
    const serviceWithSeller = await Service.findByPk(id, {
      include: [{ model: User, as: 'seller', attributes: ['id', 'name', 'email'] }]
    });

    res.status(200).json({ message: 'Service approved', service: serviceWithSeller || service });
  } catch (error) {
    next(error);
  }
};

const deleteServiceByAdmin = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const deleted = await Service.destroy({ where: { id } });

    if (!deleted) {
      return res.status(404).json({ message: 'Service not found' });
    }

    res.status(200).json({ message: 'Service deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const getAnalytics = async (req, res, next) => {
  try {
    const [totalUsers, totalSellers, totalServices, totalOrders, revenueResult, commissionResult, openDisputes, topCategoryRow] = await Promise.all([
      User.count(),
      User.count({ where: { role: 'seller' } }),
      Service.count(),
      Order.count(),
      Order.findAll({
        where: { paymentStatus: 'Paid' },
        attributes: [[fn('COALESCE', fn('SUM', col('amount')), 0), 'totalRevenue']],
        raw: true
      }),
      Order.findAll({
        attributes: [[fn('COALESCE', fn('SUM', col('commission_amount')), 0), 'totalCommission']],
        raw: true
      }),
      Dispute.count({ where: { status: { [Op.in]: ['Open', 'UnderReview'] } } }),
      Service.findAll({
        attributes: ['category', [fn('COUNT', col('id')), 'count']],
        group: ['category'],
        order: [[fn('COUNT', col('id')), 'DESC']],
        limit: 1,
        raw: true
      })
    ]);

    const totalRevenue = Number(revenueResult[0]?.totalRevenue || 0);
    const totalCommission = Number(commissionResult[0]?.totalCommission || 0);
    const topCategory = topCategoryRow[0]?.category || null;

    res.status(200).json({
      totalUsers,
      totalSellers,
      totalServices,
      totalOrders,
      totalRevenue,
      totalCommission,
      openDisputes,
      topCategory
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  mongoIdValidation,
  getUsers,
  deleteUser,
  getAllServices,
  approveService,
  deleteServiceByAdmin,
  getAnalytics
};
