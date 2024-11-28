import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Create sales order with sales info
export const createSalesOrder = async (salesInfos, invoiceImages) => {

  const {companyName, salesStatus, salesInfo} = salesInfos;

  // Handle multiple invoice images (if provided)
  const invoiceImageData = invoiceImages?.map((image) => image?.buffer).filter(Boolean); // Ensure only valid image buffers are processed

  return await prisma.$transaction([
    prisma.sales.create({
        data: {
          companyName,
          salesStatus,
          salesDate: new Date(),
          salesInfos: {
            create: salesInfo.map(({ durianVarietyId, pricePerKg, kgSales, totalSalesValue }) => ({
              durianVarietyId,
              pricePerKg,
              kgSales,
              totalSalesValue: parseFloat(totalSalesValue)
            }))
          },
          // Conditionally create purchase invoices if multiple images are provided
        ...(invoiceImageData.length > 0 && {
          salesInvoices: {
            create: invoiceImageData.map((imageBuffer) => ({
              image: imageBuffer,
            })),
          },
        }),
        },
        include: {
          salesInfos: true,
          salesInvoices: true
        }
      })
    ]
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




//SUPERADMIN method
export const retrieveOutstandingSalesSrv = async () => {
  try {
    // Fetch outstanding sales with status "PENDING" and include related invoices and sales info
    const outstandingSales = await prisma.sales.findMany({
      where: {
        salesStatus: "OUTSTANDING"
      },
      include: {
        salesInvoices: true,
        salesInfos: true
      }
    });

    // Format the response object to include relevant details
    const formattedSales = outstandingSales.map(sale => ({
      id: sale.id,
      companyName: sale.companyName,
      salesStatus: sale.salesStatus,
      salesDate: sale.salesDate,
      salesInvoices: sale.salesInvoices.map(invoice => ({
        id: invoice.id,
        image: invoice.image ? invoice.image.toString('base64') : null, // Convert image to base64 if needed
        salesId: invoice.salesId
      })),
      salesInfos: sale.salesInfos.map(info => ({
        id: info.id,
        pricePerKg: info.pricePerKg,
        kgSales: info.kgSales,
        totalSalesValue: info.totalSalesValue,
        durianVarietyId: info.durianVarietyId,
        salesId: info.salesId
      }))
    }));

    // Return the formatted response object
    return {
      success: true,
      data: formattedSales,
      message: 'Outstanding sales retrieved successfully'
    };
  } catch (error) {
    console.error('Error in outstandingSalesSrv:', error.message);
    return {
      success: false,
      message: 'Failed to retrieve outstanding sales'
    };
  }
};


export const changeSalesInfoInformation = async (salesInfo) => {
  const { salesInfoId, pricePerKg, kgSales, totalSalesValue } = salesInfo;

  // Construct the data object conditionally
  const dataToUpdate = {};

  // Only include the fields that are not null or empty
  if (pricePerKg !== null && pricePerKg !== '') {
    dataToUpdate.pricePerKg = pricePerKg;
  }
  if (kgSales !== null && kgSales !== '') {
    dataToUpdate.kgSales = kgSales;
  }
  if (totalSalesValue !== null && totalSalesValue !== '') {
    dataToUpdate.totalSalesValue = totalSalesValue;
  }

  // Proceed with the update only if there's data to update
  if (Object.keys(dataToUpdate).length > 0) {
    try {
      await prisma.salesInfo.update({
        where: {
          id: salesInfoId,
        },
        data: dataToUpdate,
      });
      return {
        success: true,
        message: 'Sales information updated successfully',
        updatedFields: dataToUpdate,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update sales information',
        error: error.message,
      };
    }
  } else {
    return {
      success: false,
      message: 'No valid fields provided for update',
    };
  }
};




