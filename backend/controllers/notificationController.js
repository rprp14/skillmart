const { param } = require('express-validator');
const { Notification } = require('../models');

const isIntId = (value) => Number.isInteger(Number(value)) && Number(value) > 0;

const notificationIdValidation = [
  param('id').custom((value) => isIntId(value)).withMessage('Invalid notification id')
];

const getMyNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']]
    });

    const unreadCount = notifications.filter((item) => !item.isRead).length;

    res.status(200).json({
      count: notifications.length,
      unreadCount,
      notifications
    });
  } catch (error) {
    next(error);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      where: { id: Number(req.params.id), userId: req.user.id }
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    notification.isRead = true;
    await notification.save();

    return res.status(200).json({ message: 'Notification marked as read.', notification });
  } catch (error) {
    next(error);
  }
};

const markAllAsRead = async (req, res, next) => {
  try {
    const [updatedCount] = await Notification.update(
      { isRead: true },
      { where: { userId: req.user.id, isRead: false } }
    );

    return res.status(200).json({ message: 'All notifications marked as read.', updatedCount });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  notificationIdValidation,
  getMyNotifications,
  markAsRead,
  markAllAsRead
};
