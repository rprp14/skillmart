const express = require('express');
const {
  serviceValidation,
  serviceIdValidation,
  serviceListValidation,
  createService,
  getServices,
  getTrendingServices,
  getRecommendedServices,
  getPersonalizedRecommendations,
  getPricingSuggestion,
  getServiceById,
  updateService,
  deleteService,
  getMyServices
} = require('../controllers/serviceController');
const { protect, optionalProtect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { validateRequest } = require('../middleware/validationMiddleware');

const router = express.Router();

router.get('/', serviceListValidation, validateRequest, getServices);
router.get('/trending', getTrendingServices);
router.get('/recommendations', optionalProtect, getPersonalizedRecommendations);
router.get('/pricing/suggest', getPricingSuggestion);
router.get('/recommended/:id', serviceIdValidation, validateRequest, getRecommendedServices);
router.get('/my/list', protect, authorizeRoles('seller', 'admin'), getMyServices);
router.get('/:id', optionalProtect, serviceIdValidation, validateRequest, getServiceById);

router.post('/', protect, authorizeRoles('seller', 'admin'), serviceValidation, validateRequest, createService);
router.put('/:id', protect, authorizeRoles('seller', 'admin'), serviceIdValidation, serviceValidation, validateRequest, updateService);
router.delete('/:id', protect, authorizeRoles('seller', 'admin'), serviceIdValidation, validateRequest, deleteService);

module.exports = router;
