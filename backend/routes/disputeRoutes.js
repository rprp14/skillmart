const express = require('express');
const {
  raiseDisputeValidation,
  disputeIdValidation,
  resolveDisputeValidation,
  raiseDispute,
  getMyDisputes,
  resolveDispute
} = require('../controllers/disputeController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { validateRequest } = require('../middleware/validationMiddleware');

const router = express.Router();

router.use(protect);

router.post('/', authorizeRoles('buyer', 'admin'), raiseDisputeValidation, validateRequest, raiseDispute);
router.get('/', getMyDisputes);
router.put(
  '/:id/review',
  authorizeRoles('admin'),
  disputeIdValidation,
  resolveDisputeValidation,
  validateRequest,
  resolveDispute
);

module.exports = router;
