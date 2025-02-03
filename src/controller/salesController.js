import {
  createSalesOrder,
  createSalesInvoice,
  retrieveAllSales,
  retrieveOutstandingSalesSrv,
  changeSalesInfoInformation,
  retrieveDashboardSalesSrv,
} from "../services/salesService.js";

// Controller to create sales order
export const createSalesOrderController = async (req, res) => {
  try {
    const invoiceImages = req.files;

    const salesInfos = JSON.parse(req.body.salesInfos);
    if (!salesInfos || !salesInfos.companyName || !salesInfos.salesInfo) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid sales order data. Ensure all required fields are provided.",
      });
    }
    const result = await createSalesOrder(salesInfos, invoiceImages || []);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error("Error creating sales order:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to create sales order" });
  }
};

// Controller to create sales invoice
export const createSalesInvoiceController = async (req, res) => {
  try {
    const { salesId } = req.body;
    const salesImages = req.files;

    if (!salesId) {
      return res
        .status(400)
        .json({ success: false, message: "Sales ID is required" });
    }

    // Validate if files are uploaded
    if (!salesImages || salesImages.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No invoice images uploaded" });
    }

    // Prepare the data to be saved (if required, you can store image buffers in the database)
    const salesOrderIdInvoices = salesImages.map((file) => ({
      image: file.buffer, // Storing the file buffer in the database
      salesId, // Linking the invoice to the specific purchaseId
    }));

    const result = await createSalesInvoice(salesOrderIdInvoices);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error("Error creating sales invoice:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to create sales invoice" });
  }
};

// Controller to retrieve all sales
export const retrieveAllSalesController = async (req, res) => {
  try {
    const { page, size, month, week } = req.query;

    // Convert `page` and `size` to numbers and provide default values if not supplied
    const pageNumber = page ? parseInt(page, 10) : null;
    const pageSize = size ? parseInt(size, 10) : null;
    const filterMonth = month ? parseInt(month, 10) : null;
    const filterWeek = week ? parseInt(week, 10) : null;
    const result = await retrieveAllSales(
      pageNumber,
      pageSize,
      filterMonth,
      filterWeek
    );
    res.status(200).json(result);
  } catch (error) {
    console.error("Error retrieving sales:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to retrieve sales" });
  }
};

export const retrieveDashboardSalesController = async (req, res) => {
  try {
    const result = await retrieveDashboardSalesSrv();
    res.status(200).json(result);
  } catch (error) {
    console.error("Error retrieving sales:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to retrieve dashboard sales" });
  }
};

//SUPERADMIN controller
export const retrieveOutstandingSalesController = async (req, res) => {
  try {
    const { page, size, month, week } = req.query;

    // Convert `page` and `size` to numbers and provide default values if not supplied
    const pageNumber = page ? parseInt(page, 10) : null;
    const pageSize = size ? parseInt(size, 10) : null;
    const filterMonth = month ? parseInt(month, 10) : null;
    const filterWeek = week ? parseInt(week, 10) : null;
    const outstandingSales = await retrieveOutstandingSalesSrv(
      pageNumber,
      pageSize,
      filterMonth,
      filterWeek
    );
    res.status(200).json(outstandingSales);
  } catch (error) {
    console.error(
      "Error in retrieveOutstandingSalesController:",
      error.message
    );
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

export const changeSalesInfoInformationController = async (req, res) => {
  try {
    console.log("reading purchase info request.body...", req.body);
    // Validate incoming request body structure
    if (!req.body || !req.body.salesId) {
      return res.status(400).json({
        success: false,
        message: "Sales ID is required to update sales information",
      });
    }
    const salesDetails = req.body;
    const result = await changeSalesInfoInformation(salesDetails);
    if (!result.success) {
      // If the service returns unsuccessful results, return detailed messages
      return res.status(400).json({
        success: false,
        message: "Failed to update sales info",
        errors: result.results,
      });
    }
    // If everything went fine, send the success response
    // return res
    //   .status(200)
    //   .json({
    //     success: true,
    //     data: result,
    //     message: "Successfully updated sales info",
    //   });
    return res.status(200).json({
      success: true,
      message: "Successfully updated sales info",
    });
  } catch (error) {
    // Handle specific errors based on the error message or type
    console.error("Error occurred while processing request:", error);

    if (error.message.includes("salesId")) {
      return res.status(400).json({
        success: false,
        message: "Invalid Sales ID provided",
      });
    }

    // General fallback error handler
    res.status(500).json({
      success: false,
      message:
        "An unexpected error occurred while processing your request. Please try again later.",
    });
  }
};
