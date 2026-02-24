const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Notification = sequelize.define(
  'Notification',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    type: {
      type: DataTypes.STRING(60),
      allowNull: false
    },
    title: {
      type: DataTypes.STRING(140),
      allowNull: false
    },
    message: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    meta: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  },
  {
    tableName: 'notifications',
    timestamps: true,
    underscored: true
  }
);

module.exports = Notification;
