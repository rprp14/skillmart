const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Category = sequelize.define(
  'Category',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(80),
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    icon: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  },
  {
    tableName: 'categories',
    timestamps: true,
    underscored: true
  }
);

module.exports = Category;
