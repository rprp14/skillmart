const { Notification } = require('../models');

const createNotification = async ({ userId, type, title, message, meta = null, transaction = null }) => {
  return Notification.create(
    {
      userId,
      type,
      title,
      message,
      meta
    },
    transaction ? { transaction } : {}
  );
};

module.exports = createNotification;
