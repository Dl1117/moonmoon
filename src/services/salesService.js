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
          salesInfos: {
            create: salesInfo.map(({ durianVarietyId, pricePerKg, kgSales, totalSalesValue }) => ({
              durianVarietyId,
              pricePerKg,
              kgSales,
              totalSalesValue
            }))
          }
        },
        include: {
          salesInfos: true
        }
      });
    })
  );
};

// Create sales invoice
export const createSalesInvoice = async (salesOrderIdInvoices) => {
  try {

    console.log("reading purchaseOrderIdInvoices...", salesOrderIdInvoices);
    const results = await Promise.all(
      salesOrderIdInvoices.map(image =>
         prisma.salesInvoice.create({
           data: {
            salesId: image.salesId,
            image: image.image,
          },
        })
       )
     );
     return results;
  } catch (error) {
     console.error('Error in createPurchaseInvoice service:', error);
     throw new Error('Failed to create sales invoices');
   }
};

// Retrieve all sales
export const retrieveAllSales = async () => {
  const sales = await prisma.sales.findMany({
    include: {
      salesInvoices: true,
    },
  });

  // Convert each image buffer to Base64 for each invoice in each purchase
  return sales.map(sale => ({
    ...sale,
    salesInvoices: sale.salesInvoices.map(invoice => ({
      ...invoice,
      image: invoice.image.toString('base64'), // Convert bytes to Base64 string
    })),
  }));
};
