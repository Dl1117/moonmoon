import { PrismaClient } from "@prisma/client";

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

    const totalRecords = await prisma.purchase.count();
    const totalPages = size ? Math.ceil(totalRecords / size) : 1;

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
          totalPages: totalPages || null,
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
      include: {
        purchaseInfos: {
          include: {
            bucket: true,
          },
        },
        purchaseInvoices: true,
      },
    });
    const totalRecords = await prisma.purchase.count({
      where: {
        purchaseStatus: "OUTSTANDING",
      },
    });
    const totalPages = size ? Math.ceil(totalRecords / size) : 1;

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
          totalPages: totalPages || null,
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

export const changePurchaseInfoInformationSrv = async (purchaseInfo) => {
  const { purchaseInfoId, pricePerKg, kgPurchased, totalPurchasePrice } =
    purchaseInfo;
  // Validate the input data
  if (!purchaseInfoId) {
    return {
      success: false,
      message: "PurchaseInfoId is required to update purchase information",
    };
  }

  const dataToUpdate = {};
  if (pricePerKg !== null && pricePerKg !== "") {
    dataToUpdate.pricePerKg = pricePerKg;
  }
  if (kgPurchased !== null && kgPurchased !== "") {
    dataToUpdate.kgPurchased = kgPurchased;
  }
  if (totalPurchasePrice !== null && totalPurchasePrice !== "") {
    dataToUpdate.totalPurchasePrice = totalPurchasePrice;
  }

  if (Object.keys(dataToUpdate).length === 0) {
    return {
      success: false,
      message: "No valid fields provided for update",
    };
  }
  try {
    await prisma.purchaseInfo.update({
      where: {
        id: purchaseInfoId,
      },
      data: dataToUpdate,
    });
    return {
      success: true,
      message: "Purchase information updated successfully",
      updatedFields: dataToUpdate,
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to update purchase information due to an error",
      error: error.message,
    };
  }
};
