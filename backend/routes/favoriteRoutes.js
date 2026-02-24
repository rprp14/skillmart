const express = require('express');
const {
  favoriteServiceIdValidation,
  getMyFavorites,
  addFavorite,
  removeFavorite
} = require('../controllers/favoriteController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { validateRequest } = require('../middleware/validationMiddleware');

const router = express.Router();

router.use(protect, authorizeRoles('buyer'));

router.get('/', getMyFavorites);
router.post('/:serviceId', favoriteServiceIdValidation, validateRequest, addFavorite);
router.delete('/:serviceId', favoriteServiceIdValidation, validateRequest, removeFavorite);

module.exports = router;
