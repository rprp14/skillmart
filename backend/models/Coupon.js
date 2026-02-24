const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Coupon = sequelize.define(
  'Coupon',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    code: {
      type: DataTypes.STRING(40),
      allowNull: false,
      unique: true
    },
    discountType: {
      type: DataTypes.ENUM('Percentage', 'Flat'),
      allowNull: false
    },
    discountValue: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    expiryDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    maxUsage: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    usedCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  },
  {
    tableName: 'coupons',
    timestamps: true,
    underscored: true
  }
);

module.exports = Coupon;
