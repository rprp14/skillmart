const express = require('express');
const {
  createReviewValidation,
  getReviewsValidation,
  createReview,
  getReviewsByService
} = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { validateRequest } = require('../middleware/validationMiddleware');

const router = express.Router();

router.post('/', protect, authorizeRoles('buyer'), createReviewValidation, validateRequest, createReview);
router.get('/:serviceId', getReviewsValidation, validateRequest, getReviewsByService);

module.exports = router;
