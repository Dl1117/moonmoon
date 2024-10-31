import {
          createSalesOrder,
          createSalesInvoice,
          retrieveAllSales
        } from '../services/salesService.js';
        
        // Controller to create sales order
        export const createSalesOrderController = async (req, res) => {
          try {
            const result = await createSalesOrder(req.body.salesInfos);
            res.status(201).json({ success: true, data: result });
          } catch (error) {
            console.error('Error creating sales order:', error);
            res.status(500).json({ success: false, message: 'Failed to create sales order' });
          }
        };
        
        // Controller to create sales invoice
        export const createSalesInvoiceController = async (req, res) => {
          try {
            const result = await createSalesInvoice(req.body.salesInvoices);
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
        