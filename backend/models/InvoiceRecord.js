const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const InvoiceRecord = sequelize.define(
  'InvoiceRecord',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    orderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true
    },
    buyerId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    sellerId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    invoiceNumber: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true
    },
    invoiceDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    paymentTerms: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    sellerDetails: {
      type: DataTypes.JSONB,
      allowNull: false
    },
    buyerDetails: {
      type: DataTypes.JSONB,
      allowNull: false
    },
    lineItems: {
      type: DataTypes.JSONB,
      allowNull: false
    },
    subtotal: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    commission: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    taxRate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0
    },
    taxAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    totalAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('Issued', 'Paid', 'Overdue'),
      allowNull: false,
      defaultValue: 'Issued'
    },
    filePath: {
      type: DataTypes.STRING(300),
      allowNull: true
    },
    downloadUrl: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    sentToBuyer: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    tableName: 'invoices',
    timestamps: true,
    underscored: true
  }
);

module.exports = InvoiceRecord;
