import { createPurchaseOrder, createPurchaseInvoice, retrieveAllPurchases } from '../services/purchaseService.js';

// Create purchase order
export const createPurchaseOrderController = async (req, res) => {
  try {
    console.log("reading purchase info request.body...", req.body);
    const { purchaseInfos } = req.body;
    const result = await createPurchaseOrder(purchaseInfos);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('Error creating purchase order:', error);
    res.status(500).json({ success: false, message: 'Failed to create purchase order' });
  }
};

// Create purchase invoice
export const createPurchaseInvoiceController = 
  async (req, res) => {
    try {

      console.log("reading request body...", req.body);
      // Extract purchaseId and uploaded files from request body and files
      const { purchaseId } = req.body;
      const invoiceImages = req.files;

      console.log("reading invoice images", req.files);
      // Validate if purchaseId is provided
      if (!purchaseId) {
        return res.status(400).json({ success: false, message: 'Purchase ID is required' });
      }

      // Validate if files are uploaded
      if (!invoiceImages || invoiceImages.length === 0) {
        return res.status(400).json({ success: false, message: 'No invoice images uploaded' });
      }

      // Prepare the data to be saved (if required, you can store image buffers in the database)
      const purchaseOrderIdInvoices = invoiceImages.map(file => ({
        image: file.buffer, // Storing the file buffer in the database
        purchaseId, // Linking the invoice to the specific purchaseId
      }));

      // Call service to create purchase invoices in the database
      const result = await createPurchaseInvoice(purchaseOrderIdInvoices);

      // Respond with success
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      console.error('Error creating purchase invoice:', error);
      res.status(500).json({ success: false, message: 'Failed to create purchase invoice' });
    }
  }

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
