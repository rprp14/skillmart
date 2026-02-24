const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(80),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(120),
      allowNull: false,
      unique: true,
      validate: { isEmail: true }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('buyer', 'seller', 'admin'),
      allowNull: false,
      defaultValue: 'buyer'
    },
    wallet: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 }
    },
    sellerLevel: {
      type: DataTypes.ENUM('New', 'Level1', 'Level2', 'TopRated'),
      allowNull: false,
      defaultValue: 'New'
    },
    reputationScore: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0
    },
    viewedCategories: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: []
    }
  },
  {
    tableName: 'users',
    timestamps: true,
    underscored: true
  }
);

module.exports = User;
