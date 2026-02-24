const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Service = sequelize.define(
  'Service',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING(120),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    price: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: { min: 1 }
    },
    category: {
      type: DataTypes.STRING(60),
      allowNull: true
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    tags: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: []
    },
    packages: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null
    },
    rating: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0
    },
    ratingCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    approvalStatus: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending'
    },
    views: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    purchases: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  },
  {
    tableName: 'services',
    timestamps: true,
    underscored: true
  }
);

module.exports = Service;
