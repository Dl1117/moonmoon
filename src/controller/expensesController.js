import {
  createExpensesService,
  retrieveAllGroupedExpensesService,
  retrieveTodayExpensesService,
} from "../services/expenses.js";

export const createExpensesController = async (req, res) => {
  try {
    console.log("Request body:", req.body);

    const { expenses } = req.body;

    // Validate request body
    if (!expenses || !Array.isArray(expenses) || expenses.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Expenses array is required and must not be empty.",
        data: null,
      });
    }

    // Call the service function to create expenses
    const result = await createExpensesService(expenses);

    // If everything went well, return a successful response
    res.status(201).json({
      success: true,
      message: `${result.data.count} expenses created successfully.`,
      data: result.data,
    });
  } catch (error) {
    console.error("Error creating expenses:", error);

    // Handle specific error messages and return meaningful HTTP status codes
    if (error.message.includes("Invalid expenses data")) {
      return res.status(400).json({
        success: false,
        message: error.message,
        data: null,
      });
    }

    // For other types of errors (e.g., database issues), return 500
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create expenses.",
      data: null,
    });
  }
};

export const retrieveDailyExpenses = async (req, res) => {
  try {
    const result = await retrieveTodayExpensesService();
    res.status(200).json(result);
  } catch (error) {
    console.error("Error retrieving sales:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to retrieve today expenses" });
  }
};

export const retrieveAllExpenses = async (req, res) => {
  try {
    const { page, size, month, week } = req.query;

    // Convert `page` and `size` to numbers and provide default values if not supplied
    const pageNumber = page ? parseInt(page, 10) : null;
    const pageSize = size ? parseInt(size, 10) : null;
    const filterMonth = month ? parseInt(month, 10) : null;
    const filterWeek = week ? parseInt(week, 10) : null;
    const result = await retrieveAllGroupedExpensesService(
      pageNumber,
      pageSize,
      filterMonth,
      filterWeek
    );
    res.status(200).json(result);
  } catch (error) {
    console.error("Error retrieving sales:", error);
    res.status(500).json({ success: false, message: "Failed to all expenses" });
  }
};
