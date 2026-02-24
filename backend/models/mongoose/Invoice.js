const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true, trim: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    subtotal: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const partySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    contact: { type: String, default: 'N/A', trim: true },
    address: { type: String, default: 'N/A', trim: true }
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    orderId: { type: Number, required: true, unique: true, index: true },
    invoiceNumber: { type: String, required: true, unique: true, trim: true },
    invoiceDate: { type: Date, required: true, default: Date.now },
    sellerDetails: { type: partySchema, required: true },
    buyerDetails: { type: partySchema, required: true },
    services: { type: [invoiceItemSchema], required: true },
    totalAmountDue: { type: Number, required: true, min: 0 },
    paymentTerms: { type: String, required: true, default: 'Due on receipt' },
    dueDate: { type: Date, required: true },
    taxRate: { type: Number, default: 0, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    pdfPath: { type: String, default: null },
    downloadUrl: { type: String, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);
