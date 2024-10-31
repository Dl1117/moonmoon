// services/supplierService.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 1. Create Supplier with Optional Lorry/Lorries
export const createSuppliersWithLorries = async (suppliers) => {
  const supplierCreations = suppliers.map(({ companyName, contact, lorries }) =>
    prisma.supplier.create({
      data: {
        companyName,
        contact,
        supplierLorries: {
          create: lorries?.map(lorry => ({
            lorryPlateNumber: lorry.lorryPlateNumber
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
export const getSuppliersWithLorries = async () => {
  return await prisma.supplier.findMany({
    include: {
      supplierLorries: true
    }
  });
};

export const getSupplierWithLorriesById = async (supplierId) => {
  return await prisma.supplier.findUnique({
    where: {
      id: supplierId
    },
    include: {
      supplierLorries: true
    }
  });
};
