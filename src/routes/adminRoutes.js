import express from 'express';
import { adminLogin, createAdminAccount, requestAdvancedSalaryCtr, superAdminCancellingPurchaseOrderCtr, superAdminCancellingSalesOrderCtr } from '../controller/adminController.js';
import { fetchDurianVarieties, handleCreateOrUpdateDurianVariety } from '../controller/durianController.js';
import { createSupplier, getAllSuppliers, getSupplierById } from '../controller/supplierController.js';
import { changePurchaseInfoInformationController, createPurchaseInvoiceController, createPurchaseOrderController, retrieveAllPurchasesController, retrieveDashboardPurchasesController, retrieveOutstandingPurchasesController } from '../controller/purchaseController.js';
import { changeSalesInfoInformationController, createSalesInvoiceController, createSalesOrderController, retrieveAllSalesController, retrieveDashboardSalesController, retrieveOutstandingSalesController } from '../controller/salesController.js';
import { authenticateJWT, verifySuperAdminRole } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/mutlerConfig.js';
import { calculateDailyProfitLossController, retreiveDashbordProfitLossController } from '../controller/pLController.js';
import { createExpensesController, retrieveAllExpenses, retrieveDailyExpenses } from '../controller/expensesController.js';
const adminRoutes = express.Router();

// Route for admin/superadmin login
adminRoutes.post('/login', adminLogin);


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
adminRoutes.post('/create-purchase-order', upload.array('invoiceImages'),createPurchaseOrderController);
adminRoutes.post('/upload-purchase-invoice', upload.array('invoiceImages'), createPurchaseInvoiceController);
adminRoutes.get('/get-all-purchases', retrieveAllPurchasesController);
adminRoutes.get('/get-dashboard-purchases', retrieveDashboardPurchasesController);

// Route for handling sales
adminRoutes.post('/create-sales-order', upload.array('invoiceImages'), createSalesOrderController);
adminRoutes.post('/upload-sales-invoice',upload.array("invoiceImages"), createSalesInvoiceController);
adminRoutes.get('/get-all-sales', retrieveAllSalesController);
adminRoutes.get('/get-dashboard-sales', retrieveDashboardSalesController);

//Route for handling expenses
adminRoutes.post('/create-expenses', createExpensesController);
adminRoutes.get('/retrieve-today-expenses', retrieveDailyExpenses);
adminRoutes.get('/retrieve-all-expenses', retrieveAllExpenses);

//Route for handling dashboard profit/loss
adminRoutes.get('/get-dashboard-profit-loss', retreiveDashbordProfitLossController);

// Route for SUPERADMIN
adminRoutes.use(verifySuperAdminRole);
adminRoutes.post('/sales-cancel/:salesId', superAdminCancellingSalesOrderCtr);
adminRoutes.post('/purchase-cancel/:purchaseId', superAdminCancellingPurchaseOrderCtr);
adminRoutes.post('/request-advanced-salary', requestAdvancedSalaryCtr);
adminRoutes.get('/get-all-outstanding-purchases', retrieveOutstandingPurchasesController);
adminRoutes.post('/update-purchase-info', changePurchaseInfoInformationController);
adminRoutes.get('/profit-loss', calculateDailyProfitLossController);
adminRoutes.get('/get-all-outstanding-sales', retrieveOutstandingSalesController);
adminRoutes.post('/update-sales-info', changeSalesInfoInformationController);
adminRoutes.post('/create-account', createAdminAccount);


export default adminRoutes;
