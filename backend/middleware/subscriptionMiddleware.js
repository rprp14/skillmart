const { Subscription } = require('../models');

const ensureActiveSubscription = async (req, res, next) => {
  try {
    if (!req.user) return next();
    let subscription = await Subscription.findOne({
      where: { userId: req.user.id, status: 'Active' },
      order: [['startDate', 'DESC']]
    });

    if (!subscription) {
      subscription = await Subscription.create({
        userId: req.user.id,
        planName: 'Free',
        price: 0,
        startDate: new Date(),
        endDate: null,
        status: 'Active'
      });
    } else if (subscription.endDate && new Date(subscription.endDate) < new Date()) {
      subscription.status = 'Expired';
      await subscription.save();
      subscription = await Subscription.create({
        userId: req.user.id,
        planName: 'Free',
        price: 0,
        startDate: new Date(),
        endDate: null,
        status: 'Active'
      });
    }

    req.subscription = subscription;
    next();
  } catch (error) {
    next(error);
  }
};

const requireSubscriptionPlans = (...plans) => [
  ensureActiveSubscription,
  (req, res, next) => {
    const plan = req.subscription?.planName || 'Free';
    if (req.user?.role === 'admin') return next();
    if (!plans.includes(plan)) {
      return res.status(403).json({
        message: `This feature requires ${plans.join(' or ')} subscription. Current plan: ${plan}`
      });
    }
    next();
  }
];

module.exports = {
  ensureActiveSubscription,
  requireSubscriptionPlans
};
