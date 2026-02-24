const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const WalletTransaction = sequelize.define(
  'WalletTransaction',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    type: {
      type: DataTypes.ENUM('Credit', 'Debit'),
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: { min: 0 }
    },
    reason: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    meta: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  },
  {
    tableName: 'wallet_transactions',
    timestamps: true,
    underscored: true
  }
);

module.exports = WalletTransaction;
