const { body, param } = require('express-validator');
const { Category } = require('../models');

const isIntId = (value) => Number.isInteger(Number(value)) && Number(value) > 0;

const categoryValidation = [
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('name is required (2-80 chars)'),
  body('description').optional().isLength({ max: 500 }),
  body('icon').optional().isURL().withMessage('icon should be a valid URL')
];

const categoryIdValidation = [param('id').custom((value) => isIntId(value)).withMessage('Invalid category id')];

const createCategory = async (req, res, next) => {
  try {
    const category = await Category.create({
      name: req.body.name.trim(),
      description: req.body.description || null,
      icon: req.body.icon || null
    });
    res.status(201).json({ message: 'Category created', category });
  } catch (error) {
    if (String(error.message).toLowerCase().includes('unique')) {
      return res.status(409).json({ message: 'Category name must be unique.' });
    }
    next(error);
  }
};

const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.findAll({ order: [['name', 'ASC']] });
    res.status(200).json({ count: categories.length, categories });
  } catch (error) {
    next(error);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findByPk(Number(req.params.id));
    if (!category) return res.status(404).json({ message: 'Category not found' });
    category.name = req.body.name?.trim() ?? category.name;
    category.description = req.body.description ?? category.description;
    category.icon = req.body.icon ?? category.icon;
    await category.save();
    res.status(200).json({ message: 'Category updated', category });
  } catch (error) {
    next(error);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const deleted = await Category.destroy({ where: { id: Number(req.params.id) } });
    if (!deleted) return res.status(404).json({ message: 'Category not found' });
    res.status(200).json({ message: 'Category deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  categoryValidation,
  categoryIdValidation,
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory
};
