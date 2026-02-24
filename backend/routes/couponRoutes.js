const express = require('express');
const {
  couponValidation,
  applyCouponValidation,
  createCoupon,
  getCoupons,
  applyCoupon
} = require('../controllers/couponController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { validateRequest } = require('../middleware/validationMiddleware');

const router = express.Router();

router.get('/', getCoupons);
router.post('/', protect, authorizeRoles('admin'), couponValidation, validateRequest, createCoupon);
router.post('/apply', applyCouponValidation, validateRequest, applyCoupon);

module.exports = router;
