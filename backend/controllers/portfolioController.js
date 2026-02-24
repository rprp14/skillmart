const { body, param } = require('express-validator');
const { Portfolio, User } = require('../models');

const isIntId = (value) => Number.isInteger(Number(value)) && Number(value) > 0;

const portfolioValidation = [
  body('title').trim().isLength({ min: 2, max: 150 }).withMessage('title required'),
  body('description').optional().isLength({ max: 1000 }),
  body('imageUrl').isURL().withMessage('imageUrl must be valid URL')
];

const portfolioIdValidation = [param('id').custom((value) => isIntId(value)).withMessage('Invalid portfolio id')];
const sellerIdValidation = [param('sellerId').custom((value) => isIntId(value)).withMessage('Invalid seller id')];

const createPortfolio = async (req, res, next) => {
  try {
    if (!['seller', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only sellers can create portfolio entries.' });
    }
    const portfolio = await Portfolio.create({
      sellerId: req.user.id,
      title: req.body.title,
      description: req.body.description || null,
      imageUrl: req.body.imageUrl
    });
    res.status(201).json({ message: 'Portfolio item created', portfolio });
  } catch (error) {
    next(error);
  }
};

const getPortfolioBySeller = async (req, res, next) => {
  try {
    const seller = await User.findByPk(Number(req.params.sellerId), { attributes: ['id', 'name', 'email'] });
    if (!seller) return res.status(404).json({ message: 'Seller not found' });
    const portfolio = await Portfolio.findAll({
      where: { sellerId: Number(req.params.sellerId) },
      order: [['createdAt', 'DESC']]
    });
    res.status(200).json({ seller, count: portfolio.length, portfolio });
  } catch (error) {
    next(error);
  }
};

const updatePortfolio = async (req, res, next) => {
  try {
    const item = await Portfolio.findByPk(Number(req.params.id));
    if (!item) return res.status(404).json({ message: 'Portfolio item not found' });
    if (item.sellerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not allowed to update this item.' });
    }
    item.title = req.body.title ?? item.title;
    item.description = req.body.description ?? item.description;
    item.imageUrl = req.body.imageUrl ?? item.imageUrl;
    await item.save();
    res.status(200).json({ message: 'Portfolio item updated', portfolio: item });
  } catch (error) {
    next(error);
  }
};

const deletePortfolio = async (req, res, next) => {
  try {
    const item = await Portfolio.findByPk(Number(req.params.id));
    if (!item) return res.status(404).json({ message: 'Portfolio item not found' });
    if (item.sellerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not allowed to delete this item.' });
    }
    await item.destroy();
    res.status(200).json({ message: 'Portfolio item deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  portfolioValidation,
  portfolioIdValidation,
  sellerIdValidation,
  createPortfolio,
  getPortfolioBySeller,
  updatePortfolio,
  deletePortfolio
};
