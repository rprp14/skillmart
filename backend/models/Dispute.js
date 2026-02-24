const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Dispute = sequelize.define(
  'Dispute',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    reason: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    proofUrl: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('Open', 'UnderReview', 'Resolved', 'Rejected'),
      allowNull: false,
      defaultValue: 'Open'
    },
    adminDecision: {
      type: DataTypes.ENUM('refund_buyer', 'release_seller', 'none'),
      allowNull: false,
      defaultValue: 'none'
    },
    adminNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    tableName: 'disputes',
    timestamps: true,
    underscored: true
  }
);

module.exports = Dispute;
