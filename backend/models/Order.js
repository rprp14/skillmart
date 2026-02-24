const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Order = sequelize.define(
  'Order',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    status: {
      type: DataTypes.ENUM('Pending', 'Accepted', 'Completed'),
      allowNull: false,
      defaultValue: 'Pending'
    },
    amount: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: { min: 1 }
    },
    paymentStatus: {
      type: DataTypes.ENUM('Pending', 'Paid'),
      allowNull: false,
      defaultValue: 'Paid'
    },
    packageType: {
      type: DataTypes.ENUM('single', 'basic', 'standard', 'premium'),
      allowNull: false,
      defaultValue: 'single'
    },
    escrowStatus: {
      type: DataTypes.ENUM('Held', 'Released', 'Refunded'),
      allowNull: false,
      defaultValue: 'Held'
    },
    escrowAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    commissionAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    platformFeePercent: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 10
    }
  },
  {
    tableName: 'orders',
    timestamps: true,
    underscored: true
  }
);

module.exports = Order;
