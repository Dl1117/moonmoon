import { PrismaClient } from "@prisma/client";
import { DateTime } from "luxon";

const prisma = new PrismaClient();

export const createPurchaseOrder = async (purchaseInfos, invoiceImages) => {
  try {
    console.log("Reading purchase infos...", purchaseInfos);

    // Extract purchase details from the single object
    const {
      purchaseName,
      supplierId,
      supplierLorryId,
      purchaseStatus,
      purchaseInfo,
    } = purchaseInfos;

    // Handle multiple invoice images (if provided)
    const invoiceImageData = invoiceImages
      ?.map((image) => image?.buffer)
      .filter(Boolean); // Ensure only valid image buffers are processed

    return await prisma.$transaction([
      prisma.purchase.create({
        data: {
          purchaseName,
          supplierId,
          supplierLorryId,
          purchaseStatus,
          purchaseDate: new Date(),
          // Create purchase info records
          purchaseInfos: {
            create: purchaseInfo.map(
              ({
                durianVarietyId,
                pricePerKg,
                kgPurchased,
                totalPurchasePrice,
                basket,
              }) => ({
                durianVarietyId,
                pricePerKg,
                kgPurchased,
                totalPurchasePrice: parseFloat(totalPurchasePrice), // Convert string to float
                bucket: {
                  create: basket.map(({ kg, salesValue }) => ({
                    kg,
                    //kgSales: salesValue, // Calculate sales kg for each bucket
                  })),
                },
              })
            ),
          },
          // Conditionally create purchase invoices if multiple images are provided
          ...(invoiceImageData.length > 0 && {
            purchaseInvoices: {
              create: invoiceImageData.map((imageBuffer) => ({
                image: imageBuffer,
              })),
            },
          }),
        },
        include: {
          purchaseInfos: {
            include: {
              bucket: true,
            },
          },
          purchaseInvoices: true, // Include invoices in the result
        },
      }),
    ]);
  } catch (error) {
    console.error("Error in createSalesOrder service:", error);
    throw new Error("Failed to create purchase order: " + error.message);
  }
};

export const createPurchaseInvoice = async (purchaseOrderIdInvoices) => {
  try {
    if (
      !Array.isArray(purchaseOrderIdInvoices) ||
      purchaseOrderIdInvoices.length === 0
    ) {
      throw new Error(
        "Invalid invoice data. Ensure at least one invoice is provided."
      );
    }
    console.log("reading purchaseOrderIdInvoices...", purchaseOrderIdInvoices);
    const results = await Promise.all(
      purchaseOrderIdInvoices.map((image) =>
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
    console.error("Error in createPurchaseInvoice service:", error);
    throw new Error("Failed to create purchase invoices");
  }
};

// export const retrieveAllPurchases = async () => {
//           return await prisma.purchase.findMany(
//             {include: {
//               purchaseInvoices: true
//             }}
//           );
// }
export const retrieveAllPurchases = async (page, size, month, week) => {
  try {
    const pagination = {};

    if (page !== null && size !== null) {
      const offset = page * size;
      pagination.skip = offset;
      pagination.take = size;
    }
    // Date filters for month and week
    // Date filters for month and week
    let dateFilter = null;

    if (month || week) {
      const currentYear = new Date().getFullYear();
      const filterMonth = month ? month - 1 : new Date().getMonth(); // Default to current month if month is not provided

      if (week) {
        // Calculate week range within the specified or default month
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

        // Ensure the week range is within the month bounds
        dateFilter = {
          purchaseDate: {
            gte: weekStart,
            lt: new Date(
              Math.min(
                weekEnd.getTime(),
                new Date(currentYear, filterMonth + 1, 1).getTime() // Start of the next month
              )
            ), // Convert timestamp to Date
          },
        };
      } else {
        // If only month is provided, filter the entire month
        dateFilter = {
          purchaseDate: {
            gte: new Date(currentYear, filterMonth, 1), // Start of the month
            lt: new Date(currentYear, filterMonth + 1, 1), // Start of the next month
          },
        };
      }
    }
    const purchases = await prisma.purchase.findMany({
      ...pagination,
      where: {
        ...dateFilter,
      },
      orderBy: {
        purchaseDate: "asc", // Sort in ascending order
      },
      include: {
        purchaseInfos: {
          include: {
            durianVariety: true,
            bucket: true,
          },
        },
        purchaseInvoices: true,
        supplier: true,
        supplierLorry: true,
      },
    });

    const totalRecords = purchases.length;

    // Convert each image buffer to Base64 for each invoice in each purchase
    const formattedPurchases = purchases.map(
      ({ supplier, supplierLorry, ...purchase }) => ({
        ...purchase,
        supplierInfo: {
          supplierName: supplier.companyName,
          contact: supplier.contact,
          lorryPlateNumber: supplierLorry.lorryPlateNumber,
        },
        purchaseInfos: purchase.purchaseInfos.map((info) => ({
          ...info,
          durianCode: info.durianVariety?.durianCode, // Extract durianCode
          durianVariety: undefined, // Remove the durianVariety object
        })),
        purchaseInvoices: purchase.purchaseInvoices.map((invoice) => ({
          ...invoice,
          image: invoice.image.toString("base64"), // Convert bytes to Base64 string
        })),
      })
    );

    return {
      success: true,
      data: {
        purchase: formattedPurchases,
        pagination: {
          totalRecords,
          page: page !== null ? page : null,
          size: size || null,
        },
      },
    };
  } catch (error) {
    console.error("Error in retrieveAllPurchases:", error);
    return {
      success: false,
      message: "An error occurred while retrieving purchases",
      errorDetails: error.message,
    };
  }
};

//SUPERADMIN method
export const retrieveOutstandingPurchasesSrv = async (
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
      const filterMonth = month ? month - 1 : new Date().getMonth(); // Default to current month if month is not provided

      if (week) {
        // Calculate week range within the specified or default month
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

        // Ensure the week range is within the month bounds
        dateFilter = {
          purchaseDate: {
            gte: weekStart,
            lt: new Date(
              Math.min(
                weekEnd.getTime(),
                new Date(currentYear, filterMonth + 1, 1).getTime() // Start of the next month
              )
            ), // Convert timestamp to Date
          },
        };
      } else {
        // If only month is provided, filter the entire month
        dateFilter = {
          purchaseDate: {
            gte: new Date(currentYear, filterMonth, 1), // Start of the month
            lt: new Date(currentYear, filterMonth + 1, 1), // Start of the next month
          },
        };
      }
    }

    const outStandingPurchases = await prisma.purchase.findMany({
      ...pagination,
      where: {
        purchaseStatus: "OUTSTANDING",
        ...dateFilter,
      },
      orderBy: {
        purchaseDate: "asc", // Sort in ascending order
      },
      include: {
        purchaseInfos: {
          include: {
            bucket: true,
          },
        },
        purchaseInvoices: true,
      },
    });
    const totalRecords = outStandingPurchases.length;

    // Format the response object to include relevant details
    const formattedPurchases = outStandingPurchases.map((purchase) => ({
      id: purchase.id,
      companyName: purchase.companyName,
      purchaseName: purchase.purchaseName,
      purchaseStatus: purchase.purchaseStatus,
      purchaseDate: purchase.purchaseDate,
      purchaseInvoices: purchase.purchaseInvoices.map((invoice) => ({
        id: invoice.id,
        image: invoice.image ? invoice.image.toString("base64") : null, // Convert image to base64 if needed
        purchaseId: invoice.purchaseId,
      })),
      purchaseInfos: purchase.purchaseInfos.map((info) => ({
        id: info.id,
        pricePerKg: info.pricePerKg,
        kgPurchase: info.kgPurchased,
        totalPurchasePrice: info.totalPurchasePrice,
        durianVarietyId: info.durianVarietyId,
        purchaeId: info.purchaseId,
        bucket: info.bucket.map((bucket) => ({
          id: bucket.id,
          kg: bucket.kg,
          //kgSales: bucket.kgSales,
        })),
      })),
    }));

    // Return the formatted response object
    return {
      success: true,
      data: {
        outStandingPurchase: formattedPurchases,
        pagination: {
          totalRecords,
          page: page !== null ? page : null,
          size: size || null,
        },
      },
    };
  } catch (error) {
    console.error("Error in retrieveOutstandingPurchasesSrv:", error);
    return {
      success: false,
      message: "An error occurred while retrieving outstanding purchases",
      errorDetails: error.message,
    };
  }
};

export const changePurchaseInfoInformationSrv = async (purchaseDetails) => {
  console.log("Reading purchase details...", purchaseDetails);
  const {
    purchaseId,
    purchaseStatus,
    purchaseName,
    kgPurchased,
    totalPurchasePrice,
    purchaseInfo,
  } = purchaseDetails;

  return await prisma.$transaction(
    async (tx) => {
      const updateResults = [];

      // Ensure purchaseId is valid
      if (!purchaseId) {
        throw new Error("Purchase ID is missing or invalid.");
      }

      // Update main purchase information (purchaseStatus, kgPurchased, totalPurchasePrice)
      const mainUpdateData = {};
      if (purchaseStatus !== null && purchaseStatus !== "") {
        mainUpdateData.purchaseStatus = purchaseStatus;
      }

      if (purchaseName !== null && purchaseName !== "") {
        mainUpdateData.purchaseName = purchaseName;
      }
      // if (kgPurchased !== null && kgPurchased !== "") {
      //   mainUpdateData.kgPurchased = parseFloat(kgPurchased);
      // }
      // if (totalPurchasePrice !== null && totalPurchasePrice !== "") {
      //   mainUpdateData.totalPurchasePrice = parseFloat(totalPurchasePrice);
      // }

      if (Object.keys(mainUpdateData).length > 0) {
        try {
          await tx.purchase.update({
            where: {
              id: purchaseId,
            },
            data: mainUpdateData,
          });
          updateResults.push({
            success: true,
            message: "Main purchase information updated successfully",
            updatedFields: mainUpdateData,
          });
        } catch (error) {
          throw new Error(
            "Failed to update main purchase information: " + error.message
          );
        }
      }

      // Update purchaseInfo array if provided and non-empty
      if (Array.isArray(purchaseInfo) && purchaseInfo.length > 0) {
        for (const info of purchaseInfo) {
          const {
            purchaseInfoId,
            durianVarietyId,
            pricePerKg,
            kgPurchased,
            basket,
            totalPurchasePrice,
          } = info;
          const dataToUpdate = {};

          if (
            pricePerKg !== undefined &&
            pricePerKg !== null &&
            pricePerKg !== ""
          ) {
            dataToUpdate.pricePerKg = pricePerKg.toString();
          }
          if (
            kgPurchased !== undefined &&
            kgPurchased !== null &&
            kgPurchased !== ""
          ) {
            dataToUpdate.kgPurchased = kgPurchased.toString();
          }
          if (
            totalPurchasePrice !== undefined &&
            totalPurchasePrice !== null &&
            totalPurchasePrice !== ""
          ) {
            dataToUpdate.totalPurchasePrice = parseFloat(totalPurchasePrice);
          }
          if (
            durianVarietyId !== undefined &&
            durianVarietyId !== null &&
            durianVarietyId !== ""
          ) {
            dataToUpdate.durianVarietyId = durianVarietyId;
          }

          console.log(
            "Reading data to update for purchaseInfo...",
            dataToUpdate
          );

          if (Object.keys(dataToUpdate).length > 0) {
            try {
              await tx.purchaseInfo.update({
                where: {
                  id: purchaseInfoId,
                },
                data: dataToUpdate,
              });
              updateResults.push({
                success: true,
                message: "PurchaseInfo updated successfully",
                updatedFields: dataToUpdate,
              });
            } catch (error) {
              throw new Error(
                "Failed to update PurchaseInfo: " + error.message
              );
            }
          } else {
            updateResults.push({
              success: false,
              message:
                "No valid fields provided for update in this purchaseInfo entry",
              purchaseInfo: info,
            });
          }

          if (Array.isArray(basket) && basket.length > 0) {
            for (const item of basket) {
              const { basketId, kg } = item;
              const basketDataToUpdate = {};

              if (kg !== undefined && kg !== null && kg !== "") {
                basketDataToUpdate.kg = parseFloat(kg);
              }

              if (basketId && Object.keys(basketDataToUpdate).length > 0) {
                try {
                  await tx.bucket.update({
                    where: { id: basketId },
                    data: basketDataToUpdate,
                  });
                  updateResults.push({
                    success: true,
                    message: "Basket information updated successfully",
                    updatedFields: basketDataToUpdate,
                  });
                } catch (error) {
                  throw new Error(
                    "Failed to update basket information: " + error.message
                  );
                }
              } else if (!basketId && Object.keys(basketDataToUpdate).length > 0) {
                try {
                  const newBasket = await tx.bucket.create({
                    data: {
                      purchaseInfoId: purchaseInfoId,
                      kg: parseFloat(kg)
                    }
                  });
                  updateResults.push({
                    success: true,
                    message: "New basket created successfully",
                    newBasket,
                  });
                } catch (error) {
                  throw new Error("Failed to create basket: " + error.message);
                }
              }else if (
                basketId &&
                Object.keys(basketDataToUpdate).length <= 0
              ) {
                try {
                  await tx.bucket.delete({
                    where: {
                      id: basketId
                    }
                  });
                  updateResults.push({
                    success: true,
                    message: "Basket information delete successfully",
                    updatedFields: basketDataToUpdate,
                  });
                } catch (error) {
                  throw new Error(
                    "Failed to create basket information: " + error.message
                  );
                }
              }else {
                updateResults.push({
                  success: false,
                  message:
                    "No valid fields provided for update in this basket entry",
                  basket: item,
                });
              }
            }
          }
        }
      }

      return {
        success: updateResults.every((result) => result.success),
        results: updateResults,
      };
    },
    {
      timeout: 10000, // Increase to 10 seconds (adjust as needed)
    }
  );
};

export const retrieveDashboardPurchasesSrv = async () => {
  const today = DateTime.now().setZone("Asia/Kuala_Lumpur");

  console.log("hello world");
  // Define time ranges
  const startOfYear = today.minus({ months: 11 }).startOf("month").toISO();
  const startOfMonth = today.minus({ weeks: 3 }).startOf("week").toISO();
  const startOfWeek = today.minus({ days: 6 }).startOf("day").toISO();

  try {
    // Fetch purchase records
    const purchaseData = await prisma.purchase.findMany({
      where: {
        purchaseDate: { gte: new Date(startOfYear) },
      },
      select: {
        purchaseDate: true,
        purchaseInfos: {
          select: {
            totalPurchasePrice: true,
          },
        },
      },
    });

    console.log(purchaseData);
    // Process purchase data
    const purchasesByMonth = {};
    const purchasesByWeek = {};
    const purchasesByDay = {};

    purchaseData.forEach((purchase) => {
      if (!purchase.purchaseDate) return;

      const date = DateTime.fromJSDate(purchase.purchaseDate).setZone(
        "Asia/Kuala_Lumpur"
      );
      const monthKey = date.toFormat("yyyy-MM");
      const weekKey = date.toFormat("yyyy-'W'WW");
      const dayKey = date.toISODate();

      const totalPurchases = purchase.purchaseInfos.reduce(
        (sum, info) => sum + (info.totalPurchasePrice || 0),
        0
      );

      purchasesByMonth[monthKey] =
        (purchasesByMonth[monthKey] || 0) + totalPurchases;
      purchasesByWeek[weekKey] =
        (purchasesByWeek[weekKey] || 0) + totalPurchases;
      purchasesByDay[dayKey] = (purchasesByDay[dayKey] || 0) + totalPurchases;
    });

    // Structure response
    return {
      success: true,
      message: "Purchase data retrieved successfully",
      data: {
        yearly: Array.from({ length: 12 }, (_, i) => {
          const month = today.minus({ months: i }).toFormat("yyyy-MM");
          return { month, totalPurchases: purchasesByMonth[month] || 0 };
        }).reverse(),

        monthly: Array.from({ length: 4 }, (_, i) => {
          const week = today.minus({ weeks: i }).toFormat("yyyy-'W'WW");
          return { week, totalPurchases: purchasesByWeek[week] || 0 };
        }).reverse(),

        weekly: Array.from({ length: 7 }, (_, i) => {
          const date = today.minus({ days: i }).toISODate();
          return { date, totalPurchases: purchasesByDay[date] || 0 };
        }).reverse(),
      },
    };
  } catch (error) {
    console.error("Error retrieving dashboard purchases:", error.message);
    return {
      success: false,
      message: "Failed to retrieve purchase data",
      error: error.message,
    };
  }
};

//BELOW ARE FOR NON-PRISMA

// import {
//   Purchase,
//   PurchaseInfo,
//   PurchaseInvoice,
//   Bucket,
//   Supplier,
//   SupplierLorry,
// } from "../../config/database.js";

// export const createPurchaseOrder = async (purchaseInfos, invoiceImages) => {
//   try {
//     console.log("Reading purchase infos...", purchaseInfos);

//     const {
//       purchaseName,
//       supplierId,
//       supplierLorryId,
//       purchaseStatus,
//       purchaseInfo,
//     } = purchaseInfos;

//     const invoiceImageData = invoiceImages
//       ?.map((image) => image?.buffer)
//       .filter(Boolean);

//     return await sequelize.transaction(async (t) => {
//       const purchase = await Purchase.create(
//         {
//           purchaseName,
//           supplierId,
//           supplierLorryId,
//           purchaseStatus,
//           purchaseDate: new Date(),
//           purchaseInfos: purchaseInfo.map(
//             ({
//               durianVarietyId,
//               pricePerKg,
//               kgPurchased,
//               totalPurchasePrice,
//               basket,
//             }) => ({
//               durianVarietyId,
//               pricePerKg,
//               kgPurchased,
//               totalPurchasePrice: parseFloat(totalPurchasePrice),
//               buckets: basket.map(({ kg, salesValue }) => ({
//                 kg,
//               })),
//             })
//           ),
//           purchaseInvoices: invoiceImageData.map((imageBuffer) => ({
//             image: imageBuffer,
//           })),
//         },
//         {
//           include: [
//             {
//               model: PurchaseInfo,
//               include: [Bucket],
//             },
//             {
//               model: PurchaseInvoice,
//             },
//           ],
//           transaction: t,
//         }
//       );
//       return purchase;
//     });
//   } catch (error) {
//     console.error("Error in createPurchaseOrder service:", error);
//     throw new Error("Failed to create purchase order: " + error.message);
//   }
// };

// export const createPurchaseInvoice = async (purchaseOrderIdInvoices) => {
//   try {
//     if (
//       !Array.isArray(purchaseOrderIdInvoices) ||
//       purchaseOrderIdInvoices.length === 0
//     ) {
//       throw new Error(
//         "Invalid invoice data. Ensure at least one invoice is provided."
//       );
//     }
//     console.log("Reading purchaseOrderIdInvoices...", purchaseOrderIdInvoices);

//     const results = await Promise.all(
//       purchaseOrderIdInvoices.map((image) =>
//         PurchaseInvoice.create({
//           purchaseId: image.purchaseId,
//           image: image.image,
//         })
//       )
//     );
//     return results;
//   } catch (error) {
//     console.error("Error in createPurchaseInvoice service:", error);
//     throw new Error("Failed to create purchase invoices");
//   }
// };

// export const retrieveAllPurchases = async (page, size, month, week) => {
//   try {
//     const limit = size || null;
//     const offset = page && size ? page * size : null;

//     let where = {};

//     if (month || week) {
//       const currentYear = new Date().getFullYear();
//       const filterMonth = month ? month - 1 : new Date().getMonth();

//       if (week) {
//         const firstDayOfMonth = new Date(currentYear, filterMonth, 1);
//         const weekStart = new Date(
//           firstDayOfMonth.getFullYear(),
//           firstDayOfMonth.getMonth(),
//           (week - 1) * 7 + 1
//         );
//         const weekEnd = new Date(
//           firstDayOfMonth.getFullYear(),
//           firstDayOfMonth.getMonth(),
//           week * 7 + 1
//         );

//         where.purchaseDate = {
//           [sequelize.Op.gte]: weekStart,
//           [sequelize.Op.lt]: new Date(
//             Math.min(
//               weekEnd.getTime(),
//               new Date(currentYear, filterMonth + 1, 1).getTime()
//             )
//           ),
//         };
//       } else {
//         where.purchaseDate = {
//           [sequelize.Op.gte]: new Date(currentYear, filterMonth, 1),
//           [sequelize.Op.lt]: new Date(currentYear, filterMonth + 1, 1),
//         };
//       }
//     }

//     const purchases = await Purchase.findAndCountAll({
//       where,
//       limit,
//       offset,
//       include: [
//         {
//           model: PurchaseInfo,
//           include: [Bucket],
//         },
//         {
//           model: PurchaseInvoice,
//         },
//         {
//           model: Supplier,
//         },
//         {
//           model: SupplierLorry,
//         },
//       ],
//     });

//     const formattedPurchases = purchases.rows.map(
//       ({ supplier, supplierLorry, ...purchase }) => ({
//         ...purchase.toJSON(),
//         supplierInfo: {
//           supplierName: supplier?.companyName,
//           contact: supplier?.contact,
//           lorryPlateNumber: supplierLorry?.lorryPlateNumber,
//         },
//         purchaseInvoices: purchase.purchaseInvoices.map((invoice) => ({
//           ...invoice.toJSON(),
//           image: invoice.image.toString("base64"),
//         })),
//       })
//     );

//     return {
//       success: true,
//       data: {
//         purchases: formattedPurchases,
//         pagination: {
//           totalRecords: purchases.count,
//           page: page || null,
//           size: size || null,
//           totalPages: size ? Math.ceil(purchases.count / size) : 1,
//         },
//       },
//     };
//   } catch (error) {
//     console.error("Error in retrieveAllPurchases:", error);
//     return {
//       success: false,
//       message: "An error occurred while retrieving purchases",
//       errorDetails: error.message,
//     };
//   }
// };

// // //SUPERADMIN method
// export const retrieveOutstandingPurchasesSrv = async (
//   page,
//   size,
//   month,
//   week
// ) => {
//   try {
//     const pagination = {};

//     if (page !== null && size !== null) {
//       const offset = page * size;
//       pagination.skip = offset;
//       pagination.take = size;
//     }

//     let dateFilter = null;

//     if (month || week) {
//       const currentYear = new Date().getFullYear();
//       const filterMonth = month ? month - 1 : new Date().getMonth(); // Default to current month if month is not provided

//       if (week) {
//         // Calculate week range within the specified or default month
//         const firstDayOfMonth = new Date(currentYear, filterMonth, 1);
//         const weekStart = new Date(
//           firstDayOfMonth.getFullYear(),
//           firstDayOfMonth.getMonth(),
//           (week - 1) * 7 + 1
//         );
//         const weekEnd = new Date(
//           firstDayOfMonth.getFullYear(),
//           firstDayOfMonth.getMonth(),
//           week * 7 + 1
//         );

//         // Ensure the week range is within the month bounds
//         dateFilter = {
//           purchaseDate: {
//             gte: weekStart,
//             lt: new Date(
//               Math.min(
//                 weekEnd.getTime(),
//                 new Date(currentYear, filterMonth + 1, 1).getTime() // Start of the next month
//               )
//             ), // Convert timestamp to Date
//           },
//         };
//       } else {
//         // If only month is provided, filter the entire month
//         dateFilter = {
//           purchaseDate: {
//             gte: new Date(currentYear, filterMonth, 1), // Start of the month
//             lt: new Date(currentYear, filterMonth + 1, 1), // Start of the next month
//           },
//         };
//       }
//     }

//     const outStandingPurchases = await Purchase.findAll({
//       ...pagination,
//       where: {
//         purchaseStatus: "OUTSTANDING",
//         ...dateFilter,
//       },
//       include: {
//         purchaseInfos: {
//           include: {
//             bucket: true,
//           },
//         },
//         purchaseInvoices: true,
//       },
//     });
//     const totalRecords = await Purchase.count({
//       where: {
//         purchaseStatus: "OUTSTANDING",
//       },
//     });
//     const totalPages = size ? Math.ceil(totalRecords / size) : 1;

//     // Format the response object to include relevant details
//     const formattedPurchases = outStandingPurchases.map((purchase) => ({
//       id: purchase.id,
//       companyName: purchase.companyName,
//       purchaseName: purchase.purchaseName,
//       purchaseStatus: purchase.purchaseStatus,
//       purchaseDate: purchase.purchaseDate,
//       purchaseInvoices: purchase.purchaseInvoices.map((invoice) => ({
//         id: invoice.id,
//         image: invoice.image ? invoice.image.toString("base64") : null, // Convert image to base64 if needed
//         purchaseId: invoice.purchaseId,
//       })),
//       purchaseInfos: purchase.purchaseInfos.map((info) => ({
//         id: info.id,
//         pricePerKg: info.pricePerKg,
//         kgPurchase: info.kgPurchased,
//         totalPurchasePrice: info.totalPurchasePrice,
//         durianVarietyId: info.durianVarietyId,
//         purchaeId: info.purchaseId,
//         bucket: info.bucket.map((bucket) => ({
//           id: bucket.id,
//           kg: bucket.kg,
//           //kgSales: bucket.kgSales,
//         })),
//       })),
//     }));

//     // Return the formatted response object
//     return {
//       success: true,
//       data: {
//         outStandingPurchase: formattedPurchases,
//         pagination: {
//           totalRecords,
//           page: page !== null ? page : null,
//           size: size || null,
//           totalPages: totalPages || null,
//         },
//       },
//     };
//   } catch (error) {
//     console.error("Error in retrieveOutstandingPurchasesSrv:", error);
//     return {
//       success: false,
//       message: "An error occurred while retrieving outstanding purchases",
//       errorDetails: error.message,
//     };
//   }
// };

// export const changePurchaseInfoInformationSrv = async (purchaseInfo) => {
//   const { purchaseInfoId, pricePerKg, kgPurchased, totalPurchasePrice } =
//     purchaseInfo;
//   // Validate the input data
//   if (!purchaseInfoId) {
//     return {
//       success: false,
//       message: "PurchaseInfoId is required to update purchase information",
//     };
//   }

//   const dataToUpdate = {};
//   if (pricePerKg !== null && pricePerKg !== "") {
//     dataToUpdate.pricePerKg = pricePerKg;
//   }
//   if (kgPurchased !== null && kgPurchased !== "") {
//     dataToUpdate.kgPurchased = kgPurchased;
//   }
//   if (totalPurchasePrice !== null && totalPurchasePrice !== "") {
//     dataToUpdate.totalPurchasePrice = totalPurchasePrice;
//   }

//   if (Object.keys(dataToUpdate).length === 0) {
//     return {
//       success: false,
//       message: "No valid fields provided for update",
//     };
//   }
//   try {
//     await PurchaseInfo.update({
//       where: {
//         id: purchaseInfoId,
//       },
//       data: dataToUpdate,
//     });
//     return {
//       success: true,
//       message: "Purchase information updated successfully",
//       updatedFields: dataToUpdate,
//     };
//   } catch (error) {
//     return {
//       success: false,
//       message: "Failed to update purchase information due to an error",
//       error: error.message,
//     };
//   }
// };
