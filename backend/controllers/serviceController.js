/*const { body, param, query } = require('express-validator');
const { Op, fn, col } = require('sequelize');
const { Service, User, Order, Category, Subscription } = require('../models');

const isIntId = (value) => Number.isInteger(Number(value)) && Number(value) > 0;

const serviceValidation = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 120 }),
  body('description').trim().notEmpty().withMessage('Description is required').isLength({ max: 2000 }),
  body('price').isFloat({ gt: 0 }).withMessage('Price must be greater than 0'),
  body('categoryId').optional().custom((value) => isIntId(value)).withMessage('categoryId must be valid'),
  body('category').optional().trim().isLength({ min: 2, max: 80 }),
  body('tags')
    .optional()
    .isArray({ max: 12 })
    .withMessage('tags must be an array with up to 12 items'),
  body('tags.*').optional().isString().trim().isLength({ min: 2, max: 24 }),
  body('packages').optional().isObject().withMessage('packages must be an object')
];

const serviceIdValidation = [
  param('id').custom((value) => isIntId(value)).withMessage('Invalid service id')
];

const serviceListValidation = [
  query('q').optional().trim().isLength({ max: 120 }),
  query('category').optional().trim().isLength({ max: 60 }),
  query('categoryId').optional().custom((value) => isIntId(value)).withMessage('Invalid categoryId')
];

const enrichWithSubscriptionPriority = async (services) => {
  const sellerIds = [...new Set(services.map((entry) => entry.sellerId).filter(Boolean))];
  if (!sellerIds.length) return services;
  const subs = await Subscription.findAll({
    where: { userId: { [Op.in]: sellerIds }, status: 'Active' },
    order: [['startDate', 'DESC']]
  });
  const planRank = { Premium: 3, Pro: 2, Free: 1 };
  const map = {};
  subs.forEach((sub) => {
    if (!map[sub.userId]) map[sub.userId] = sub.planName;
  });
  return services
    .map((service) => {
      const plan = map[service.sellerId] || 'Free';
      const plain = service.toJSON ? service.toJSON() : service;
      plain.sellerPlan = plan;
      plain.highlighted = plan !== 'Free';
      plain.priorityRank = planRank[plan] || 1;
      return plain;
    })
    .sort((a, b) => {
      if (b.priorityRank !== a.priorityRank) return b.priorityRank - a.priorityRank;
      if (Number(b.rating) !== Number(a.rating)) return Number(b.rating) - Number(a.rating);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
};

const createService = async (req, res, next) => {
  try {
    let category = null;
    if (req.body.categoryId !== undefined) {
      category = await Category.findByPk(Number(req.body.categoryId));
    } else if (req.body.category) {
      const name = String(req.body.category).trim();
      category = await Category.findOne({ where: { name } });
      if (!category && name.length >= 2) {
        try {
          category = await Category.create({ name });
        } catch (err) {
          // In case of race/unique constraint, try fetching again.
          category = await Category.findOne({ where: { name } });
        }
      }
    }
    if (!category) return res.status(400).json({ message: 'Valid categoryId (or category name) is required.' });
    const tags = Array.isArray(req.body.tags)
      ? req.body.tags.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean)
      : [];
    const service = await Service.create({
      title: req.body.title,
      description: req.body.description,
      price: req.body.price,
      category: category.name,
      categoryId: category.id,
      tags,
      packages: req.body.packages || null,
      sellerId: req.user.id,
      approvalStatus: req.user.role === 'admin' ? 'approved' : 'pending'
    });

    res.status(201).json({ message: 'Service created successfully', service });
  } catch (error) {
    next(error);
  }
};
*/
const { body, param, query } = require('express-validator');
const { Op, fn, col } = require('sequelize');
const { Service, User, Order, Category, Subscription } = require('../models');

const isIntId = (value) =>
  Number.isInteger(Number(value)) && Number(value) > 0;

const serviceValidation = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 120 }),
  body('description').trim().notEmpty().withMessage('Description is required').isLength({ max: 2000 }),
  body('price').isFloat({ gt: 0 }).withMessage('Price must be greater than 0'),
  body('categoryId').optional().custom((value) => isIntId(value)).withMessage('categoryId must be valid'),
  body('category').optional().trim().isLength({ min: 2, max: 80 }),
  body('tags')
    .optional()
    .isArray({ max: 12 })
    .withMessage('tags must be an array with up to 12 items'),
  body('tags.*').optional().isString().trim().isLength({ min: 2, max: 24 }),
  body('packages').optional().isObject().withMessage('packages must be an object')
];

const serviceIdValidation = [
  param('id').custom((value) => isIntId(value)).withMessage('Invalid service id')
];

const serviceListValidation = [
  query('q').optional().trim().isLength({ max: 120 }),
  query('category').optional().trim().isLength({ max: 60 }),
  query('categoryId').optional().custom((value) => isIntId(value)).withMessage('Invalid categoryId')
];

/* =========================
   FIXED createService ONLY
========================= */
const enrichWithSubscriptionPriority = async (services) => {
  if (!services || !services.length) return [];

  const sellerIds = [
    ...new Set(services.map((service) => service.sellerId).filter(Boolean))
  ];

  if (!sellerIds.length) return services;

  const subscriptions = await Subscription.findAll({
    where: {
      userId: sellerIds,
      status: 'Active'
    },
    order: [['startDate', 'DESC']]
  });

  const planRank = {
    Premium: 3,
    Pro: 2,
    Free: 1
  };

  const sellerPlanMap = {};

  subscriptions.forEach((sub) => {
    if (!sellerPlanMap[sub.userId]) {
      sellerPlanMap[sub.userId] = sub.planName;
    }
  });

  return services
    .map((service) => {
      const plain = service.toJSON ? service.toJSON() : service;

      const plan = sellerPlanMap[service.sellerId] || 'Free';

      plain.sellerPlan = plan;
      plain.highlighted = plan !== 'Free';
      plain.priorityRank = planRank[plan] || 1;

      return plain;
    })
    .sort((a, b) => {
      if (b.priorityRank !== a.priorityRank)
        return b.priorityRank - a.priorityRank;

      if (Number(b.rating) !== Number(a.rating))
        return Number(b.rating) - Number(a.rating);

      return new Date(b.createdAt) - new Date(a.createdAt);
    });
};
const createService = async (req, res, next) => {
  try {
    let category = null;

    const categoryId = req.body.categoryId
      ? Number(req.body.categoryId)
      : null;

    const categoryName =
      typeof req.body.category === 'string'
        ? req.body.category.trim()
        : '';

    // 🔹 Require at least one category input
    if (!categoryId && !categoryName) {
      return res.status(400).json({
        message: 'Either categoryId or category name is required.'
      });
    }

    // 🔹 If categoryId provided
    if (categoryId) {
      category = await Category.findByPk(categoryId);
      if (!category) {
        return res.status(404).json({ message: 'Category not found.' });
      }
    }

    // 🔹 If category name provided
    if (!category && categoryName) {
      if (categoryName.length < 2) {
        return res.status(400).json({
          message: 'Category name must be at least 2 characters.'
        });
      }

      category = await Category.findOne({
        where: { name: categoryName }
      });

      if (!category) {
        try {
          category = await Category.create({ name: categoryName });
        } catch (err) {
          // In case of race condition
          category = await Category.findOne({
            where: { name: categoryName }
          });
        }
      }
    }

    if (!category) {
      return res.status(400).json({
        message: 'Valid category is required.'
      });
    }

    // 🔹 Normalize tags
    const tags = Array.isArray(req.body.tags)
      ? req.body.tags
          .map((tag) => String(tag).trim().toLowerCase())
          .filter(Boolean)
      : [];

    // 🔹 Normalize price safely
    const price = Number(req.body.price);

    if (!price || price <= 0) {
      return res.status(400).json({
        message: 'Price must be greater than 0.'
      });
    }

    // 🔹 Only include packages if valid object
    const packages =
      req.body.packages && typeof req.body.packages === 'object'
        ? req.body.packages
        : null;

    const service = await Service.create({
      title: req.body.title?.trim(),
      description: req.body.description?.trim(),
      price,
      category: category.name,
      categoryId: category.id,
      tags,
      packages,
      sellerId: req.user.id,
      approvalStatus:
        req.user.role === 'admin' ? 'approved' : 'pending'
    });

    return res.status(201).json({
      message: 'Service created successfully',
      service
    });

  } catch (error) {
    console.error('Create Service Error:', error);
    return res.status(400).json({
      message: 'Failed to create service.',
      error: error.message
    });
  }
};

/* =========================
   KEEP ALL YOUR OTHER FUNCTIONS BELOW
   (UNCHANGED)
========================= */

// ⬇️ DO NOT MODIFY ANYTHING BELOW ⬇️

// your existing:
// getServices
// getTrendingServices
// getRecommendedServices
// getPersonalizedRecommendations
// getPricingSuggestion
// getServiceById
// updateService
// deleteService
// getMyServices



const getServices = async (req, res, next) => {
  try {
    const { q, category, categoryId } = req.query;

    const where = { approvalStatus: 'approved' };
    if (category) where.category = category;
    if (categoryId) where.categoryId = Number(categoryId);
    if (q) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${q}%` } },
        { description: { [Op.iLike]: `%${q}%` } },
        { category: { [Op.iLike]: `%${q}%` } }
      ];
    }

    const services = await Service.findAll({
      where,
      include: [
        { model: User, as: 'seller', attributes: ['id', 'name', 'email'] },
        { model: Category, as: 'categoryRef', attributes: ['id', 'name', 'icon'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    const ranked = await enrichWithSubscriptionPriority(services);
    res.status(200).json({ count: ranked.length, services: ranked });
  } catch (error) {
    next(error);
  }
};

const getTrendingServices = async (req, res, next) => {
  try {
    const services = await Service.findAll({
      where: { approvalStatus: 'approved' },
      include: [
        { model: User, as: 'seller', attributes: ['id', 'name', 'email'] },
        { model: Category, as: 'categoryRef', attributes: ['id', 'name', 'icon'] }
      ],
      order: [
        ['rating', 'DESC'],
        ['ratingCount', 'DESC'],
        ['createdAt', 'DESC']
      ],
      limit: 6
    });
    const ranked = await enrichWithSubscriptionPriority(services);
    res.status(200).json({ count: ranked.length, services: ranked.slice(0, 6) });
  } catch (error) {
    next(error);
  }
};

const getRecommendedServices = async (req, res, next) => {
  try {
    const targetService = await Service.findOne({
      where: { id: Number(req.params.id), approvalStatus: 'approved' }
    });

    if (!targetService) {
      return res.status(404).json({ message: 'Service not found' });
    }

    const tagFilters = Array.isArray(targetService.tags) ? targetService.tags.slice(0, 6) : [];

    const where = {
      approvalStatus: 'approved',
      id: { [Op.ne]: targetService.id },
      [Op.or]: [
        { category: targetService.category },
        ...tagFilters.map((tag) => ({ tags: { [Op.contains]: [tag] } }))
      ]
    };

    const services = await Service.findAll({
      where,
      include: [
        { model: User, as: 'seller', attributes: ['id', 'name', 'email'] },
        { model: Category, as: 'categoryRef', attributes: ['id', 'name', 'icon'] }
      ],
      order: [
        ['rating', 'DESC'],
        ['ratingCount', 'DESC'],
        ['createdAt', 'DESC']
      ],
      limit: 6
    });
    const ranked = await enrichWithSubscriptionPriority(services);
    return res.status(200).json({ count: ranked.length, services: ranked });
  } catch (error) {
    next(error);
  }
};

const getPricingSuggestion = async (req, res, next) => {
  try {
    const category = String(req.query.category || '').trim();
    if (!category) {
      return res.status(400).json({ message: 'category query parameter is required.' });
    }

    const stats = await Service.findAll({
      where: { approvalStatus: 'approved', category },
      attributes: [
        [fn('AVG', col('price')), 'avgPrice'],
        [fn('MIN', col('price')), 'minPrice'],
        [fn('MAX', col('price')), 'maxPrice'],
        [fn('COUNT', col('id')), 'count']
      ],
      raw: true
    });

    const avgPrice = Number(stats[0]?.avgPrice || 0);
    const minPrice = Number(stats[0]?.minPrice || 0);
    const maxPrice = Number(stats[0]?.maxPrice || 0);
    const count = Number(stats[0]?.count || 0);

    // If category has no history yet, fallback to a starter range.
    const suggestedBase = count > 0 ? avgPrice : 30;
    const low = Number((suggestedBase * 0.8).toFixed(0));
    const high = Number((suggestedBase * 1.2).toFixed(0));

    const topTagRows = await Service.findAll({
      where: { approvalStatus: 'approved', category },
      attributes: ['tags'],
      raw: true,
      limit: 50
    });

    const tagScores = {};
    topTagRows.forEach((row) => {
      (row.tags || []).forEach((tag) => {
        const key = String(tag || '').trim().toLowerCase();
        if (!key) return;
        tagScores[key] = (tagScores[key] || 0) + 1;
      });
    });
    const suggestedTags = Object.entries(tagScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([tag]) => tag);

    res.status(200).json({
      category,
      marketStats: { avgPrice, minPrice, maxPrice, sampleSize: count },
      recommendation: {
        suggestedRange: { low, high },
        suggestedStartingPrice: Number(((low + high) / 2).toFixed(0)),
        suggestedTags
      }
    });
  } catch (error) {
    next(error);
  }
};

const getServiceById = async (req, res, next) => {
  try {
    const service = await Service.findOne({
      where: { id: Number(req.params.id), approvalStatus: 'approved' },
      include: [
        { model: User, as: 'seller', attributes: ['id', 'name', 'email'] },
        { model: Category, as: 'categoryRef', attributes: ['id', 'name', 'icon'] }
      ]
    });

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    service.views = Number(service.views || 0) + 1;
    await service.save();

    if (req.user?.id) {
      const user = await User.findByPk(req.user.id);
      if (user) {
        const history = Array.isArray(user.viewedCategories) ? user.viewedCategories.slice(-19) : [];
        history.push(String(service.categoryRef?.name || service.category || '').trim().toLowerCase());
        user.viewedCategories = history;
        await user.save();
      }
    }

    res.status(200).json({ service });
  } catch (error) {
    next(error);
  }
};

const getPersonalizedRecommendations = async (req, res, next) => {
  try {
    if (!req.user) {
      const services = await Service.findAll({
        where: { approvalStatus: 'approved' },
        include: [
          { model: User, as: 'seller', attributes: ['id', 'name', 'email'] },
          { model: Category, as: 'categoryRef', attributes: ['id', 'name', 'icon'] }
        ],
        order: [['rating', 'DESC'], ['ratingCount', 'DESC']],
        limit: 8
      });
      const ranked = await enrichWithSubscriptionPriority(services);
      return res.status(200).json({ strategy: 'global_top_rated', count: ranked.length, services: ranked });
    }

    const viewedCategories = Array.isArray(req.user.viewedCategories) ? req.user.viewedCategories : [];
    const buyerOrders = await Order.findAll({
      where: { buyerId: req.user.id, status: 'Completed' },
      include: [{ model: Service, as: 'service', attributes: ['category'] }]
    });
    const purchasedCategories = buyerOrders.map((entry) => entry.service?.category).filter(Boolean).map((item) => item.toLowerCase());
    const categories = [...new Set([...viewedCategories.slice(-6), ...purchasedCategories])];

    const where = { approvalStatus: 'approved' };
    if (categories.length) where.category = { [Op.in]: categories };

    const services = await Service.findAll({
      where,
      include: [{ model: User, as: 'seller', attributes: ['id', 'name', 'email'] }],
      order: [['rating', 'DESC'], ['purchases', 'DESC'], ['views', 'DESC'], ['createdAt', 'DESC']],
      limit: 12
    });
    const ranked = await enrichWithSubscriptionPriority(services);

    res.status(200).json({
      strategy: categories.length ? 'behavior_based' : 'global_top_rated',
      categories,
      count: ranked.length,
      services: ranked
    });
  } catch (error) {
    next(error);
  }
};

const updateService = async (req, res, next) => {
  try {
    const service = await Service.findByPk(Number(req.params.id));
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    const isOwner = service.sellerId === req.user.id;
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only owner or admin can update this service' });
    }

    service.title = req.body.title ?? service.title;
    service.description = req.body.description ?? service.description;
    service.price = req.body.price ?? service.price;
    if (req.body.categoryId !== undefined) {
      const category = await Category.findByPk(Number(req.body.categoryId));
      if (!category) return res.status(404).json({ message: 'Category not found' });
      service.categoryId = category.id;
      service.category = category.name;
    } else if (req.body.category !== undefined) {
      const name = String(req.body.category).trim();
      let category = await Category.findOne({ where: { name } });
      if (!category && name.length >= 2) {
        try {
          category = await Category.create({ name });
        } catch (err) {
          category = await Category.findOne({ where: { name } });
        }
      }
      if (!category) return res.status(404).json({ message: 'Category not found' });
      service.categoryId = category.id;
      service.category = category.name;
    }
    if (req.body.tags !== undefined) {
      service.tags = Array.isArray(req.body.tags)
        ? req.body.tags.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean)
        : service.tags;
    }
    if (req.body.packages !== undefined) {
      service.packages = req.body.packages || null;
    }
    if (req.user.role !== 'admin') service.approvalStatus = 'pending';

    await service.save();
    res.status(200).json({ message: 'Service updated successfully', service });
  } catch (error) {
    next(error);
  }
};

const deleteService = async (req, res, next) => {
  try {
    const service = await Service.findByPk(Number(req.params.id));
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    const isOwner = service.sellerId === req.user.id;
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only owner or admin can delete this service' });
    }

    await service.destroy();
    res.status(200).json({ message: 'Service deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const getMyServices = async (req, res, next) => {
  try {
    const services = await Service.findAll({
      where: { sellerId: req.user.id },
      include: [{ model: Category, as: 'categoryRef', attributes: ['id', 'name', 'icon'] }],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({ count: services.length, services });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
