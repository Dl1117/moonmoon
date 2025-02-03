import { PrismaClient } from "@prisma/client";
import { DateTime } from "luxon";

const prisma = new PrismaClient();

// Create sales order with sales info
export const createSalesOrder = async (salesInfos, invoiceImages) => {
  try {
    const { companyName, salesStatus, salesInfo } = salesInfos;

    if (
      !companyName ||
      !salesStatus ||
      !salesInfo ||
      !Array.isArray(salesInfo)
    ) {
      throw new Error(
        "Invalid sales order data. Ensure all fields are provided correctly."
      );
    }
    // Handle multiple invoice images (if provided)
    const invoiceImageData = invoiceImages
      ?.map((image) => image?.buffer)
      .filter(Boolean); // Ensure only valid image buffers are processed

    return await prisma.$transaction([
      prisma.sales.create({
        data: {
          companyName,
          salesStatus,
          salesDate: new Date(),
          salesInfos: {
            create: salesInfo.map(
              ({
                durianVarietyId,
                pricePerKg,
                kgSales,
                totalSalesValue,
                basket,
              }) => ({
                durianVarietyId,
                pricePerKg,
                kgSales,
                totalSalesValue: parseFloat(totalSalesValue),
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
            salesInvoices: {
              create: invoiceImageData.map((imageBuffer) => ({
                image: imageBuffer,
              })),
            },
          }),
        },
        include: {
          salesInfos: {
            include: {
              bucket: true,
            },
          },
          salesInvoices: true,
        },
      }),
    ]);
  } catch (error) {
    console.error("Error in createSalesOrder service:", error);
    throw new Error("Failed to create sales order: " + error.message);
  }
};

// Create sales invoice
export const createSalesInvoice = async (salesOrderIdInvoices) => {
  try {
    console.log("reading purchaseOrderIdInvoices...", salesOrderIdInvoices);
    if (
      !Array.isArray(salesOrderIdInvoices) ||
      salesOrderIdInvoices.length === 0
    ) {
      throw new Error(
        "Invalid invoice data. Ensure at least one invoice is provided."
      );
    }
    const results = await Promise.all(
      salesOrderIdInvoices.map((image) =>
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
    console.error("Error in createPurchaseInvoice service:", error);
    throw new Error("Failed to create sales invoices");
  }
};

// Retrieve all sales
export const retrieveAllSales = async (page, size, month, week) => {
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
          salesDate: {
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
          salesDate: {
            gte: new Date(currentYear, filterMonth, 1), // Start of the month
            lt: new Date(currentYear, filterMonth + 1, 1), // Start of the next month
          },
        };
      }
    }
    const sales = await prisma.sales.findMany({
      ...pagination,
      where: {
        ...dateFilter,
      },
      include: {
        salesInvoices: true,
        salesInfos: {
          include: {
            durianVariety: true,
            bucket: true,
          },
        },
      },
    });

    const totalRecords = await prisma.sales.count();
    const totalPages = size ? Math.ceil(totalRecords / size) : 1;
    console.log("Total records count query executed by Prisma");
    console.log(totalRecords);
    const formattedSales = sales.map((sale) => ({
      ...sale,
      salesInfos: sale.salesInfos.map((info) => ({
        ...info,
        durianCode: info.durianVariety?.durianCode,
        durianVariety: undefined, // Remove durianVariety object
        salesId: undefined, // Remove salesId
        bucket: info.bucket.map((item) => ({
          ...item,
          salesInfoId: undefined, // Remove salesInfoId
          purchaseInfoId: undefined, // Remove purchaseInfoId
        })),
      })),
      salesInvoices: sale.salesInvoices.map((invoice) => ({
        ...invoice,
        image: invoice.image ? invoice.image.toString("base64") : null, // Convert bytes to Base64 string
      })),
    }));

    console.log("page", page);
    return {
      success: true,
      data: {
        sales: formattedSales,
        pagination: {
          totalRecords,
          page: page !== null ? page : null,
          size: size || null,
          totalPages: totalPages || null,
        },
      },
    };
  } catch (error) {
    console.error("Error in retrieveAllSales:", error.message);
    throw new Error("Failed to retrieve all sales. Please try again.");
  }
};

// Retrieve all sales based on year(12month bar)/month(4 week bar)/week (7 day bar)
export const retrieveDashboardSalesSrv = async () => {
  const today = DateTime.now().setZone("Asia/Kuala_Lumpur");

  // Define time ranges
  const startOfYear = today.minus({ months: 11 }).startOf("month").toISO();
  const startOfMonth = today.minus({ weeks: 3 }).startOf("week").toISO();
  const startOfWeek = today.minus({ days: 6 }).startOf("day").toISO();

  try {
    // Fetch all relevant sales records from the database
    const salesData = await prisma.sales.findMany({
      where: {
        salesDate: { gte: new Date(startOfYear) },
      },
      select: {
        salesDate: true,
        salesInfos: {
          select: {
            totalSalesValue: true,
          },
        },
      },
    });

    // Process sales data
    const salesByMonth = {};
    const salesByWeek = {};
    const salesByDay = {};

    salesData.forEach((sale) => {
      if (!sale.salesDate) return;

      const date = DateTime.fromJSDate(sale.salesDate).setZone(
        "Asia/Kuala_Lumpur"
      );
      const monthKey = date.toFormat("yyyy-MM"); // Format: "2024-02"
      const weekKey = date.toFormat("yyyy-'W'WW"); // Format: "2024-W05"
      const dayKey = date.toISODate(); // Format: "2024-02-02"

      const totalSales = sale.salesInfos.reduce(
        (sum, info) => sum + (info.totalSalesValue || 0),
        0
      );

      salesByMonth[monthKey] = (salesByMonth[monthKey] || 0) + totalSales;
      salesByWeek[weekKey] = (salesByWeek[weekKey] || 0) + totalSales;
      salesByDay[dayKey] = (salesByDay[dayKey] || 0) + totalSales;
    });

    // Structure the response
    return {
      success: true,
      message: "Sales data retrieved successfully",
      data: {
        yearly: Array.from({ length: 12 }, (_, i) => {
          const month = today.minus({ months: i }).toFormat("yyyy-MM");
          return { month, totalSales: salesByMonth[month] || 0 };
        }).reverse(),

        monthly: Array.from({ length: 4 }, (_, i) => {
          const week = today.minus({ weeks: i }).toFormat("yyyy-'W'WW");
          return { week, totalSales: salesByWeek[week] || 0 };
        }).reverse(),

        weekly: Array.from({ length: 7 }, (_, i) => {
          const date = today.minus({ days: i }).toISODate();
          return { date, totalSales: salesByDay[date] || 0 };
        }).reverse(),
      },
    };
  } catch (error) {
    console.error("Error retrieving dashboard sales:", error.message);
    return {
      success: false,
      message: "Failed to retrieve sales data",
      error: error.message,
    };
  }
};

//SUPERADMIN method
export const retrieveOutstandingSalesSrv = async (page, size, month, week) => {
  try {
    // Fetch outstanding sales with status "PENDING" and include related invoices and sales info
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
          salesDate: {
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
          salesDate: {
            gte: new Date(currentYear, filterMonth, 1), // Start of the month
            lt: new Date(currentYear, filterMonth + 1, 1), // Start of the next month
          },
        };
      }
    }
    const outstandingSales = await prisma.sales.findMany({
      ...pagination,
      where: {
        salesStatus: "OUTSTANDING",
        ...dateFilter,
      },
      include: {
        salesInvoices: true,
        salesInfos: {
          include: {
            bucket: true,
          },
        },
      },
    });

    const totalRecords = await prisma.sales.count({
      where: {
        salesStatus: "OUTSTANDING",
      },
    });
    const totalPages = size ? Math.ceil(totalRecords / size) : 1;

    console.log("reading outstanding sales...", outstandingSales);
    // Format the response object to include relevant details
    const formattedSales = outstandingSales.map((sale) => ({
      id: sale.id,
      companyName: sale.companyName,
      salesStatus: sale.salesStatus,
      salesDate: sale.salesDate,
      salesInvoices: sale.salesInvoices.map((invoice) => ({
        id: invoice.id,
        image: invoice.image ? invoice.image.toString("base64") : null, // Convert image to base64 if needed
        salesId: invoice.salesId,
      })),
      salesInfos: sale.salesInfos.map((info) => ({
        id: info.id,
        pricePerKg: info.pricePerKg,
        kgSales: info.kgSales,
        totalSalesValue: info.totalSalesValue,
        durianVarietyId: info.durianVarietyId,
        salesId: info.salesId,
        bucket: info.bucket.map((bucket) => ({
          id: bucket.id,
          kg: bucket.kg,
          salesValue: bucket.kgSales,
        })),
      })),
    }));

    //kg sales

    // Return the formatted response object
    return {
      success: true,
      data: {
        outstandingSales: formattedSales,
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
    throw new Error("Failed to retrieve outstanding sales. Please try again.");
  }
};

export const changeSalesInfoInformation = async (salesDetails) => {
  console.log("reading sales details...", salesDetails);
  const { salesId, salesStatus, companyName, salesInfo } = salesDetails;

  return await prisma.$transaction(async (tx) => {
    const updateResults = [];
    // Ensure salesId is valid
    if (!salesId) {
      throw new Error("Sales ID is missing or invalid.");
    }
    // Update main sales information (salesStatus and companyName)
    const mainUpdateData = {};
    if (salesStatus !== null && salesStatus !== "") {
      mainUpdateData.salesStatus = salesStatus;
    }
    if (companyName !== null && companyName !== "") {
      mainUpdateData.companyName = companyName;
    }

    if (Object.keys(mainUpdateData).length > 0) {
      try {
        await tx.sales.update({
          where: {
            id: salesId,
          },
          data: mainUpdateData,
        });
        updateResults.push({
          success: true,
          message: "Main sales information updated successfully",
          updatedFields: mainUpdateData,
        });
      } catch (error) {
        throw new Error(
          "Failed to update main sales information: " + error.message
        );
      }
    }

    // Update salesInfo array if provided and non-empty
    if (Array.isArray(salesInfo) && salesInfo.length > 0) {
      for (const info of salesInfo) {
        const { salesInfoId, pricePerKg, kgSales, durianVarietyId, basket } =
          info;
        const dataToUpdate = {};

        // Calculate totalSalesValue if pricePerKg and kgSales are provided
        if (
          pricePerKg !== undefined &&
          pricePerKg !== null &&
          pricePerKg !== ""
        ) {
          dataToUpdate.pricePerKg = pricePerKg.toString();
        }
        if (kgSales !== undefined && kgSales !== null && kgSales !== "") {
          dataToUpdate.kgSales = kgSales.toString();
        }

        // Calculate totalSalesValue only if both pricePerKg and kgSales are available
        if (dataToUpdate.pricePerKg && dataToUpdate.kgSales) {
          const price = parseFloat(dataToUpdate.pricePerKg);
          const kg = parseFloat(dataToUpdate.kgSales);
          if (!isNaN(price) && !isNaN(kg)) {
            dataToUpdate.totalSalesValue = price * kg;
          }
        }
        if (
          durianVarietyId !== undefined &&
          durianVarietyId !== null &&
          durianVarietyId !== ""
        ) {
          dataToUpdate.durianVarietyId = durianVarietyId;
        }

        console.log("reading data to update...", dataToUpdate);

        if (Object.keys(dataToUpdate).length > 0) {
          try {
            await tx.salesInfo.update({
              where: {
                id: salesInfoId, // Assuming this is the correct ID for each salesInfo entry
              },
              data: dataToUpdate,
            });
            updateResults.push({
              success: true,
              message: "Sales information updated successfully",
              updatedFields: dataToUpdate,
            });
          } catch (error) {
            throw new Error(
              "Failed to update sales information: " + error.message
            );
          }
        } else {
          updateResults.push({
            success: false,
            message: "No valid fields provided for update in this entry",
            salesInfo: info,
          });
        }

        if (Array.isArray(basket) && basket.length > 0) {
          for (const item of basket) {
            const { basketId, kg } = item;
            const basketDataToUpdate = {};

            if (kg !== undefined && kg !== null && kg !== "") {
              basketDataToUpdate.kg = parseFloat(kg);
            }

            if (Object.keys(basketDataToUpdate).length > 0) {
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
            } else {
              updateResults.push({
                success: false,
                message:
                  "No valid fields provided for update in this basket entry",
                basket: item,
              });
            }
          }
        }
        // else if (!Array.isArray(basket)) {
        //   throw new Error("`basket` must be an array if provided");
        // }
      }
    }
    // else if (!Array.isArray(salesInfo)) {
    //   throw new Error("`salesInfo` must be an array if provided");
    // }

    return {
      success: updateResults.every((result) => result.success),
      results: updateResults,
    };
  });
};

//BELOW ARE FOR NON-PRISMA

// import { Sales, SalesInfo, Bucket, SalesInvoice } from "../../config/database.js";
// export const createSalesOrder = async (salesInfos, invoiceImages) => {
//   const transaction = await Sales.sequelize.transaction();
//   try {
//     const { companyName, salesStatus, salesInfo } = salesInfos;

//     if (!companyName || !salesStatus || !salesInfo || !Array.isArray(salesInfo)) {
//       throw new Error(
//         "Invalid sales order data. Ensure all fields are provided correctly."
//       );
//     }

//     const invoiceImageData = invoiceImages
//       ?.map((image) => image?.buffer)
//       .filter(Boolean);

//     const newSales = await Sales.create(
//       {
//         companyName,
//         salesStatus,
//         salesDate: new Date(),
//         SalesInfos: salesInfo.map(
//           ({ durianVarietyId, pricePerKg, kgSales, totalSalesValue, basket }) => ({
//             durianVarietyId,
//             pricePerKg,
//             kgSales,
//             totalSalesValue: parseFloat(totalSalesValue),
//             Buckets: basket.map(({ kg, salesValue }) => ({
//               kg,
//             })),
//           })
//         ),
//         SalesInvoices: invoiceImageData?.map((imageBuffer) => ({
//           image: imageBuffer,
//         })),
//       },
//       {
//         include: [
//           {
//             model: SalesInfo,
//             include: [Bucket],
//           },
//           SalesInvoice,
//         ],
//         transaction,
//       }
//     );

//     await transaction.commit();
//     return newSales;
//   } catch (error) {
//     await transaction.rollback();
//     console.error("Error in createSalesOrder service:", error);
//     throw new Error("Failed to create sales order: " + error.message);
//   }
// };

// export const createSalesInvoice = async (salesOrderIdInvoices) => {
//   try {
//     if (!Array.isArray(salesOrderIdInvoices) || salesOrderIdInvoices.length === 0) {
//       throw new Error(
//         "Invalid invoice data. Ensure at least one invoice is provided."
//       );
//     }

//     const results = await Promise.all(
//       salesOrderIdInvoices.map(({ salesId, image }) =>
//         SalesInvoice.create({
//           salesId,
//           image,
//         })
//       )
//     );
//     return results;
//   } catch (error) {
//     console.error("Error in createSalesInvoice service:", error);
//     throw new Error("Failed to create sales invoices");
//   }
// };

// export const retrieveAllSales = async (page, size, month, week) => {
//   try {
//     const pagination = {};

//     if (page !== null && size !== null) {
//       pagination.offset = page * size;
//       pagination.limit = size;
//     }

//     let dateFilter = {};

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

//         dateFilter.salesDate = {
//           [Op.gte]: weekStart,
//           [Op.lt]: new Date(
//             Math.min(
//               weekEnd.getTime(),
//               new Date(currentYear, filterMonth + 1, 1).getTime()
//             )
//           ),
//         };
//       } else {
//         dateFilter.salesDate = {
//           [Op.gte]: new Date(currentYear, filterMonth, 1),
//           [Op.lt]: new Date(currentYear, filterMonth + 1, 1),
//         };
//       }
//     }

//     const sales = await Sales.findAll({
//       ...pagination,
//       where: dateFilter,
//       include: [
//         {
//           model: SalesInfo,
//           include: [
//             {
//               model: Bucket,
//             },
//           ],
//         },
//         SalesInvoice,
//       ],
//     });

//     const totalRecords = await Sales.count();
//     const totalPages = size ? Math.ceil(totalRecords / size) : 1;

//     const formattedSales = sales.map((sale) => ({
//       ...sale.get(),
//       SalesInfos: sale.SalesInfos.map((info) => ({
//         ...info.get(),
//         Buckets: info.Buckets.map((bucket) => bucket.get()),
//       })),
//       SalesInvoices: sale.SalesInvoices.map((invoice) => ({
//         ...invoice.get(),
//         image: invoice.image.toString("base64"),
//       })),
//     }));

//     return {
//       success: true,
//       data: {
//         sales: formattedSales,
//         pagination: {
//           totalRecords,
//           page: page !== null ? page : null,
//           size: size || null,
//           totalPages: totalPages || null,
//         },
//       },
//     };
//   } catch (error) {
//     console.error("Error in retrieveAllSales:", error.message);
//     throw new Error("Failed to retrieve all sales. Please try again.");
//   }
// };

// export const changeSalesInfoInformation = async (salesDetails) => {
//   console.log("Reading sales details...", salesDetails);
//   const { salesId, salesStatus, companyName, salesInfo } = salesDetails;

//   if (!salesId) {
//     throw new Error("Sales ID is missing or invalid.");
//   }

//   const updateResults = [];

//   // Use a transaction to ensure atomicity
//   return await sequelize.transaction(async (transaction) => {
//     // Update main sales information (salesStatus and companyName)
//     const mainUpdateData = {};
//     if (salesStatus !== null && salesStatus !== "") {
//       mainUpdateData.salesStatus = salesStatus;
//     }
//     if (companyName !== null && companyName !== "") {
//       mainUpdateData.companyName = companyName;
//     }

//     if (Object.keys(mainUpdateData).length > 0) {
//       try {
//         await Sales.update(mainUpdateData, {
//           where: { id: salesId },
//           transaction,
//         });
//         updateResults.push({
//           success: true,
//           message: "Main sales information updated successfully",
//           updatedFields: mainUpdateData,
//         });

//       } catch (error) {
//         throw new Error(
//           "Failed to update main sales information: " + error.message
//         );
//       }
//     }

//     // Update salesInfo array if provided and non-empty
//     if (Array.isArray(salesInfo) && salesInfo.length > 0) {
//       for (const info of salesInfo) {
//         const { salesInfoId, pricePerKg, kgSales, durianVarietyId, basket } = info;
//         const dataToUpdate = {};

//         // Update pricePerKg and kgSales
//         if (pricePerKg !== undefined && pricePerKg !== null && pricePerKg !== "") {
//           dataToUpdate.pricePerKg = pricePerKg.toString();
//         }
//         if (kgSales !== undefined && kgSales !== null && kgSales !== "") {
//           dataToUpdate.kgSales = kgSales.toString();
//         }

//         // Calculate totalSalesValue if both pricePerKg and kgSales are available
//         if (dataToUpdate.pricePerKg && dataToUpdate.kgSales) {
//           const price = parseFloat(dataToUpdate.pricePerKg);
//           const kg = parseFloat(dataToUpdate.kgSales);
//           if (!isNaN(price) && !isNaN(kg)) {
//             dataToUpdate.totalSalesValue = price * kg;
//           }
//         }

//         // Update durianVarietyId
//         if (
//           durianVarietyId !== undefined &&
//           durianVarietyId !== null &&
//           durianVarietyId !== ""
//         ) {
//           dataToUpdate.durianVarietyId = durianVarietyId;
//         }

//         console.log("Reading data to update...", dataToUpdate);

//         if (Object.keys(dataToUpdate).length > 0) {
//           try {
//             await SalesInfo.update(dataToUpdate, {
//               where: { id: salesInfoId }, // Assuming this is the correct ID for each salesInfo entry
//               transaction,
//             });
//             updateResults.push({
//               success: true,
//               message: "Sales information updated successfully",
//               updatedFields: dataToUpdate,
//             });
//           } catch (error) {
//             throw new Error(
//               "Failed to update sales information: " + error.message
//             );
//           }
//         } else {
//           updateResults.push({
//             success: false,
//             message: "No valid fields provided for update in this entry",
//             salesInfo: info,
//           });
//         }

//         // Update basket if provided and non-empty
//         if (Array.isArray(basket) && basket.length > 0) {
//           for (const item of basket) {
//             const { basketId, kg } = item;
//             const basketDataToUpdate = {};

//             if (kg !== undefined && kg !== null && kg !== "") {
//               basketDataToUpdate.kg = kg.toString();
//             }

//             if (Object.keys(basketDataToUpdate).length > 0) {
//               try {
//                 await Bucket.update(basketDataToUpdate, {
//                   where: { id: basketId },
//                   transaction,
//                 });
//                 updateResults.push({
//                   success: true,
//                   message: "Basket information updated successfully",
//                   updatedFields: basketDataToUpdate,
//                 });
//               } catch (error) {
//                 throw new Error(
//                   "Failed to update basket information: " + error.message
//                 );
//               }
//             } else {
//               updateResults.push({
//                 success: false,
//                 message: "No valid fields provided for update in this basket entry",
//                 basket: item,
//               });
//             }
//           }
//         } else if (!Array.isArray(basket)) {
//           throw new Error("`basket` must be an array if provided");
//         }

//       }
//     } else if (!Array.isArray(salesInfo)) {
//       throw new Error("`salesInfo` must be an array if provided");
//     }

//     return {
//       success: updateResults.every((result) => result.success),
//       results: updateResults,
//     };
//   });
// };

// export const retrieveOutstandingSalesSrv = async (page, size, month, week) => {
//   try {
//     // Set up pagination
//     const pagination = {};
//     if (page !== null && size !== null) {
//       const offset = page * size;
//       pagination.offset = offset;
//       pagination.limit = size;
//     }

//     let dateFilter = {};

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
//         dateFilter.salesDate = {
//           [Op.gte]: weekStart,
//           [Op.lt]: new Date(
//             Math.min(
//               weekEnd.getTime(),
//               new Date(currentYear, filterMonth + 1, 1).getTime() // Start of the next month
//             )
//           ),
//         };
//       } else {
//         // If only month is provided, filter the entire month
//         dateFilter.salesDate = {
//           [Op.gte]: new Date(currentYear, filterMonth, 1), // Start of the month
//           [Op.lt]: new Date(currentYear, filterMonth + 1, 1), // Start of the next month
//         };
//       }
//     }

//     // Fetch outstanding sales
//     const outstandingSales = await Sales.findAll({
//       ...pagination,
//       where: {
//         salesStatus: "OUTSTANDING",
//         ...dateFilter,
//       },
//       include: [
//         {
//           model: SalesInvoice,
//           attributes: ["id", "image", "salesId"],
//         },
//         {
//           model: SalesInfo,
//           include: [
//             {
//               model: Bucket,
//               attributes: ["id", "kg", "salesValue"],
//             },
//           ],
//         },
//       ],
//     });

//     // Count total outstanding sales for pagination
//     const totalRecords = await Sales.count({
//       where: {
//         salesStatus: "OUTSTANDING",
//         ...dateFilter,
//       },
//     });
//     const totalPages = size ? Math.ceil(totalRecords / size) : 1;

//     // Format the response
//     const formattedSales = outstandingSales.map((sale) => ({
//       id: sale.id,
//       companyName: sale.companyName,
//       salesStatus: sale.salesStatus,
//       salesDate: sale.salesDate,
//       salesInvoices: sale.salesInvoices.map((invoice) => ({
//         id: invoice.id,
//         image: invoice.image ? invoice.image.toString("base64") : null, // Convert image to base64 if needed
//         salesId: invoice.salesId,
//       })),
//       salesInfos: sale.salesInfos.map((info) => ({
//         id: info.id,
//         pricePerKg: info.pricePerKg,
//         kgSales: info.kgSales,
//         totalSalesValue: info.totalSalesValue,
//         durianVarietyId: info.durianVarietyId,
//         salesId: info.salesId,
//         bucket: info.bucket.map((bucket) => ({
//           id: bucket.id,
//           kg: bucket.kg,
//           salesValue: bucket.salesValue,
//         })),
//       })),
//     }));

//     // Return the formatted response object
//     return {
//       success: true,
//       data: {
//         outstandingSales: formattedSales,
//         pagination: {
//           totalRecords,
//           page: page !== null ? page : null,
//           size: size || null,
//           totalPages: totalPages || null,
//         },
//       },
//     };
//   } catch (error) {
//     console.error("Error in retrieveOutstandingSalesSrv:", error.message);
//     throw new Error("Failed to retrieve outstanding sales. Please try again.");
//   }
// };
