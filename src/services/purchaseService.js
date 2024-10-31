import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createPurchaseOrder = async (purchaseInfos) => {
          return await prisma.$transaction(
            purchaseInfos.map(({ supplierId, supplierLorryId, purchaseStatus, purchaseInfo }) => {
              return prisma.purchase.create({
                data: {
                  supplierId,
                  supplierLorryId,
                  purchaseStatus,
                  purchaseDate: new Date(),
                  purchaseInfo: {
                    create: purchaseInfo.map(({ durianVarietyId, pricePerKg, kgPurchased, totalPurchasePrice }) => ({
                      durianVarietyId,
                      pricePerKg,
                      kgPurchased,
                      totalPurchasePrice
                    }))
                  }
                },
                include: {
                  purchaseInfo: true
                }
              });
            })
          );
        };


export const createPurchaseInvoice = async (purchaseInvoices) => {
          return purchaseInvoices.map(({purchaseId, image}) => 
                    prisma.purchaseInfo.create({
                              data: {
                                        purchaseId, 
                                        image
                              }
                    })
          )
}



export const retrieveAllPurchases = async () => {
          return prisma.purchase.findMany();
}






