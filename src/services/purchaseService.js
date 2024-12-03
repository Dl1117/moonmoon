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
              }) => ({
                durianVarietyId,
                pricePerKg,
                kgPurchased,
                totalPurchasePrice: parseFloat(totalPurchasePrice), // Convert string to float
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
          purchaseInfos: true,
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
export const retrieveAllPurchases = async (page, size) => {
  const pagination = {};

  if (page !== null && size !== null) {
    const offset = page * size;
    pagination.skip = offset;
    pagination.take = size;
  }
  const purchases = await prisma.purchase.findMany({
    ...pagination,
    include: {
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
      purchaseInvoices: purchase.purchaseInvoices.map((invoice) => ({
        ...invoice,
        image: invoice.image.toString("base64"), // Convert bytes to Base64 string
      })),
    })
  );

  return {
    purchase: formattedPurchases,
    pagination: {
      totalRecords,
      page: page !== null ? page : null,
      size: size || null,
      totalPages: totalPages || null,
    },
  };
};

//SUPERADMIN method
export const retrieveOutstandingPurchasesSrv = async () => {
  try {
    const pagination = {};

    if (page !== null && size !== null) {
      const offset = page * size;
      pagination.skip = offset;
      pagination.take = size;
    }

    const outStandingPurchases = await prisma.purchase.findMany({
      ...pagination,
      where: {
        purchaseStatus: "OUTSTANDING",
      },
      include: {
        purchaseInfos: true,
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
        kgPurchase: info.kgPurchase,
        totalPurchasePrice: info.totalPurchasePrice,
        durianVarietyId: info.durianVarietyId,
        purchaeId: info.purchaseId,
      })),
    }));

    // Return the formatted response object
    return {
      success: true,
      outStandingPurchase: formattedPurchases,
      pagination: {
        totalRecords,
        page: page !== null ? page : null,
        size: size || null,
        totalPages: totalPages || null,
      },
      message: "Outstanding purchases retrieved successfully",
    };
  } catch (error) {
    console.error("Error in outstandingSalesSrv:", error.message);
    return {
      success: false,
      message: "Failed to retrieve outstanding purchases",
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
