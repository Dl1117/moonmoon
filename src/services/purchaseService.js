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






