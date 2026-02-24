const express = require('express');
const {
  categoryValidation,
  categoryIdValidation,
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory
} = require('../controllers/categoryController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { validateRequest } = require('../middleware/validationMiddleware');

const router = express.Router();

router.get('/', getCategories);
router.post('/', protect, authorizeRoles('admin'), categoryValidation, validateRequest, createCategory);
router.put('/:id', protect, authorizeRoles('admin'), categoryIdValidation, categoryValidation, validateRequest, updateCategory);
router.delete('/:id', protect, authorizeRoles('admin'), categoryIdValidation, validateRequest, deleteCategory);

module.exports = router;
