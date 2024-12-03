// services/supplierService.js
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 1. Create Supplier with Optional Lorry/Lorries
export const createSuppliersWithLorries = async (suppliers) => {
  const supplierCreations = suppliers.map(({ companyName, contact, lorries }) =>
    prisma.supplier.create({
      data: {
        companyName,
        contact,
        supplierLorries: {
          create:
            lorries?.map((lorry) => ({
              lorryPlateNumber: lorry.lorryPlateNumber,
            })) || [],
        },
      },
      include: {
        supplierLorries: true,
      },
    })
  );

  return await Promise.all(supplierCreations);
};

// 2. Retrieve Supplier(s) with Lorry/Lorries
export const getSuppliersWithLorries = async (page, size) => {
  const pagination = {};

  if (page !== null && size !== null) {
    const offset = page * size;
    pagination.skip = offset;
    pagination.take = size;
  }
  const suppliers = await prisma.supplier.findMany({
    ...pagination,
    include: {
      supplierLorries: true,
    },
  });

  const totalRecords = await prisma.supplier.count();
  const totalPages = size ? Math.ceil(totalRecords / size) : 1;

  return {
    supplier: suppliers,
    pagination: {
      totalRecords,
      page: page !== null ? page : null,
      size: size || null,
      totalPages: totalPages || null,
    },
  };
};

export const getSupplierWithLorriesById = async (supplierId) => {
  return await prisma.supplier.findUnique({
    where: {
      id: supplierId,
    },
    include: {
      supplierLorries: true,
    },
  });
};
