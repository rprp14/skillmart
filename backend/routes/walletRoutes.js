const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/validationMiddleware');
const { withdrawValidation, getMyWalletTransactions, requestWithdrawal } = require('../controllers/walletController');

const router = express.Router();

router.use(protect);

router.get('/transactions', getMyWalletTransactions);
router.post('/withdraw', withdrawValidation, validateRequest, requestWithdrawal);

module.exports = router;
