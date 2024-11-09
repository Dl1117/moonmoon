import express from 'express';
import { adminLogin, createAdminAccount } from '../controller/adminController.js';
import { fetchDurianVarieties, handleCreateOrUpdateDurianVariety } from '../controller/durianController.js';
import { createSupplier, getAllSuppliers, getSupplierById } from '../controller/supplierController.js';
import { createPurchaseInvoiceController, createPurchaseOrderController, retrieveAllPurchasesController } from '../controller/purchaseController.js';
import { createSalesInvoiceController, createSalesOrderController, retrieveAllSalesController } from '../controller/salesController.js';
import { authenticateJWT } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/mutlerConfig.js';
const adminRoutes = express.Router();

// Route for admin login
adminRoutes.post('/login', adminLogin);
adminRoutes.post('/create-account', createAdminAccount);


// Middleware to protect routes
adminRoutes.use(authenticateJWT); // Protect all subsequent routes except admin login and create account

// Route for handling durian
adminRoutes.post('/create-durian-variety', handleCreateOrUpdateDurianVariety);
adminRoutes.get('/get-all-durian-variety', fetchDurianVarieties);

// Route for handling supplier
adminRoutes.post('/create-suppliers', createSupplier);
adminRoutes.get('/get-all-suppliers', getAllSuppliers);
adminRoutes.get('/supplier/:id', getSupplierById);

// Route for handling purchases
adminRoutes.post('/create-purchase-order', createPurchaseOrderController);
adminRoutes.post('/upload-purchase-invoice', upload.array('invoiceImages'), createPurchaseInvoiceController);
adminRoutes.get('/get-all-purchases', retrieveAllPurchasesController);


// Route for handling sales
adminRoutes.post('/create-sales-order', createSalesOrderController);
adminRoutes.post('/upload-sales-invoice',upload.array("invoiceImages"), createSalesInvoiceController);
adminRoutes.get('/get-all-sales', retrieveAllSalesController);


export default adminRoutes;
