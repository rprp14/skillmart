const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { validateRequest } = require('../middleware/validationMiddleware');
const { invoiceOrderValidation, downloadInvoiceByOrderId, sendInvoiceToBuyer } = require('../controllers/invoiceController');

const router = express.Router();

router.get('/:orderId', protect, invoiceOrderValidation, validateRequest, downloadInvoiceByOrderId);
router.post('/:orderId/send', protect, authorizeRoles('seller', 'admin'), invoiceOrderValidation, validateRequest, sendInvoiceToBuyer);

module.exports = router;
