const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Portfolio = sequelize.define(
  'Portfolio',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    description: {
      type: DataTypes.STRING(1000),
      allowNull: true
    },
    imageUrl: {
      type: DataTypes.STRING(500),
      allowNull: false
    }
  },
  {
    tableName: 'portfolios',
    timestamps: true,
    underscored: true
  }
);

module.exports = Portfolio;
