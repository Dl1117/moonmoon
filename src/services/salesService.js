import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Create sales order with sales info
export const createSalesOrder = async (salesInfos) => {
  return await prisma.$transaction(
    salesInfos.map(({ companyName, salesStatus, salesInfo }) => {
      return prisma.sales.create({
        data: {
          companyName,
          salesStatus,
          salesDate: new Date(),
          salesInfo: {
            create: salesInfo.map(({ durianVarietyId, pricePerKg, kgSales, totalSalesValue }) => ({
              durianVarietyId,
              pricePerKg,
              kgSales,
              totalSalesValue
            }))
          }
        },
        include: {
          salesInfo: true
        }
      });
    })
  );
};

// Create sales invoice
export const createSalesInvoice = async (salesInvoices) => {
  return salesInvoices.map(({ salesId, image }) =>
    prisma.salesInvoice.create({
      data: {
        salesId,
        image
      }
    })
  );
};

// Retrieve all sales
export const retrieveAllSales = async () => {
  return prisma.sales.findMany({
    include: {
      salesInfo: true
    }
  });
};
