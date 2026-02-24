const express = require('express');
const {
  portfolioValidation,
  portfolioIdValidation,
  sellerIdValidation,
  createPortfolio,
  getPortfolioBySeller,
  updatePortfolio,
  deletePortfolio
} = require('../controllers/portfolioController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { validateRequest } = require('../middleware/validationMiddleware');

const router = express.Router();

router.post('/', protect, authorizeRoles('seller', 'admin'), portfolioValidation, validateRequest, createPortfolio);
router.get('/:sellerId', sellerIdValidation, validateRequest, getPortfolioBySeller);
router.put('/:id', protect, authorizeRoles('seller', 'admin'), portfolioIdValidation, portfolioValidation, validateRequest, updatePortfolio);
router.delete('/:id', protect, authorizeRoles('seller', 'admin'), portfolioIdValidation, validateRequest, deletePortfolio);

module.exports = router;
