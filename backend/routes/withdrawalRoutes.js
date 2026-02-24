const express = require('express');
const {
  requestValidation,
  adminProcessValidation,
  createWithdrawalRequest,
  getMyWithdrawalRequests,
  getPendingWithdrawalRequests,
  processWithdrawalRequest
} = require('../controllers/withdrawalRequestController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { validateRequest } = require('../middleware/validationMiddleware');

const router = express.Router();

router.use(protect);

router.post('/request', authorizeRoles('seller', 'admin'), requestValidation, validateRequest, createWithdrawalRequest);
router.get('/my', authorizeRoles('seller', 'admin'), getMyWithdrawalRequests);
router.get('/admin/pending', authorizeRoles('admin'), getPendingWithdrawalRequests);
router.put('/admin/:id', authorizeRoles('admin'), adminProcessValidation, validateRequest, processWithdrawalRequest);

module.exports = router;
