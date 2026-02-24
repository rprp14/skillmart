const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { Order, Service, User, InvoiceRecord } = require('../models');

const STORAGE_DIR = path.join(__dirname, '..', 'storage', 'invoices');
const TAX_RATE = Number(process.env.INVOICE_TAX_RATE || 0);
const DUE_DAYS = Number(process.env.INVOICE_PAYMENT_DUE_DAYS || 7);

const ensureStorageDir = async () => {
  await fs.promises.mkdir(STORAGE_DIR, { recursive: true });
};

const withTwoDecimals = (value) => Number(Number(value || 0).toFixed(2));

const generateUniqueInvoiceNumber = async (options = {}) => {
  const year = new Date().getFullYear();
  const prefix = `SM-${year}-`;
  const existing = await InvoiceRecord.findAll({
    where: { invoiceNumber: { [require('sequelize').Op.like]: `${prefix}%` } },
    attributes: ['invoiceNumber'],
    raw: true,
    transaction: options.transaction
  });

  let next = 1;
  existing.forEach((row) => {
    const match = String(row.invoiceNumber || '').match(new RegExp(`^SM-${year}-(\\d{4})$`));
    if (!match) return;
    const serial = Number(match[1]);
    if (serial >= next) next = serial + 1;
  });

  return `SM-${year}-${String(next).padStart(4, '0')}`;
};

const toPartyDetails = (user) => ({
  name: user?.name || 'N/A',
  email: user?.email || 'N/A',
  contact: user?.contact || user?.phone || 'N/A',
  address: user?.address || 'N/A'
});

const addDays = (sourceDate, days) => {
  const next = new Date(sourceDate);
  next.setDate(next.getDate() + days);
  return next;
};

const drawInvoiceBrandLogo = (doc, x, y) => {
  const baseGrad = doc.linearGradient(x, y, x + 42, y + 42);
  baseGrad.stop(0, '#111827').stop(1, '#1f2937');
  doc.roundedRect(x, y, 42, 42, 11).fill(baseGrad);

  doc.circle(x + 21, y + 21, 12).fill('#fb923c');
  doc.circle(x + 21, y + 21, 8.5).fill('#111827');
  doc.fillColor('#f8fafc').fontSize(7).font('Helvetica-Bold').text('SM', x + 12.4, y + 18.8);
};

const loadOrderWithRelations = async (orderId, options = {}) =>
  Order.findByPk(orderId, {
    include: [
      { model: Service, as: 'service', attributes: ['id', 'title', 'price', 'category', 'description'] },
      { model: User, as: 'buyer', attributes: ['id', 'name', 'email'] },
      { model: User, as: 'seller', attributes: ['id', 'name', 'email'] }
    ],
    ...options
  });

const ensureInvoiceRecord = async (orderInput, options = {}) => {
  const order =
    typeof orderInput?.get === 'function' && orderInput?.service && orderInput?.buyer && orderInput?.seller
      ? orderInput
      : await loadOrderWithRelations(Number(orderInput?.id || orderInput), options);

  if (!order) {
    throw new Error('Order not found');
  }
  if (order.status !== 'Completed') {
    throw new Error('Invoice can be generated only for completed orders');
  }

  const existing = await InvoiceRecord.findOne({
    where: { orderId: order.id },
    transaction: options.transaction
  });

  const invoiceDate = existing?.invoiceDate || new Date();
  const dueDate = existing?.dueDate || addDays(invoiceDate, DUE_DAYS);
  const paymentTerms = existing?.paymentTerms || `Due within ${DUE_DAYS} days`;

  const grossAmount = withTwoDecimals(order.amount);
  const commission = withTwoDecimals(order.commissionAmount || 0);
  const lineItems = [
    {
      description: order.service?.title || 'Service',
      unitPrice: grossAmount,
      quantity: 1,
      subtotal: grossAmount
    }
  ];
  const subtotal = withTwoDecimals(lineItems.reduce((sum, item) => sum + Number(item.subtotal), 0));
  const taxAmount = withTwoDecimals((subtotal * TAX_RATE) / 100);
  const totalAmount = withTwoDecimals(subtotal + taxAmount);

  const invoiceNumber = existing?.invoiceNumber || (await generateUniqueInvoiceNumber(options));

  const payload = {
    invoiceNumber,
    invoiceDate,
    dueDate,
    paymentTerms,
    buyerId: order.buyerId,
    sellerId: order.sellerId,
    sellerDetails: toPartyDetails(order.seller),
    buyerDetails: toPartyDetails(order.buyer),
    lineItems,
    subtotal,
    commission,
    taxRate: TAX_RATE,
    taxAmount,
    totalAmount,
    status: order.paymentStatus === 'Paid' ? 'Paid' : 'Issued'
  };

  if (existing) {
    await existing.update(payload, { transaction: options.transaction });
    return existing;
  }

  return InvoiceRecord.create(
    {
      orderId: order.id,
      ...payload
    },
    { transaction: options.transaction }
  );
};

const writeInvoicePdf = async ({ invoice, order, baseUrl }) => {
  await ensureStorageDir();
  const fileName = `invoice_${invoice.invoiceNumber}.pdf`;
  const safeFileName = fileName.replace(/[^\w.-]/g, '_');
  const absolutePath = path.join(STORAGE_DIR, safeFileName);
  const publicPath = `/invoices/${safeFileName}`;
  const downloadUrl = `${baseUrl}${publicPath}`;

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const writer = fs.createWriteStream(absolutePath);
  doc.pipe(writer);

  const formatDate = (value) => new Date(value).toLocaleDateString();
  const left = 50;
  const right = 545;
  const pageBottom = 792 - 50;
  const contentWidth = right - left;
  const tableCol = {
    description: 250,
    unitPrice: 100,
    qty: 55,
    subtotal: contentWidth - 250 - 100 - 55
  };
  const tableX = {
    start: left,
    unit: left + tableCol.description,
    qty: left + tableCol.description + tableCol.unitPrice,
    subtotal: left + tableCol.description + tableCol.unitPrice + tableCol.qty,
    end: right
  };
  const lineColor = '#e2e8f0';
  const subText = '#64748b';
  const mainText = '#0f172a';
  const valueText = '#111827';

  const drawTableHeader = (startY) => {
    doc.save();
    doc.fillColor('#f8fafc').rect(left, startY, contentWidth, 24).fill();
    doc.strokeColor(lineColor).lineWidth(1).rect(left, startY, contentWidth, 24).stroke();
    doc.restore();

    doc.fillColor(mainText).font('Helvetica-Bold').fontSize(10);
    doc.text('Description', tableX.start + 8, startY + 7, { width: tableCol.description - 16 });
    doc.text('Unit Price', tableX.unit + 8, startY + 7, { width: tableCol.unitPrice - 16, align: 'right' });
    doc.text('Qty', tableX.qty + 8, startY + 7, { width: tableCol.qty - 16, align: 'right' });
    doc.text('Subtotal', tableX.subtotal + 8, startY + 7, { width: tableCol.subtotal - 16, align: 'right' });
  };

  const drawPartyCard = (title, party, x, y, width) => {
    const padding = 10;
    const lineGap = 4;
    const lines = [party.name, party.email, party.contact, party.address];
    const bodyHeight = lines.reduce(
      (sum, line) => sum + doc.heightOfString(String(line || 'N/A'), { width: width - padding * 2 }),
      0
    ) + lineGap * (lines.length - 1);
    const cardHeight = 28 + bodyHeight + 14;

    doc.save();
    doc.roundedRect(x, y, width, cardHeight, 8).fill('#ffffff');
    doc.strokeColor(lineColor).lineWidth(1).roundedRect(x, y, width, cardHeight, 8).stroke();
    doc.restore();

    doc.fillColor(mainText).font('Helvetica-Bold').fontSize(11).text(title, x + padding, y + 8);
    let textY = y + 30;
    doc.fillColor(valueText).font('Helvetica').fontSize(9.5);
    lines.forEach((line) => {
      const rendered = String(line || 'N/A');
      doc.text(rendered, x + padding, textY, { width: width - padding * 2 });
      textY += doc.heightOfString(rendered, { width: width - padding * 2 }) + lineGap;
    });

    return y + cardHeight;
  };

  drawInvoiceBrandLogo(doc, 50, 50);
  doc.fillColor('#9a3412').font('Helvetica-Bold').fontSize(16).text('SkillMart', 100, 56, { lineBreak: false });
  doc.fillColor(subText).font('Helvetica').fontSize(9).text('Student Services Marketplace', 100, 75);

  doc.fillColor(mainText).font('Helvetica-Bold').fontSize(24).text('INVOICE', 375, 52, { width: 170, align: 'right' });
  doc.font('Helvetica').fontSize(10).fillColor(valueText);
  doc.text(`Invoice Number: ${invoice.invoiceNumber}`, 330, 86, { width: 215, align: 'right' });
  doc.text(`Invoice Date: ${formatDate(invoice.invoiceDate)}`, 330, 102, { width: 215, align: 'right' });
  doc.text(`Due Date: ${formatDate(invoice.dueDate)}`, 330, 118, { width: 215, align: 'right' });

  doc.strokeColor(lineColor).lineWidth(1).moveTo(left, 138).lineTo(right, 138).stroke();

  const cardTop = 154;
  const cardGap = 12;
  const cardWidth = (contentWidth - cardGap) / 2;
  const sellerBottom = drawPartyCard('Seller Details', invoice.sellerDetails, left, cardTop, cardWidth);
  const buyerBottom = drawPartyCard('Buyer Details', invoice.buyerDetails, left + cardWidth + cardGap, cardTop, cardWidth);

  let y = Math.max(sellerBottom, buyerBottom) + 18;
  drawTableHeader(y);
  y += 24;

  invoice.lineItems.forEach((item) => {
    const desc = String(item.description || 'Service');
    const descHeight = doc.heightOfString(desc, { width: tableCol.description - 16 });
    const rowHeight = Math.max(24, descHeight + 10);

    if (y + rowHeight + 140 > pageBottom) {
      doc.addPage();
      y = 50;
      drawTableHeader(y);
      y += 24;
    }

    doc.strokeColor(lineColor).lineWidth(1).rect(left, y, contentWidth, rowHeight).stroke();
    doc.moveTo(tableX.unit, y).lineTo(tableX.unit, y + rowHeight).stroke();
    doc.moveTo(tableX.qty, y).lineTo(tableX.qty, y + rowHeight).stroke();
    doc.moveTo(tableX.subtotal, y).lineTo(tableX.subtotal, y + rowHeight).stroke();

    doc.fillColor(valueText).font('Helvetica').fontSize(10);
    doc.text(desc, tableX.start + 8, y + 6, { width: tableCol.description - 16 });
    doc.text(`$${withTwoDecimals(item.unitPrice).toFixed(2)}`, tableX.unit + 8, y + 6, {
      width: tableCol.unitPrice - 16,
      align: 'right'
    });
    doc.text(String(item.quantity), tableX.qty + 8, y + 6, { width: tableCol.qty - 16, align: 'right' });
    doc.text(`$${withTwoDecimals(item.subtotal).toFixed(2)}`, tableX.subtotal + 8, y + 6, {
      width: tableCol.subtotal - 16,
      align: 'right'
    });
    y += rowHeight;
  });

  y += 16;
  if (y + 180 > pageBottom) {
    doc.addPage();
    y = 50;
  }

  const sectionTop = y;
  const summaryWidth = 240;
  const summaryX = right - summaryWidth;
  const summaryHeight = 138;
  doc.save();
  doc.roundedRect(summaryX, sectionTop, summaryWidth, summaryHeight, 8).fill('#f8fafc');
  doc.strokeColor(lineColor).lineWidth(1).roundedRect(summaryX, sectionTop, summaryWidth, summaryHeight, 8).stroke();
  doc.restore();

  const rowLeft = summaryX + 12;
  const rowLabelWidth = 104;
  const rowValueX = rowLeft + rowLabelWidth + 6;
  const rowValueWidth = summaryWidth - (rowValueX - summaryX) - 12;

  doc.fillColor(mainText).font('Helvetica-Bold').fontSize(10).text('Summary', summaryX + 10, sectionTop + 8);
  doc.font('Helvetica').fontSize(10).fillColor(valueText);
  doc.text('Subtotal', rowLeft, sectionTop + 30, { width: rowLabelWidth });
  doc.text(`$${withTwoDecimals(invoice.subtotal).toFixed(2)}`, rowValueX, sectionTop + 30, { width: rowValueWidth, align: 'right' });
  doc.text('Commission', rowLeft, sectionTop + 48, { width: rowLabelWidth });
  doc.text(`$${withTwoDecimals(invoice.commission || 0).toFixed(2)}`, rowValueX, sectionTop + 48, { width: rowValueWidth, align: 'right' });
  if (Number(invoice.taxRate) > 0) {
    doc.text(`Tax (${withTwoDecimals(invoice.taxRate).toFixed(2)}%)`, rowLeft, sectionTop + 66, { width: rowLabelWidth });
    doc.text(`$${withTwoDecimals(invoice.taxAmount).toFixed(2)}`, rowValueX, sectionTop + 66, { width: rowValueWidth, align: 'right' });
  } else {
    doc.text('Tax', rowLeft, sectionTop + 66, { width: rowLabelWidth });
    doc.text('$0.00', rowValueX, sectionTop + 66, { width: rowValueWidth, align: 'right' });
  }
  doc.strokeColor(lineColor).lineWidth(1).moveTo(summaryX + 10, sectionTop + 94).lineTo(summaryX + summaryWidth - 10, sectionTop + 94).stroke();
  doc.fillColor(mainText).font('Helvetica-Bold').fontSize(11).text('Total', rowLeft, sectionTop + 106, { width: rowLabelWidth });
  doc.text(`$${withTwoDecimals(invoice.totalAmount).toFixed(2)}`, rowValueX, sectionTop + 106, { width: rowValueWidth, align: 'right' });

  doc.fillColor(mainText).font('Helvetica-Bold').fontSize(10).text('Payment Terms', left, sectionTop + 8);
  doc.font('Helvetica').fontSize(10).fillColor(valueText).text(invoice.paymentTerms, left, sectionTop + 26, { width: 260 });
  const orderRefY = sectionTop + 54;
  const serviceY = sectionTop + 76;
  doc.text(`Order Reference: #${order.id}`, left, orderRefY);
  doc.text(`Service: ${order.service?.title || 'Service'}`, left, serviceY, { width: 260 });

  const paymentBottom = serviceY + doc.heightOfString(`Service: ${order.service?.title || 'Service'}`, { width: 260 });
  const sectionBottom = Math.max(sectionTop + summaryHeight, paymentBottom);
  const dividerY = sectionBottom + 16;
  const thankYouY = dividerY + 8;

  if (thankYouY > pageBottom - 10) {
    doc.addPage();
    const newDividerY = 72;
    doc.strokeColor(lineColor).lineWidth(1).moveTo(left, newDividerY).lineTo(right, newDividerY).stroke();
    doc.fillColor(subText).font('Helvetica').fontSize(9).text('Thank you for using SkillMart.', left, newDividerY + 10, {
      width: contentWidth,
      align: 'center'
    });
  } else {
    doc.strokeColor(lineColor).lineWidth(1).moveTo(left, dividerY).lineTo(right, dividerY).stroke();
    doc.fillColor(subText).font('Helvetica').fontSize(9).text('Thank you for using SkillMart.', left, thankYouY, {
      width: contentWidth,
      align: 'center'
    });
  }

  doc.fillColor(subText).font('Helvetica').fontSize(9).text(`Generated on ${formatDate(new Date())}`, left, pageBottom - 8, {
    width: contentWidth,
    align: 'right'
  });

  doc.end();
  await new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });

  await invoice.update({
    filePath: publicPath,
    downloadUrl
  });

  return { absolutePath, publicPath, downloadUrl, fileName: safeFileName };
};

module.exports = {
  loadOrderWithRelations,
  ensureInvoiceRecord,
  writeInvoicePdf
};
