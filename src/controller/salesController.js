import {
          createSalesOrder,
          createSalesInvoice,
          retrieveAllSales,
          retrieveOutstandingSalesSrv,
          changeSalesInfoInformation
        } from '../services/salesService.js';
        
        // Controller to create sales order
        export const createSalesOrderController = async (req, res) => {
          try {

            const invoiceImages = req.files;

            const salesInfos = JSON.parse(req.body.salesInfos);

            const result = await createSalesOrder(salesInfos, invoiceImages || []);
            res.status(201).json({ success: true, data: result });
          } catch (error) {
            console.error('Error creating sales order:', error);
            res.status(500).json({ success: false, message: 'Failed to create sales order' });
          }
        };
        
        // Controller to create sales invoice
        export const createSalesInvoiceController = async (req, res) => {
          try {

            const {salesId} = req.body;
            const salesImages = req.files;

            if (!salesId) {
              return res.status(400).json({ success: false, message: 'Purchase ID is required' });
            }
      
            // Validate if files are uploaded
            if (!salesImages || salesImages.length === 0) {
              return res.status(400).json({ success: false, message: 'No invoice images uploaded' });
            }

            // Prepare the data to be saved (if required, you can store image buffers in the database)
          const salesOrderIdInvoices = salesImages.map(file => ({
            image: file.buffer, // Storing the file buffer in the database
            salesId, // Linking the invoice to the specific purchaseId
          }));

            const result = await createSalesInvoice(salesOrderIdInvoices);
            res.status(201).json({ success: true, data: result });
          } catch (error) {
            console.error('Error creating sales invoice:', error);
            res.status(500).json({ success: false, message: 'Failed to create sales invoice' });
          }
        };
        
        // Controller to retrieve all sales
        export const retrieveAllSalesController = async (req, res) => {
          try {
            const result = await retrieveAllSales();
            res.status(200).json({ success: true, data: result });
          } catch (error) {
            console.error('Error retrieving sales:', error);
            res.status(500).json({ success: false, message: 'Failed to retrieve sales' });
          }
        };

        //SUPERADMIN controller
export const retrieveOutstandingSalesController = async (req, res) => {
  try{
    const outstandingSales = await retrieveOutstandingSalesSrv();
    res.status(200).json({ success: true, data: outstandingSales });

  }catch (error) {
    console.error('Error retrieving purchases:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve purchases' });
  }
}

export const changeSalesInfoInformationController = async (req, res) => {
  try {
    console.log("reading purchase info request.body...", req.body);
    const { salesInfo } = req.body;
    const result = await changeSalesInfoInformation(salesInfo);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('Error creating purchase order:', error);
    res.status(500).json({ success: false, message: 'Failed to create purchase order' });
  }
}
        