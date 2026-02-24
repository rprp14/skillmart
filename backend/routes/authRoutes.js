const express = require('express');
const {
  registerValidation,
  loginValidation,
  register,
  login,
  getProfile
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/validationMiddleware');

const router = express.Router();

router.get('/register', (req, res) => {
  res.status(405).json({ message: 'Method not allowed. Use POST /api/auth/register.' });
});

router.get('/login', (req, res) => {
  res.status(405).json({ message: 'Method not allowed. Use POST /api/auth/login.' });
});

router.post('/register', registerValidation, validateRequest, register);
router.post('/login', loginValidation, validateRequest, login);
router.get('/me', protect, getProfile);

module.exports = router;
