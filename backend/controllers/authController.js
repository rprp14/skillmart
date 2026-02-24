const { body } = require('express-validator');
const bcrypt = require('bcryptjs');
const { User, Subscription } = require('../models');
const generateToken = require('../utils/generateToken');

const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 80 }),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('role').optional().isIn(['buyer', 'seller']).withMessage('Role must be buyer or seller')
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required')
];

const serializeUser = (user, planName = 'Free') => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  wallet: user.wallet,
  sellerLevel: user.sellerLevel,
  reputationScore: user.reputationScore,
  subscriptionPlan: planName
});

const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'buyer'
    });
    await Subscription.create({
      userId: user.id,
      planName: 'Free',
      price: 0,
      startDate: new Date(),
      endDate: null,
      status: 'Active'
    });

    const token = generateToken(user.id, user.role);

    return res.status(201).json({
      message: 'Registration successful',
      token,
      user: serializeUser(user, 'Free')
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const token = generateToken(user.id, user.role);
    const activeSub = await Subscription.findOne({
      where: { userId: user.id, status: 'Active' },
      order: [['startDate', 'DESC']]
    });

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: serializeUser(user, activeSub?.planName || 'Free')
    });
  } catch (error) {
    next(error);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const activeSub = await Subscription.findOne({
      where: { userId: req.user.id, status: 'Active' },
      order: [['startDate', 'DESC']]
    });
    return res.status(200).json({ user: serializeUser(req.user, activeSub?.planName || 'Free') });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerValidation,
  loginValidation,
  register,
  login,
  getProfile
};
