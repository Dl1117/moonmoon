import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const createExpensesService = async (expenses) => {
  try {
    // Validate the input
    if (!Array.isArray(expenses) || expenses.length === 0) {
      throw new Error("Expenses input must be a non-empty array.");
    }

    // Prepare the expense data
    const expensesData = expenses.map((expense) => {
      const { expensesType, expensesAmount, remark, date } = expense;

      // Validate required fields
      if (!expensesType || !expensesAmount) {
        throw new Error(
          "Each expense must include expensesType and expensesAmount."
        );
      }

      // Return the formatted expense object
      return {
        expensesType,
        expensesAmount: parseFloat(expensesAmount), // Ensure amount is a number
        remark: remark || "", // Optional field
        date: date ? new Date(date) : new Date(), // Default to current date if not provided
      };
    });

    // Use Prisma transaction to ensure all records are created or updated atomically
    const result = await prisma.$transaction(async (prismaTransaction) => {
      const createdExpenses = [];

      for (const expense of expensesData) {
        // Check if an expense of the same type already exists for today
        const existingExpense = await prismaTransaction.expenses.findFirst({
          where: {
            expensesType: expense.expensesType,
            date: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)), // Start of today
              lt: new Date(new Date().setHours(23, 59, 59, 999)), // End of today
            },
          },
        });

        if (existingExpense) {
          // If the expense exists, update it by adding the new amount
          const updatedExpense = await prismaTransaction.expenses.update({
            where: { id: existingExpense.id },
            data: {
              expensesAmount:
                existingExpense.expensesAmount + expense.expensesAmount, // Add the new amount
            },
          });
          createdExpenses.push(updatedExpense);
        } else {
          // If the expense doesn't exist, create a new one
          const newExpense = await prismaTransaction.expenses.create({
            data: expense,
          });
          createdExpenses.push(newExpense);
        }
      }

      return createdExpenses;
    });

    // Return success message and result
    return {
      success: true,
      message: `${result.length} expenses processed successfully.`,
      data: result,
    };
  } catch (error) {
    // Handle errors
    return {
      success: false,
      message: error.message,
      data: null,
    };
  }
};

export const retrieveTodayExpensesService = async () => {
  try {
    // Get today's start and end time
    const startOfDay = new Date(new Date().setHours(0, 0, 0, 0)); // Start of today
    const endOfDay = new Date(new Date().setHours(23, 59, 59, 999)); // End of today

    // Retrieve expenses records for today
    const todaysExpenses = await prisma.expenses.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    // Check if there are any expenses for today
    if (todaysExpenses.length === 0) {
      return {
        success: true,
        message: "No expenses found for today.",
        data: [],
      };
    }

    // Return the retrieved expenses
    return {
      success: true,
      message: `Retrieved ${todaysExpenses.length} expenses for today.`,
      data: todaysExpenses,
    };
  } catch (error) {
    console.error("Error in retrieveOutstandingSalesSrv:", error.message);
    throw new Error("Failed to retrieve daily expenses. Please try again.");
  }
};

export const retrieveAllGroupedExpensesService = async (
  page,
  size,
  month,
  week
) => {
  try {
    const pagination = {};

    if (page !== null && size !== null) {
      const offset = page * size;
      pagination.skip = offset;
      pagination.take = size;
    }
    let dateFilter = null;

    if (month || week) {
      const currentYear = new Date().getFullYear();
      const filterMonth = month ? month - 1 : new Date().getMonth(); // Default to current month if not provided

      if (week) {
        // Week-specific filtering
        const firstDayOfMonth = new Date(currentYear, filterMonth, 1);
        const weekStart = new Date(
          firstDayOfMonth.getFullYear(),
          firstDayOfMonth.getMonth(),
          (week - 1) * 7 + 1
        );
        const weekEnd = new Date(
          firstDayOfMonth.getFullYear(),
          firstDayOfMonth.getMonth(),
          week * 7 + 1
        );

        // Ensure the week range is valid within the specified month
        dateFilter = {
          date: {
            gte: weekStart,
            lt: new Date(
              Math.min(
                weekEnd.getTime(),
                new Date(currentYear, filterMonth + 1, 1).getTime() // Start of the next month
              )
            ),
          },
        };
      } else {
        // Month-specific filtering
        dateFilter = {
          date: {
            gte: new Date(currentYear, filterMonth, 1), // Start of the month
            lt: new Date(currentYear, filterMonth + 1, 1), // Start of the next month
          },
        };
      }
    }
    // Retrieve all expenses from the database
    const allExpenses = await prisma.expenses.findMany({
      ...pagination,
      where: {
        ...dateFilter,
      },
      orderBy: {
        date: "asc", // Sort by date in ascending order (earliest first)
      },
    });

    // Check if there are any expenses
    // if (allExpenses.length === 0) {
    //   return {
    //     success: true,
    //     message: "No expenses found.",
    //     data: [],
    //   };
    // }

    // Group expenses by date
    const groupedExpenses = allExpenses.reduce((acc, expense) => {
      const expenseDate = expense.date.toISOString().split("T")[0]; // Get the date in 'YYYY-MM-DD' format

      // If the group for this date doesn't exist, create it
      if (!acc[expenseDate]) {
        acc[expenseDate] = [];
      }

      // Push the expense to the respective date group
      acc[expenseDate].push(expense);

      return acc;
    }, {});

    // Convert the grouped data into an array and sort the dates in ascending order
    const sortedGroupedExpenses = Object.keys(groupedExpenses)
      .sort() // Sort the dates in ascending order
      .map((date) => ({
        date,
        expensesType: groupedExpenses[date],
      }));

    const totalRecords = await prisma.expenses.count();
    const totalPages = size ? Math.ceil(totalRecords / size) : 1;

    // Return grouped and sorted expenses
    return {
      success: true,
      message: `Retrieved and grouped expenses by date.`,
      data: {
        expenses: sortedGroupedExpenses,
        pagination: {
          totalRecords,
          page: page !== null ? page : null,
          size: size || null,
          totalPages: totalPages || null,
        },
      },
    };
  } catch (error) {
    console.error("Error in retrieveOutstandingSalesSrv:", error.message);
    throw new Error("Failed to retrieve all expenses. Please try again.");
  }
};
