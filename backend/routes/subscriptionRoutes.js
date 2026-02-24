const express = require('express');
const { upgradeValidation, upgradeSubscription, getMySubscription } = require('../controllers/subscriptionController');
const { protect } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/validationMiddleware');

const router = express.Router();

router.use(protect);
router.post('/upgrade', upgradeValidation, validateRequest, upgradeSubscription);
router.get('/my', getMySubscription);

module.exports = router;
