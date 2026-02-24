const express = require('express');
const { getSellerAnalytics } = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { requireSubscriptionPlans } = require('../middleware/subscriptionMiddleware');

const router = express.Router();

router.get('/seller', protect, authorizeRoles('seller', 'admin'), ...requireSubscriptionPlans('Pro', 'Premium'), getSellerAnalytics);

module.exports = router;
