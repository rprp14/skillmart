const express = require('express');
const {
  mongoIdValidation,
  getUsers,
  deleteUser,
  getAllServices,
  approveService,
  deleteServiceByAdmin,
  getAnalytics
} = require('../controllers/adminController');
const { adminProcessValidation, processWithdrawalRequest } = require('../controllers/withdrawalRequestController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { validateRequest } = require('../middleware/validationMiddleware');

const router = express.Router();

router.use(protect, authorizeRoles('admin'));

router.get('/users', getUsers);
router.delete('/user/:id', mongoIdValidation, validateRequest, deleteUser);

router.get('/services', getAllServices);
router.put('/service/:id/approve', mongoIdValidation, validateRequest, approveService);
router.delete('/service/:id', mongoIdValidation, validateRequest, deleteServiceByAdmin);

router.get('/analytics', getAnalytics);
router.put('/withdrawals/:id', adminProcessValidation, validateRequest, processWithdrawalRequest);

module.exports = router;
