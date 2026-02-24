const { body } = require('express-validator');
const { Subscription } = require('../models');

const PLAN_PRICING = {
  Free: 0,
  Pro: Number(process.env.SUBSCRIPTION_PRO_PRICE || 29),
  Premium: Number(process.env.SUBSCRIPTION_PREMIUM_PRICE || 79)
};
const PLAN_DURATION_DAYS = {
  Free: 3650,
  Pro: Number(process.env.SUBSCRIPTION_PRO_DAYS || 30),
  Premium: Number(process.env.SUBSCRIPTION_PREMIUM_DAYS || 30)
};

const upgradeValidation = [
  body('planName').isIn(['Free', 'Pro', 'Premium']).withMessage('planName must be Free, Pro, or Premium')
];

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const upgradeSubscription = async (req, res, next) => {
  try {
    const planName = req.body.planName;
    await Subscription.update({ status: 'Expired' }, { where: { userId: req.user.id, status: 'Active' } });
    const startDate = new Date();
    const sub = await Subscription.create({
      userId: req.user.id,
      planName,
      price: PLAN_PRICING[planName],
      startDate,
      endDate: addDays(startDate, PLAN_DURATION_DAYS[planName]),
      status: 'Active'
    });
    res.status(200).json({ message: `Upgraded to ${planName}`, subscription: sub });
  } catch (error) {
    next(error);
  }
};

const getMySubscription = async (req, res, next) => {
  try {
    const subscription = await Subscription.findOne({
      where: { userId: req.user.id, status: 'Active' },
      order: [['startDate', 'DESC']]
    });
    res.status(200).json({
      subscription: subscription || {
        planName: 'Free',
        price: 0,
        status: 'Active'
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  upgradeValidation,
  upgradeSubscription,
  getMySubscription
};
