const { body } = require('express-validator');
const { Coupon } = require('../models');
const { validateAndComputeCoupon } = require('../utils/coupon');

const couponValidation = [
  body('code').trim().isLength({ min: 3, max: 40 }).withMessage('code required'),
  body('discountType').isIn(['Percentage', 'Flat']).withMessage('discountType invalid'),
  body('discountValue').isFloat({ gt: 0 }).withMessage('discountValue must be > 0'),
  body('expiryDate').isISO8601().withMessage('expiryDate must be valid date'),
  body('maxUsage').isInt({ min: 1 }).withMessage('maxUsage must be >= 1'),
  body('isActive').optional().isBoolean()
];

const applyCouponValidation = [
  body('code').trim().notEmpty().withMessage('code required'),
  body('amount').isFloat({ gt: 0 }).withMessage('amount must be > 0')
];

const createCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.create({
      code: String(req.body.code || '').trim().toUpperCase(),
      discountType: req.body.discountType,
      discountValue: Number(req.body.discountValue),
      expiryDate: req.body.expiryDate,
      maxUsage: Number(req.body.maxUsage),
      usedCount: 0,
      isActive: req.body.isActive !== undefined ? Boolean(req.body.isActive) : true
    });
    res.status(201).json({ message: 'Coupon created', coupon });
  } catch (error) {
    if (String(error.message).toLowerCase().includes('unique')) {
      return res.status(409).json({ message: 'Coupon code must be unique.' });
    }
    next(error);
  }
};

const getCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.findAll({ order: [['createdAt', 'DESC']] });
    res.status(200).json({ count: coupons.length, coupons });
  } catch (error) {
    next(error);
  }
};

const applyCoupon = async (req, res, next) => {
  try {
    const amount = Number(req.body.amount);
    const { coupon, discount, finalAmount } = await validateAndComputeCoupon({
      code: req.body.code,
      amount
    });
    res.status(200).json({
      valid: true,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: Number(coupon.discountValue),
      discount,
      originalAmount: amount,
      finalAmount
    });
  } catch (error) {
    res.status(400).json({ valid: false, message: error.message });
  }
};

module.exports = {
  couponValidation,
  applyCouponValidation,
  createCoupon,
  getCoupons,
  applyCoupon
};
