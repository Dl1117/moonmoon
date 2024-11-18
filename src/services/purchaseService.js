import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createPurchaseOrder = async (purchaseInfos) => {

      console.log("reading purchase infos...", purchaseInfos);
          return await prisma.$transaction(
            purchaseInfos.map(({ supplierId, supplierLorryId, purchaseStatus, purchaseInfo }) => {
              return prisma.purchase.create({
                data: {
                  supplierId,
                  supplierLorryId,
                  purchaseStatus,
                  purchaseDate: new Date(),
                  purchaseInfos: {
                    create: purchaseInfo.map(({ durianVarietyId, pricePerKg, kgPurchased, totalPurchasePrice }) => ({
                      durianVarietyId,
                      pricePerKg,
                      kgPurchased,
                      totalPurchasePrice
                    }))
                  }
                },
                include: {
                  purchaseInfos: true
                }
              });
            })
          );
        };


export const createPurchaseInvoice = async (purchaseOrderIdInvoices) => {
  try {

    console.log("reading purchaseOrderIdInvoices...", purchaseOrderIdInvoices);
    const results = await Promise.all(
      purchaseOrderIdInvoices.map(image =>
         prisma.purchaseInvoice.create({
           data: {
            purchaseId: image.purchaseId,
            image: image.image,
          },
        })
       )
     );
     return results;
  } catch (error) {
     console.error('Error in createPurchaseInvoice service:', error);
     throw new Error('Failed to create purchase invoices');
   }
  };



// export const retrieveAllPurchases = async () => {
//           return await prisma.purchase.findMany(
//             {include: {
//               purchaseInvoices: true
//             }}
//           );
// }
export const retrieveAllPurchases = async () => {
  const purchases = await prisma.purchase.findMany({
    include: {
      purchaseInvoices: true,
    },
  });

  // Convert each image buffer to Base64 for each invoice in each purchase
  return purchases.map(purchase => ({
    ...purchase,
    purchaseInvoices: purchase.purchaseInvoices.map(invoice => ({
      ...invoice,
      image: invoice.image.toString('base64'), // Convert bytes to Base64 string
    })),
  }));
};



//SUPERADMIN method
export const retrieveOutstandingPurchasesSrv = async () => {
  try {
    const outStandingPurchases = await prisma.purchase.findMany({
      where: {
        purchaseStatus: "OUTSTANDING"
      },
      include: {
        purchaseInfos: true,
        purchaseInvoices: true
      }
    })

    // Format the response object to include relevant details
    const formattedPurchases = outStandingPurchases.map(purchase => ({
      id: purchase.id,
      companyName: purchase.companyName,
      purchaseStatus: purchase.purchaseStatus,
      purchaseDate: purchase.purchaseDate,
      purchaseInvoices: purchase.purchaseInvoices.map(invoice => ({
        id: invoice.id,
        image: invoice.image ? invoice.image.toString('base64') : null, // Convert image to base64 if needed
        purchaseId: invoice.purchaseId
      })),
      purchaseInfos: purchase.purchaseInfos.map(info => ({
        id: info.id,
        pricePerKg: info.pricePerKg,
        kgPurchase: info.kgPurchase,
        totalPurchasePrice: info.totalPurchasePrice,
        durianVarietyId: info.durianVarietyId,
        purchaeId: info.purchaseId
      }))
    }));

    // Return the formatted response object
    return {
      success: true,
      data: formattedPurchases,
      message: 'Outstanding purchases retrieved successfully'
    };

  } catch (error) {
        console.error('Error in outstandingSalesSrv:', error.message);
        return {
          success: false,
          message: 'Failed to retrieve outstanding purchases'
        };
      }
}


export const changePurchaseInfoInformationSrv = async (purchaseInfo) => {
  const { purchaseInfoId, pricePerKg, kgPurchased, totalPurchasePrice } = purchaseInfo;


  const dataToUpdate = {};
  if (pricePerKg !== null && pricePerKg !== '') {
    dataToUpdate.pricePerKg = pricePerKg;
  }
  if (kgPurchased !== null && kgPurchased !== '') {
    dataToUpdate.kgPurchased = kgPurchased;
  }
  if (totalPurchasePrice !== null && totalPurchasePrice !== '') {
    dataToUpdate.totalPurchasePrice= totalPurchasePrice;
  }


  if (Object.keys(dataToUpdate).length > 0) {
    try {
      await prisma.purchaseInfo.update({
        where: {
          id: purchaseInfoId,
        },
        data: dataToUpdate,
      });
      return {
        success: true,
        message: 'Purchase information updated successfully',
        updatedFields: dataToUpdate,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update purcahse information',
        error: error.message,
      };
    }
  } else {
    return {
      success: false,
      message: 'No valid fields provided for update',
    };
  }
}






