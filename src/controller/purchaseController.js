import {
  createPurchaseOrder,
  createPurchaseInvoice,
  retrieveAllPurchases,
  retrieveOutstandingPurchasesSrv,
  changePurchaseInfoInformationSrv,
} from "../services/purchaseService.js";

// Create purchase order
export const createPurchaseOrderController = async (req, res) => {
  try {
    console.log(
      "reading purchase info request.body...",
      JSON.parse(req.body.purchaseInfos)
    );
    const invoiceImages = req.files;

    const purchaseInfos = JSON.parse(req.body.purchaseInfos);
    const result = await createPurchaseOrder(
      purchaseInfos,
      invoiceImages || []
    );
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error("Error creating purchase order:", error); // Log full error for debugging

    // Check if the error is a validation error (e.g., missing required fields, type mismatch)
    if (error instanceof SyntaxError) {
      // Handle specific case for invalid JSON
      res.status(400).json({
        success: false,
        message: "Invalid JSON format for purchaseInfos",
      });
    } else if (error.message.includes("Invalid value provided")) {
      // Handle specific Prisma validation errors
      res.status(400).json({
        success: false,
        message: "Invalid data provided. Please check your input fields.",
      });
    } else {
      // Generic error handling
      res.status(500).json({
        success: false,
        message: "Failed to create purchase order. Please try again later.",
      });
    }
  }
};

// Create purchase invoice
export const createPurchaseInvoiceController = async (req, res) => {
  try {
    console.log("reading request body...", req.body);
    // Extract purchaseId and uploaded files from request body and files
    const { purchaseId } = req.body;
    const invoiceImages = req.files;

    console.log("reading invoice images", req.files);
    // Validate if purchaseId is provided
    if (!purchaseId) {
      return res
        .status(400)
        .json({ success: false, message: "Purchase ID is required" });
    }

    // Validate if files are uploaded
    if (!invoiceImages || invoiceImages.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No invoice images uploaded" });
    }

    // Prepare the data to be saved (if required, you can store image buffers in the database)
    const purchaseOrderIdInvoices = invoiceImages.map((file) => ({
      image: file.buffer, // Storing the file buffer in the database
      purchaseId, // Linking the invoice to the specific purchaseId
    }));

    // Call service to create purchase invoices in the database
    const result = await createPurchaseInvoice(purchaseOrderIdInvoices);

    // Respond with success
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error("Error creating purchase invoice:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to create purchase invoice" });
  }
};

// Retrieve all purchases
export const retrieveAllPurchasesController = async (req, res) => {
  try {
    const { page, size, month, week } = req.query;

    // Convert `page` and `size` to numbers and provide default values if not supplied
    const pageNumber = page ? parseInt(page, 10) : null;
    const pageSize = size ? parseInt(size, 10) : null;
    const filterMonth = month ? parseInt(month, 10) : null;
    const filterWeek = week ? parseInt(week, 10) : null;

    const response = await retrieveAllPurchases(pageNumber, pageSize, filterMonth, filterWeek);

    if (!response.success) {
      console.error(
        "Error in retrieveAllPurchasesController:",
        response.errorDetails
      );
      return res.status(500).json({
        success: false,
        message: response.message,
      });
    }

    res.status(200).json(response);
  } catch (error) {
    console.error("Unexpected error in retrieveAllPurchasesController:", error);
    res.status(500).json({
      success: false,
      message: "An unexpected error occurred while retrieving purchases",
    });
  }
};

//SUPERADMIN controller
export const retrieveOutstandingPurchasesController = async (req, res) => {
  try {
    const { page, size, month,  week } = req.query;

    // Convert `page` and `size` to numbers and provide default values if not supplied
    const pageNumber = page ? parseInt(page, 10) : null;
    const pageSize = size ? parseInt(size, 10) : null;
    const filterMonth = month ? parseInt(month, 10) : null;
    const filterWeek = week ? parseInt(week, 10) : null;
    const response = await retrieveOutstandingPurchasesSrv(
      pageNumber,
      pageSize,
      filterMonth,
      filterWeek
    );

    if (!response.success) {
      console.error(
        "Error in retrieveOutstandingPurchasesController:",
        response.errorDetails
      );
      return res.status(500).json({
        success: false,
        message: response.message,
      });
    }

    res.status(200).json(response);
  } catch (error) {
    console.error(
      "Unexpected error in retrieveOutstandingPurchasesController:",
      error
    );
    res.status(500).json({
      success: false,
      message:
        "An unexpected error occurred while retrieving outstanding purchases",
    });
  }
};

export const changePurchaseInfoInformationController = async (req, res) => {
  try {
    console.log("reading purchase info request.body...", req.body);
    const { purchaseInfo } = req.body;
    // Validate input data
    if (!purchaseInfo || !purchaseInfo.purchaseInfoId) {
      return res.status(400).json({
        success: false,
        message: "Missing required purchase information or purchaseInfoId",
      });
    }
    const result = await changePurchaseInfoInformationSrv(purchaseInfo);
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.message || "Failed to update purchase information",
      });
    }

    res.status(201).json({
      success: true,
      data: result,
      message: result.message,
    });
  } catch (error) {
    console.error("Error updating purchase info:", error);
    res.status(500).json({
      success: false,
      message:
        "An error occurred while updating the purchase information. Please try again later.",
    });
  }
};
