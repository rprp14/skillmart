const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const WithdrawalRequest = sequelize.define(
  'WithdrawalRequest',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: { min: 0.01 }
    },
    status: {
      type: DataTypes.ENUM('Pending', 'Approved', 'Rejected'),
      allowNull: false,
      defaultValue: 'Pending'
    },
    requestedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    processedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    note: {
      type: DataTypes.STRING(500),
      allowNull: true
    }
  },
  {
    tableName: 'withdrawal_requests',
    timestamps: true,
    underscored: true
  }
);

module.exports = WithdrawalRequest;
