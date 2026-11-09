import PDFDocument from 'pdfkit';
import { Invoice } from '../../models/Invoice.js';
import { Organization } from '../../models/Organization.js';
import { Customer } from '../../models/Customer.js';
import { logAudit } from '../audit/auditService.js';

export const generateNextInvoiceNumber = async (organizationId) => {
  const org = await Organization.findById(organizationId);
  const prefix = org?.settings?.invoicePrefix || 'INV';
  const year = new Date().getFullYear();

  const count = await Invoice.countDocuments({ organizationId });
  const sequence = String(count + 1).padStart(4, '0');
  return `${prefix}-${year}-${sequence}`;
};

export const createInvoice = async ({
  organizationId,
  customerId,
  subscriptionId,
  items,
  discount = 0,
  tax = 0,
  dueDate,
  notes = '',
  userId,
}) => {
  if (!items || !items.length) {
    throw new Error('Invoice must contain at least one line item.');
  }

  // Calculate items total
  const calculatedItems = items.map((item) => ({
    description: item.description,
    quantity: Number(item.quantity) || 1,
    unitPrice: Number(item.unitPrice) || 0,
    total: (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0),
  }));

  const subtotal = calculatedItems.reduce((acc, curr) => acc + curr.total, 0);
  const numDiscount = Number(discount) || 0;
  const numTax = Number(tax) || 0;
  const total = Math.max(0, subtotal - numDiscount + numTax);
  const invoiceNumber = await generateNextInvoiceNumber(organizationId);

  const invoice = await Invoice.create({
    organizationId,
    invoiceNumber,
    customerId,
    subscriptionId,
    items: calculatedItems,
    subtotal,
    discount: numDiscount,
    tax: numTax,
    total,
    amountPaid: 0,
    balanceDue: total,
    issueDate: new Date(),
    dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    status: 'sent',
    notes,
  });

  await logAudit({
    organizationId,
    userId,
    action: 'CREATE_INVOICE',
    entityType: 'Invoice',
    entityId: invoice._id,
    metadata: { invoiceNumber, customerId, total },
  });

  return invoice;
};

/**
 * Builds a streamable PDF for an invoice using PDFKit
 */
export const buildInvoicePDF = async (invoiceId, organizationId, res) => {
  const invoice = await Invoice.findOne({ _id: invoiceId, organizationId }).populate('customerId');
  if (!invoice) throw new Error('Invoice not found.');

  const org = await Organization.findById(organizationId);

  const doc = new PDFDocument({ margin: 40, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=${invoice.invoiceNumber}.pdf`);

  doc.pipe(res);

  // Header
  doc.fontSize(22).font('Helvetica-Bold').text(org?.name || 'SmartCRM Business', 40, 40);
  doc.fontSize(10).font('Helvetica').text(org?.email || 'contact@business.com', 40, 68);
  doc.text(org?.phone || '', 40, 82);
  doc.text(`${org?.address?.street || ''} ${org?.address?.city || ''} ${org?.address?.country || ''}`, 40, 96);

  // Invoice Title & Info
  doc.fontSize(20).font('Helvetica-Bold').text('INVOICE', 400, 40, { align: 'right' });
  doc.fontSize(10).font('Helvetica').text(`Invoice #: ${invoice.invoiceNumber}`, 400, 68, { align: 'right' });
  doc.text(`Issue Date: ${invoice.issueDate.toISOString().split('T')[0]}`, 400, 82, { align: 'right' });
  doc.text(`Due Date: ${invoice.dueDate.toISOString().split('T')[0]}`, 400, 96, { align: 'right' });
  doc.text(`Status: ${invoice.status.toUpperCase()}`, 400, 110, { align: 'right' });

  // Divider
  doc.moveTo(40, 135).lineTo(555, 135).stroke('#cbd5e1');

  // Customer Details
  doc.fontSize(12).font('Helvetica-Bold').text('Billed To:', 40, 150);
  doc.fontSize(10).font('Helvetica').text(invoice.customerId?.name || 'Customer Name', 40, 168);
  if (invoice.customerId?.company) doc.text(invoice.customerId.company, 40, 182);
  doc.text(invoice.customerId?.email || '', 40, 196);
  if (invoice.customerId?.phone) doc.text(invoice.customerId.phone, 40, 210);

  // Line Items Table Header
  const tableTop = 240;
  doc.rect(40, tableTop, 515, 24).fill('#f1f5f9');
  doc.fillColor('#334155').fontSize(10).font('Helvetica-Bold');
  doc.text('Description', 50, tableTop + 7);
  doc.text('Qty', 320, tableTop + 7, { width: 50, align: 'center' });
  doc.text('Unit Price', 380, tableTop + 7, { width: 80, align: 'right' });
  doc.text('Amount', 470, tableTop + 7, { width: 75, align: 'right' });

  let y = tableTop + 30;
  doc.font('Helvetica').fontSize(10).fillColor('#0f172a');

  invoice.items.forEach((item) => {
    doc.text(item.description, 50, y, { width: 260 });
    doc.text(String(item.quantity), 320, y, { width: 50, align: 'center' });
    doc.text(`$${item.unitPrice.toFixed(2)}`, 380, y, { width: 80, align: 'right' });
    doc.text(`$${item.total.toFixed(2)}`, 470, y, { width: 75, align: 'right' });
    y += 24;
  });

  // Table Divider
  doc.moveTo(40, y + 10).lineTo(555, y + 10).stroke('#e2e8f0');
  y += 20;

  // Totals Area
  const totalsLeft = 360;
  doc.text('Subtotal:', totalsLeft, y);
  doc.text(`$${invoice.subtotal.toFixed(2)}`, 470, y, { width: 75, align: 'right' });
  y += 18;

  if (invoice.discount > 0) {
    doc.text('Discount:', totalsLeft, y);
    doc.text(`-$${invoice.discount.toFixed(2)}`, 470, y, { width: 75, align: 'right' });
    y += 18;
  }

  if (invoice.tax > 0) {
    doc.text('Tax:', totalsLeft, y);
    doc.text(`+$${invoice.tax.toFixed(2)}`, 470, y, { width: 75, align: 'right' });
    y += 18;
  }

  doc.font('Helvetica-Bold').fontSize(12);
  doc.text('Total:', totalsLeft, y);
  doc.text(`$${invoice.total.toFixed(2)}`, 470, y, { width: 75, align: 'right' });
  y += 22;

  doc.fontSize(10).fillColor('#16a34a');
  doc.text('Amount Paid:', totalsLeft, y);
  doc.text(`$${invoice.amountPaid.toFixed(2)}`, 470, y, { width: 75, align: 'right' });
  y += 18;

  doc.fillColor(invoice.balanceDue > 0 ? '#dc2626' : '#16a34a').font('Helvetica-Bold');
  doc.text('Balance Due:', totalsLeft, y);
  doc.text(`$${invoice.balanceDue.toFixed(2)}`, 470, y, { width: 75, align: 'right' });

  // Notes
  if (invoice.notes) {
    y += 35;
    doc.fillColor('#64748b').fontSize(9).font('Helvetica-Oblique');
    doc.text(`Notes: ${invoice.notes}`, 40, y, { width: 515 });
  }

  doc.end();
};
