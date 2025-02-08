import { PrismaClient } from "@prisma/client";
import { DateTime } from "luxon"; // Optional: For time zone handling

const prisma = new PrismaClient();

export const calculateDailyProfitLossSrv = async () => {
  // Get the current time in Malaysia (MYT, UTC+8)
  const today = DateTime.now().setZone("Asia/Kuala_Lumpur"); // Luxon to handle MYT time zone

  // Set the date range to today (start of today to end of today) in MYT
  const startOfDay = today.startOf("day").toISO(); // Start of the day in ISO format (MYT)
  const endOfDay = today.endOf("day").toISO(); // End of the day in ISO format (MYT)
  const startOfMonth = today.startOf("month").toISO();

  try {
    // Retrieve total sales for today in MYT (sum totalSalesValue from SalesInfo)
    const totalSales = await prisma.salesInfo.aggregate({
      _sum: {
        totalSalesValue: true,
      },
      where: {
        sales: {
          salesDate: {
            gte: new Date(startOfDay), // startOfDay should be a Date object
            lte: new Date(endOfDay), // endOfDay should be a Date object
          },
        },
      },
    });

    // Retrieve total purchases for today in MYT (sum totalPurchasePrice from PurchaseInfo)
    const totalPurchases = await prisma.purchaseInfo.aggregate({
      _sum: {
        totalPurchasePrice: true, // Sum of totalPurchasePrice in PurchaseInfo
      },
      where: {
        purchase: {
          purchaseDate: {
            gte: new Date(startOfDay), // Convert startOfDay to Date object
            lte: new Date(endOfDay), // Convert endOfDay to Date object
          },
        },
      },
    });

    const totalExpenses = await prisma.expenses.aggregate({
      _sum: {
        expensesAmount: true,
      },
      where: {
        date: {
          gte: new Date(startOfDay), // Convert startOfDay to Date object
          lte: new Date(endOfDay),
        },
      },
    });

    // Calculate total sales from the beginning of the month to today
    const totalSalesMonth = await prisma.salesInfo.aggregate({
      _sum: {
        totalSalesValue: true, // Sum of totalSalesValue in SalesInfo
      },
      where: {
        sales: {
          salesDate: {
            gte: new Date(startOfMonth), // Start of the month
            lte: new Date(endOfDay), // End of today
          },
        },
      },
    });

    // Calculate total purchases from the beginning of the month to today
    const totalPurchasesMonth = await prisma.purchaseInfo.aggregate({
      _sum: {
        totalPurchasePrice: true, // Sum of totalPurchasePrice in PurchaseInfo
      },
      where: {
        purchase: {
          purchaseDate: {
            gte: new Date(startOfMonth), // Start of the month
            lte: new Date(endOfDay), // End of today
          },
        },
      },
    });

    const totalExpensesMonth = await prisma.expenses.aggregate({
      _sum: {
        expensesAmount: true,
      },
      where: {
        date: {
          gte: new Date(startOfMonth), // Start of the month
          lte: new Date(endOfDay), // End of today
        },
      },
    });

    // Calculate daily profit/loss (Sales - Purchases)
    const salesTotal = totalSales._sum.totalSalesValue || 0;
    const purchaseTotal = totalPurchases._sum.totalPurchasePrice || 0;
    const expenseTotal = totalExpenses._sum.expensesAmount || 0;
    const dailyProfitLoss =
      parseFloat(salesTotal) -
      parseFloat(purchaseTotal) -
      parseFloat(expenseTotal);

    // Outstanding sales (sales with status 'OUTSTANDING')
    const totalOutstandingSales = await prisma.salesInfo.aggregate({
      _sum: { totalSalesValue: true },
      where: {
        sales: {
          salesStatus: "OUTSTANDING",
        },
      },
    });

    // Outstanding expenses (expenses not yet paid)
    const totalOutstandingPurchases = await prisma.purchaseInfo.aggregate({
      _sum: { totalPurchasePrice: true },
      where: {
        purchase:{ 
          purchaseStatus: "OUTSTANDING"} },
    });

    // Calculate profit/loss from the start of the month to today
    const salesMonth = totalSalesMonth._sum.totalSalesValue || 0;
    const purchasesMonth = totalPurchasesMonth._sum.totalPurchasePrice || 0;
    const expenseMonth = totalExpensesMonth._sum.expensesAmount || 0;
    const profitLossMonth =
      parseFloat(salesMonth) -
      parseFloat(purchasesMonth) -
      parseFloat(expenseMonth);

    const outstandingSales = totalOutstandingSales._sum.totalSalesValue || 0;
    const outstandingPurchases =
      totalOutstandingPurchases._sum.expensesAmount || 0;

    return {
      success: true,
      message: "Daily and monthly profit/loss calculated successfully",
      data: {
        dailyProfitLoss,
        totalDailySales: salesTotal,
        totalDailyPurchases: purchaseTotal,
        profitLossMonth,
        totalOutstandingSales: outstandingSales,
        totalOutstandingExpenses: outstandingPurchases,
      },
    };
  } catch (error) {
    console.error("Error calculating daily profit/loss:", error.message);
    return {
      success: false,
      message: "Failed to calculate daily and monthly profit/lNoss",
      error: error.message,
    };
  }
};

//calculate gross profit/loss need to deduct the expenses
//and also need to deduct the outstanding payment

export const retrieveDashboardProfitLossSrv = async () => {
  const today = DateTime.now().setZone("Asia/Kuala_Lumpur");

  // Yearly (Past 12 months)
  const months = Array.from({ length: 12 }, (_, i) =>
    today.minus({ months: i }).startOf("month")
  ).reverse(); // Reverse for chronological order

  // Monthly (Past 4 weeks)
  const weeks = Array.from({ length: 4 }, (_, i) =>
    today.minus({ weeks: i }).startOf("week")
  ).reverse();

  // Weekly (Past 7 days)
  const days = Array.from({ length: 7 }, (_, i) =>
    today.minus({ days: i }).startOf("day")
  ).reverse();

  try {
    // Function to calculate profit/loss
    const calculateProfitLoss = async (start, end) => {
      const [totalSales, totalPurchases, totalExpenses] = await Promise.all([
        prisma.salesInfo.aggregate({
          _sum: { totalSalesValue: true },
          where: {
            sales: {
              salesDate: { gte: start.toJSDate(), lte: end.toJSDate() },
            },
          },
        }),
        prisma.purchaseInfo.aggregate({
          _sum: { totalPurchasePrice: true },
          where: {
            purchase: {
              purchaseDate: { gte: start.toJSDate(), lte: end.toJSDate() },
            },
          },
        }),
        prisma.expenses.aggregate({
          _sum: { expensesAmount: true },
          where: { date: { gte: start.toJSDate(), lte: end.toJSDate() } },
        }),
      ]);

      return (
        (totalSales._sum.totalSalesValue || 0) -
        (totalPurchases._sum.totalPurchasePrice || 0) -
        (totalExpenses._sum.expensesAmount || 0)
      );
    };

    // Calculate profit/loss for each period
    const yearlyProfitLoss = await Promise.all(
      months.map(async (month) => ({
        month: month.toFormat("yyyy-MM"),
        profitLoss: await calculateProfitLoss(month, month.endOf("month")),
      }))
    );

    const monthlyProfitLoss = await Promise.all(
      weeks.map(async (week) => ({
        week: week.toFormat("yyyy-MM-dd"),
        profitLoss: await calculateProfitLoss(week, week.endOf("week")),
      }))
    );

    const weeklyProfitLoss = await Promise.all(
      days.map(async (day) => ({
        day: day.toFormat("yyyy-MM-dd"),
        profitLoss: await calculateProfitLoss(day, day.endOf("day")),
      }))
    );

    return {
      success: true,
      message: "Dashboard profit/loss retrieved successfully",
      data: {
        yearly: yearlyProfitLoss,
        monthly: monthlyProfitLoss,
        weekly: weeklyProfitLoss,
      },
    };
  } catch (error) {
    console.error("Error retrieving dashboard profit/loss:", error.message);
    return {
      success: false,
      message: "Failed to retrieve dashboard profit/loss",
      error: error.message,
    };
  }
};

//BELOW ARE FOR NON-PRISMA

// import { Sequelize, Op } from "sequelize";
// import { DateTime } from "luxon"; // Optional: For time zone handling
// import { SalesInfo, PurchaseInfo, Expenses } from "../../config/database.js";
// export const calculateDailyProfitLossSrv = async () => {
//   // Get the current time in Malaysia (MYT, UTC+8)
//   const today = DateTime.now().setZone("Asia/Kuala_Lumpur");

//   // Set the date range to today (start of today to end of today) in MYT
//   const startOfDay = today.startOf("day").toJSDate(); // Start of the day as JS Date
//   const endOfDay = today.endOf("day").toJSDate(); // End of the day as JS Date
//   const startOfMonth = today.startOf("month").toJSDate();

//   try {
//     // Retrieve total sales for today in MYT
//     const totalSales = await SalesInfo.findAll({
//       attributes: [
//         [Sequelize.fn("SUM", Sequelize.col("totalSalesValue")), "totalSalesValue"],
//       ],
//       where: {
//         salesDate: {
//           [Op.gte]: startOfDay,
//           [Op.lte]: endOfDay,
//         },
//       },
//       raw: true,
//     });

//     // Retrieve total purchases for today in MYT
//     const totalPurchases = await PurchaseInfo.findAll({
//       attributes: [
//         [Sequelize.fn("SUM", Sequelize.col("totalPurchasePrice")), "totalPurchasePrice"],
//       ],
//       where: {
//         purchaseDate: {
//           [Op.gte]: startOfDay,
//           [Op.lte]: endOfDay,
//         },
//       },
//       raw: true,
//     });

//     // Retrieve total expenses for today in MYT
//     const totalExpenses = await Expenses.findAll({
//       attributes: [
//         [Sequelize.fn("SUM", Sequelize.col("expensesAmount")), "totalExpenses"],
//       ],
//       where: {
//         date: {
//           [Op.gte]: startOfDay,
//           [Op.lte]: endOfDay,
//         },
//       },
//       raw: true,
//     });

//     // Calculate total sales from the beginning of the month to today
//     const totalSalesMonth = await SalesInfo.findAll({
//       attributes: [
//         [Sequelize.fn("SUM", Sequelize.col("totalSalesValue")), "totalSalesValue"],
//       ],
//       where: {
//         salesDate: {
//           [Op.gte]: startOfMonth,
//           [Op.lte]: endOfDay,
//         },
//       },
//       raw: true,
//     });

//     // Calculate total purchases from the beginning of the month to today
//     const totalPurchasesMonth = await PurchaseInfo.findAll({
//       attributes: [
//         [Sequelize.fn("SUM", Sequelize.col("totalPurchasePrice")), "totalPurchasePrice"],
//       ],
//       where: {
//         purchaseDate: {
//           [Op.gte]: startOfMonth,
//           [Op.lte]: endOfDay,
//         },
//       },
//       raw: true,
//     });

//     const totalExpensesMonth = await Expenses.findAll({
//       attributes: [
//         [Sequelize.fn("SUM", Sequelize.col("expensesAmount")), "totalExpenses"],
//       ],
//       where: {
//         date: {
//           [Op.gte]: startOfMonth,
//           [Op.lte]: endOfDay,
//         },
//       },
//       raw: true,
//     });

//     // Calculate daily profit/loss (Sales - Purchases - Expenses)
//     const salesTotal = totalSales[0]?.totalSalesValue || 0;
//     const purchaseTotal = totalPurchases[0]?.totalPurchasePrice || 0;
//     const expenseTotal = totalExpenses[0]?.totalExpenses || 0;
//     const dailyProfitLoss = parseFloat(salesTotal) - parseFloat(purchaseTotal) - parseFloat(expenseTotal);

//     // Calculate profit/loss from the start of the month to today
//     const salesMonth = totalSalesMonth[0]?.totalSalesValue || 0;
//     const purchasesMonth = totalPurchasesMonth[0]?.totalPurchasePrice || 0;
//     const expenseMonth = totalExpensesMonth[0]?.totalExpenses || 0;
//     const profitLossMonth = parseFloat(salesMonth) - parseFloat(purchasesMonth) - parseFloat(expenseMonth);

//     return {
//       success: true,
//       message: "Daily and monthly profit/loss calculated successfully",
//       data: {
//         dailyProfitLoss,
//         totalDailySales: salesTotal,
//         totalDailyPurchases: purchaseTotal,
//         profitLossMonth,
//       },
//     };
//   } catch (error) {
//     console.error("Error calculating daily profit/loss:", error.message);
//     return {
//       success: false,
//       message: "Failed to calculate daily and monthly profit/loss",
//       error: error.message,
//     };
//   }
// };

// // Placeholder for the gross profit/loss calculation
// export const calculateGrossProfitLosss = async () => {};
