const fs = require('fs');
const { param } = require('express-validator');
const { InvoiceRecord } = require('../models');
const { loadOrderWithRelations, ensureInvoiceRecord, writeInvoicePdf } = require('../services/invoiceService');
const createNotification = require('../utils/createNotification');

const invoiceOrderValidation = [
  param('orderId').isInt({ min: 1 }).withMessage('Invalid order id')
];

const canAccessOrderInvoice = (user, order) =>
  user?.role === 'admin' || Number(order?.buyerId) === Number(user?.id) || Number(order?.sellerId) === Number(user?.id);

const canSendOrderInvoice = (user, order) =>
  user?.role === 'admin' || (user?.role === 'seller' && Number(order?.sellerId) === Number(user?.id));

const buildInvoiceResponse = (invoice, orderId) => ({
  orderId,
  invoiceNumber: invoice.invoiceNumber,
  invoiceDate: invoice.invoiceDate,
  dueDate: invoice.dueDate,
  sentToBuyer: Boolean(invoice.sentToBuyer),
  sentAt: invoice.sentAt,
  downloadUrl: invoice.downloadUrl || null
});

const downloadInvoiceByOrderId = async (req, res, next) => {
  try {
    const orderId = Number(req.params.orderId);
    const order = await loadOrderWithRelations(orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (!canAccessOrderInvoice(req.user, order)) {
      return res.status(403).json({ message: 'You are not allowed to download this invoice.' });
    }

    if (order.status !== 'Completed') {
      return res.status(400).json({ message: 'Invoice is available only after order completion.' });
    }

    const invoice = await ensureInvoiceRecord(order);
    const isBuyer = Number(order.buyerId) === Number(req.user.id) && req.user.role !== 'admin';
    if (isBuyer && !invoice.sentToBuyer) {
      return res.status(403).json({ message: 'Seller has not sent the invoice yet.' });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const pdfMeta = await writeInvoicePdf({ invoice, order, baseUrl });

    const latestInvoice = await InvoiceRecord.findByPk(invoice.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice_${invoice.invoiceNumber}.pdf"`);
    res.setHeader('X-Invoice-Download-Url', latestInvoice?.downloadUrl || pdfMeta.downloadUrl);

    const readStream = fs.createReadStream(pdfMeta.absolutePath);
    readStream.on('error', next);
    readStream.pipe(res);
  } catch (error) {
    next(error);
  }
};

const sendInvoiceToBuyer = async (req, res, next) => {
  try {
    const orderId = Number(req.params.orderId);
    const order = await loadOrderWithRelations(orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    if (!canSendOrderInvoice(req.user, order)) {
      return res.status(403).json({ message: 'Only seller or admin can send invoice for this order.' });
    }
    if (order.status !== 'Completed') {
      return res.status(400).json({ message: 'Invoice can be sent only for completed orders.' });
    }

    const invoice = await ensureInvoiceRecord(order);
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    await writeInvoicePdf({ invoice, order, baseUrl });

    await invoice.update({
      sentToBuyer: true,
      sentAt: new Date()
    });

    await createNotification({
      userId: order.buyerId,
      type: 'invoice_sent',
      title: 'Invoice Received',
      message: `Invoice ${invoice.invoiceNumber} is available for order #${order.id}.`,
      meta: { orderId: order.id, invoiceNumber: invoice.invoiceNumber, downloadUrl: invoice.downloadUrl }
    });

    const refreshed = await InvoiceRecord.findByPk(invoice.id);
    return res.status(200).json({
      message: 'Invoice generated and sent to buyer.',
      invoice: buildInvoiceResponse(refreshed || invoice, order.id)
    });
  } catch (error) {
    next(error);
  }
};
const getSellerInvoices = async (req, res, next) => {
  try {
    if (req.user.role !== 'seller' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only sellers can access invoices.' });
    }

    const invoices = await InvoiceRecord.findAll({
      where: {
        sellerId: req.user.role === 'admin' ? undefined : req.user.id
      },
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({
      count: invoices.length,
      invoices
    });
  } catch (error) {
    next(error);
  }
};
module.exports = {
  invoiceOrderValidation,
  downloadInvoiceByOrderId,
  sendInvoiceToBuyer,
  getSellerInvoices 
};
