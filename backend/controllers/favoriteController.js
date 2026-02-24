const { param } = require('express-validator');
const { Favorite, Service, User } = require('../models');

const isIntId = (value) => Number.isInteger(Number(value)) && Number(value) > 0;

const favoriteServiceIdValidation = [
  param('serviceId').custom((value) => isIntId(value)).withMessage('Invalid service id')
];

const getMyFavorites = async (req, res, next) => {
  try {
    const favorites = await Favorite.findAll({
      where: { userId: req.user.id },
      include: [
        {
          model: Service,
          as: 'service',
          where: { approvalStatus: 'approved' },
          include: [{ model: User, as: 'seller', attributes: ['id', 'name', 'email'] }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      count: favorites.length,
      favorites,
      services: favorites.map((entry) => entry.service)
    });
  } catch (error) {
    next(error);
  }
};

const addFavorite = async (req, res, next) => {
  try {
    const serviceId = Number(req.params.serviceId);
    const service = await Service.findOne({
      where: { id: serviceId, approvalStatus: 'approved' }
    });

    if (!service) {
      return res.status(404).json({ message: 'Service not found or not approved.' });
    }

    const [favorite, created] = await Favorite.findOrCreate({
      where: { userId: req.user.id, serviceId }
    });

    if (!created) {
      return res.status(200).json({ message: 'Service already in favorites.', favorite });
    }

    return res.status(201).json({ message: 'Service saved to favorites.', favorite });
  } catch (error) {
    next(error);
  }
};

const removeFavorite = async (req, res, next) => {
  try {
    const serviceId = Number(req.params.serviceId);
    const deleted = await Favorite.destroy({
      where: { userId: req.user.id, serviceId }
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Favorite entry not found.' });
    }

    return res.status(200).json({ message: 'Service removed from favorites.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  favoriteServiceIdValidation,
  getMyFavorites,
  addFavorite,
  removeFavorite
};
