const { body, param } = require('express-validator');
const { fn, col } = require('sequelize');
const { Review, Service, Order, User } = require('../models');
const createNotification = require('../utils/createNotification');
const { updateSellerReputation } = require('../utils/sellerReputation');

const isIntId = (value) => Number.isInteger(Number(value)) && Number(value) > 0;

const createReviewValidation = [
  body('service').custom((value) => isIntId(value)).withMessage('Invalid service id'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().trim().isLength({ max: 1000 }).withMessage('Comment too long')
];

const getReviewsValidation = [
  param('serviceId').custom((value) => isIntId(value)).withMessage('Invalid service id')
];

const refreshServiceRating = async (serviceId) => {
  const stats = await Review.findAll({
    where: { serviceId },
    attributes: [[fn('AVG', col('rating')), 'avgRating'], [fn('COUNT', col('id')), 'reviewCount']],
    raw: true
  });

  const avgRating = Number(stats[0]?.avgRating || 0);
  const reviewCount = Number(stats[0]?.reviewCount || 0);

  await Service.update(
    { rating: Number(avgRating.toFixed(1)), ratingCount: reviewCount },
    { where: { id: serviceId } }
  );
};

const createReview = async (req, res, next) => {
  try {
    const serviceId = Number(req.body.service);
    const { rating, comment } = req.body;

    const service = await Service.findOne({ where: { id: serviceId, approvalStatus: 'approved' } });
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    const completedOrder = await Order.findOne({
      where: {
        buyerId: req.user.id,
        serviceId,
        status: 'Completed'
      }
    });

    if (!completedOrder) {
      return res.status(403).json({ message: 'Complete at least one order before reviewing this service.' });
    }

    const existing = await Review.findOne({ where: { userId: req.user.id, serviceId } });
    if (existing) {
      return res.status(409).json({ message: 'You have already reviewed this service.' });
    }

    const review = await Review.create({
      userId: req.user.id,
      serviceId,
      rating,
      comment
    });

    await refreshServiceRating(serviceId);
    await createNotification({
      userId: service.sellerId,
      type: 'review_added',
      title: 'New Review Received',
      message: `Your service "${service.title}" received a new ${Number(rating)}/5 review.`,
      meta: { serviceId, reviewId: review.id }
    });
    await updateSellerReputation(service.sellerId);

    res.status(201).json({ message: 'Review submitted', review });
  } catch (error) {
    next(error);
  }
};

const getReviewsByService = async (req, res, next) => {
  try {
    const serviceId = Number(req.params.serviceId);

    const reviews = await Review.findAll({
      where: { serviceId },
      include: [{ model: User, as: 'user', attributes: ['id', 'name'] }],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({ count: reviews.length, reviews });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReviewValidation,
  getReviewsValidation,
  createReview,
  getReviewsByService
};
