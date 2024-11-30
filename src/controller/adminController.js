import {
  adminLoginAuth,
  createAdminAcc,
  requestAdvancedSalarySrv,
  superAdminCancellingPurchaseOrderSrv,
  superAdminCancellingSalesOrderSrv,
} from "../services/adminService.js";

export const adminLogin = async (req, res) => {
  const { loginId, password } = req.body;

  try {
    const { admin, accessToken, refreshToken } = await adminLoginAuth({
      loginId,
      password,
    });
    // Here you would typically generate a JWT token
    res
      .status(200)
      .json({
        message: "Admin logged in successfully",
        admin,
        accessToken,
        refreshToken,
      });
  } catch (error) {
    // Handle specific error cases with meaningful messages
    if (error.message === "Admin not found") {
      return res
        .status(404)
        .json({ message: "Admin with the provided login ID does not exist" });
    } else if (error.message === "Incorrect password") {
      return res
        .status(401)
        .json({ message: "The password you entered is incorrect" });
    } else {
      // Generic error handling
      console.error("Login error:", error);
      return res
        .status(500)
        .json({ message: "An error occurred while trying to log in" });
    }
  }
};

//super admin method
export const createAdminAccount = async (req, res) => {
  try {
    console.log("request body", req.body);
    const { username, loginId, password } = req.body;

    // Call the service function to create the admin account
    const result = await createAdminAcc({ username, loginId, password });

    // If everything went well, return a successful response
    res.status(201).json({
      success: true,
      message: "Admin account created successfully",
      data: result.data,
    });
  } catch (error) {
    console.error("Error creating admin account:", error);

    // Handle specific error messages and return meaningful HTTP status codes
    if (error.message.includes("required")) {
      return res.status(400).json({
        success: false,
        message: error.message,
        data: null,
      });
    }

    if (error.message.includes("already exists")) {
      return res.status(409).json({
        success: false,
        message: error.message,
        data: null,
      });
    }

    // For other types of errors (e.g., database issues), return 500
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create admin account",
      data: null,
    });
  }
};

export const superAdminCancellingSalesOrderCtr = async (req, res) => {
  try {
    const { salesId } = req.params;

    const cancellingOrder = await superAdminCancellingSalesOrderSrv(salesId);
    res.status(201).json({
      success: true,
      message: "Sales order cancelled successfully",
      data: cancellingOrder,
    });
  } catch (error) {
    console.error("Error cancelling sales order:", error);

    // Handle specific error messages and HTTP status codes
    if (error.message.includes("not found")) {
      return res.status(404).json({
        success: false,
        message: `Sales order with ID ${req.params.salesId} not found.`,
        data: null,
      });
    }

    if (error.message.includes("invalid")) {
      return res.status(400).json({
        success: false,
        message: `Invalid sales order ID provided.`,
        data: null,
      });
    }

    // For other internal errors
    res.status(500).json({
      success: false,
      message: "Failed to cancel sales order",
      data: null,
    });
  }
};

export const superAdminCancellingPurchaseOrderCtr = async (req, res) => {
  try {
    const { purchaseId } = req.params;

    const cancellingOrder = await superAdminCancellingPurchaseOrderSrv(
      purchaseId
    );
    res.status(201).json({
      success: true,
      message: "Purchase order cancelled successfully",
      data: cancellingOrder,
    });
  } catch (error) {
    console.error("Error cancelling purchase order:", error);

    // Handle specific error messages and HTTP status codes
    if (error.message.includes("not found")) {
      return res.status(404).json({
        success: false,
        message: `Purchase order with ID ${req.params.purchaseId} not found.`,
        data: null,
      });
    }

    if (error.message.includes("invalid")) {
      return res.status(400).json({
        success: false,
        message: `Invalid purchase order ID provided.`,
        data: null,
      });
    }

    // For other internal errors
    res.status(500).json({
      success: false,
      message: "Failed to cancel purchase order",
      data: null,
    });
  }
};

export const requestAdvancedSalaryCtr = async (req, res) => {
  try {
    // Call the service to process the request
    const requestAdvancedSalary = await requestAdvancedSalarySrv(req.body);

    // If the service responds with a failure, it should also include the correct status code and error message
    if (!requestAdvancedSalary.success) {
      if (requestAdvancedSalary.message.includes("required")) {
        return res.status(400).json({
          success: false,
          message: requestAdvancedSalary.message, // Your custom error message
          data: null,
        });
      } else if (requestAdvancedSalary.message.includes("does not exist")) {
        return res.status(404).json({
          success: false,
          message: requestAdvancedSalary.message,
          data: null,
        });
      } else {
        return res.status(500).json({
          success: false,
          message: "An unexpected error occurred.",
          data: null,
        });
      }
    }

    // Successful request
    return res.status(200).json({
      success: true,
      message: "Request advanced salary successful",
      data: requestAdvancedSalary.data,
    });
  } catch (error) {
    console.error("Error processing advanced salary request:", error);
    // Handle server error (internal issues)
    return res.status(500).json({
      success: false,
      message: "Failed to process advanced salary request",
      data: null,
    });
  }
};
