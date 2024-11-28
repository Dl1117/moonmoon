import { PrismaClient } from '@prisma/client';
import { DateTime } from 'luxon'; // Optional: For time zone handling

const prisma = new PrismaClient();

export const calculateDailyProfitLossSrv = async () => {
  // Get the current time in Malaysia (MYT, UTC+8)
  const today = DateTime.now().setZone('Asia/Kuala_Lumpur'); // Luxon to handle MYT time zone

  // Set the date range to today (start of today to end of today) in MYT
  const startOfDay = today.startOf('day').toISO(); // Start of the day in ISO format (MYT)
  const endOfDay = today.endOf('day').toISO(); // End of the day in ISO format (MYT)
  const startOfMonth = today.startOf('month').toISO();

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
            lte: new Date(endOfDay),   // endOfDay should be a Date object
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
        purchase:{
          purchaseDate: {
            gte: new Date(startOfDay), // Convert startOfDay to Date object
            lte: new Date(endOfDay),    // Convert endOfDay to Date object
          },
        }
       
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
            lte: new Date(endOfDay),    // End of today
          },
        }
       
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
            lte: new Date(endOfDay),    // End of today
          },
        }
       
      },
    });

    // Calculate daily profit/loss (Sales - Purchases)
    const salesTotal = totalSales._sum.totalSalesValue || 0;
    const purchaseTotal = totalPurchases._sum.totalPurchasePrice || 0;
    const dailyProfitLoss = parseFloat(salesTotal) - parseFloat(purchaseTotal);

    // Calculate profit/loss from the start of the month to today
    const salesMonth = totalSalesMonth._sum.totalSalesValue || 0;
    const purchasesMonth = totalPurchasesMonth._sum.totalPurchasePrice || 0;
    const profitLossMonth = parseFloat(salesMonth) - parseFloat(purchasesMonth);

    return {
      success: true,
      message: 'Daily and monthly profit/loss calculated successfully',
      data: {
        dailyProfitLoss,
        totalDailySales: salesTotal,
        totalDailyPurchases: purchaseTotal,
        profitLossMonth,
      },
    };
  } catch (error) {
    console.error('Error calculating daily profit/loss:', error.message);
    return {
      success: false,
      message: 'Failed to calculate daily and monthly profit/lNoss',
      error: error.message,
    };
  }
};



//calculate gross profit/loss need to deduct the expenses
//and also need to deduct the outstanding payment
export const calculateGrossProfitLosss = async () => {

}
