const express = require('express');
const {
  checkoutValidation,
  orderIdValidation,
  milestoneIdValidation,
  applyCouponValidation,
  statusValidation,
  checkout,
  applyCouponForOrder,
  getBuyerOrders,
  getSellerOrders,
  getSellerPerformance,
  updateOrderStatus,
  completeMilestone
} = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { validateRequest } = require('../middleware/validationMiddleware');

const router = express.Router();

router.post('/checkout', protect, authorizeRoles('buyer'), checkoutValidation, validateRequest, checkout);
router.post('/apply-coupon', protect, authorizeRoles('buyer', 'admin'), applyCouponValidation, validateRequest, applyCouponForOrder);
router.get('/buyer', protect, authorizeRoles('buyer', 'admin'), getBuyerOrders);
router.get('/seller', protect, authorizeRoles('seller', 'admin'), getSellerOrders);
router.get('/seller/performance', protect, authorizeRoles('seller', 'admin'), getSellerPerformance);
router.put('/:id/status', protect, authorizeRoles('seller', 'admin'), orderIdValidation, statusValidation, validateRequest, updateOrderStatus);
router.put(
  '/:id/milestones/:milestoneId/complete',
  protect,
  authorizeRoles('seller', 'admin'),
  orderIdValidation,
  milestoneIdValidation,
  validateRequest,
  completeMilestone
);

module.exports = router;
