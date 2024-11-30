import { PrismaClient } from "@prisma/client";

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
              ({ durianVarietyId, pricePerKg, kgSales, totalSalesValue }) => ({
                durianVarietyId,
                pricePerKg,
                kgSales,
                totalSalesValue: parseFloat(totalSalesValue),
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
          salesInfos: true,
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
    if (!Array.isArray(salesOrderIdInvoices) || salesOrderIdInvoices.length === 0) {
      throw new Error("Invalid invoice data. Ensure at least one invoice is provided.");
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
export const retrieveAllSales = async (page, size) => {
  const pagination = {};

  if (page !== null && size !== null) {
    const offset = page * size;
    pagination.skip = offset;
    pagination.take = size;
  }

  const sales = await prisma.sales.findMany({
    ...pagination,
    include: {
      salesInvoices: true,
      salesInfos: {
        include: {
          durianVariety: true,
        },
      },
    },
  });

  const totalRecords = page && size ? await prisma.sales.count() : sales.length;
  const totalPages = page && size ? Math.ceil(totalRecords / size) : 1;

  const formattedSales = sales.map((sale) => ({
    ...sale,
    salesInfos: sale.salesInfos.map((info) => ({
      ...info,
      durianCode: info.durianVariety?.durianCode,
      durianVariety: undefined, // Remove durianVariety object
    })),
    salesInvoices: sale.salesInvoices.map((invoice) => ({
      ...invoice,
      image: invoice.image.toString("base64"), // Convert bytes to Base64 string
    })),
  }));

  console.log("page", page);
  return {
    sales: formattedSales,
    pagination: {
      totalRecords,
      page: page !== null ? page : null,
      size: size || null,
      totalPages: totalPages || null,
    },
  };
};

//SUPERADMIN method
export const retrieveOutstandingSalesSrv = async (page, size) => {
  try {
    // Fetch outstanding sales with status "PENDING" and include related invoices and sales info
    const pagination = {};

    if (page !== null && size !== null) {
      const offset = page * size;
      pagination.skip = offset;
      pagination.take = size;
    }
    const outstandingSales = await prisma.sales.findMany({
      ...pagination,
      where: {
        salesStatus: "OUTSTANDING",
      },
      include: {
        salesInvoices: true,
        salesInfos: true,
      },
    });

    const totalRecords =
      page && size ? await prisma.sales.count() : outstandingSales.length;
    const totalPages = page && size ? Math.ceil(totalRecords / size) : 1;

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
      })),
    }));

    // Return the formatted response object
    return {
      success: true,
      outstandingSales: formattedSales,
      pagination: {
        totalRecords,
        page: page !== null ? page : null,
        size: size || null,
        totalPages: totalPages || null,
      },
      message: "Outstanding sales retrieved successfully",
    };
  } catch (error) {
    console.error("Error in outstandingSalesSrv:", error.message);
    return {
      success: false,
      message: "Failed to retrieve outstanding sales",
    };
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
        const { salesInfoId, pricePerKg, kgSales, durianVarietyId } = info;
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
      }
    } else if (!Array.isArray(salesInfo)) {
      throw new Error("`salesInfo` must be an array if provided");
    }

    return {
      success: updateResults.every((result) => result.success),
      results: updateResults,
    };
  });
};
