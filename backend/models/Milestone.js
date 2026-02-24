const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Milestone = sequelize.define(
  'Milestone',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING(180),
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: { min: 0 }
    },
    status: {
      type: DataTypes.ENUM('Pending', 'Completed'),
      allowNull: false,
      defaultValue: 'Pending'
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    tableName: 'milestones',
    timestamps: true,
    underscored: true
  }
);

module.exports = Milestone;
