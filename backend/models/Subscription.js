const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Subscription = sequelize.define(
  'Subscription',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    planName: {
      type: DataTypes.ENUM('Free', 'Pro', 'Premium'),
      allowNull: false,
      defaultValue: 'Free'
    },
    price: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('Active', 'Expired'),
      allowNull: false,
      defaultValue: 'Active'
    }
  },
  {
    tableName: 'subscriptions',
    timestamps: true,
    underscored: true
  }
);

module.exports = Subscription;
