const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Review = sequelize.define(
  'Review',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 5 }
    },
    comment: {
      type: DataTypes.STRING(1000),
      allowNull: true
    }
  },
  {
    tableName: 'reviews',
    timestamps: true,
    underscored: true,
    indexes: [{ unique: true, fields: ['user_id', 'service_id'] }]
  }
);

module.exports = Review;
