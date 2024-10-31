import { createPurchaseOrder, createPurchaseInvoice, retrieveAllPurchases } from '../services/purchaseService.js';

// Create purchase order
export const createPurchaseOrderController = async (req, res) => {
  try {
    const { purchaseInfos } = req.body;
    const result = await createPurchaseOrder(purchaseInfos);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('Error creating purchase order:', error);
    res.status(500).json({ success: false, message: 'Failed to create purchase order' });
  }
};

// Create purchase invoice
export const createPurchaseInvoiceController = async (req, res) => {
  try {
    const { purchaseInvoices } = req.body;
    const result = await createPurchaseInvoice(purchaseInvoices);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('Error creating purchase invoice:', error);
    res.status(500).json({ success: false, message: 'Failed to create purchase invoice' });
  }
};

// Retrieve all purchases
export const retrieveAllPurchasesController = async (req, res) => {
  try {
    const purchases = await retrieveAllPurchases();
    res.status(200).json({ success: true, data: purchases });
  } catch (error) {
    console.error('Error retrieving purchases:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve purchases' });
  }
};
