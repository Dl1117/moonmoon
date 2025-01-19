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
export const getSuppliersWithLorries = async (page, size, month, week) => {
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
        date: {
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
        date: {
          gte: new Date(currentYear, filterMonth, 1), // Start of the month
          lt: new Date(currentYear, filterMonth + 1, 1), // Start of the next month
        },
      };
    }
  }
  const suppliers = await prisma.supplier.findMany({
    ...pagination,
    where: {
      ...dateFilter,
    },
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



//BELOW ARE FOR NON-PRISMA
// services/supplierService.js
// import { Supplier, SupplierLorry } from "../../config/database.js";
// // 1. Create Supplier with Optional Lorry/Lorries
// export const createSuppliersWithLorries = async (suppliers) => {
//   const supplierCreations = suppliers.map(async ({ companyName, contact, lorries }) => {
//     const supplier = await Supplier.create(
//       {
//         companyName,
//         contact,
//         supplierLorries: lorries?.map((lorry) => ({ lorryPlateNumber: lorry.lorryPlateNumber })) || [],
//       },
//       {
//         include: [SupplierLorry],
//       }
//     );
//     return supplier;
//   });

//   return await Promise.all(supplierCreations);
// };

// // 2. Retrieve Supplier(s) with Lorry/Lorries
// export const getSuppliersWithLorries = async (page, size, month, week) => {
//   const pagination = {};

//   if (page !== null && size !== null) {
//     const offset = page * size;
//     pagination.offset = offset;
//     pagination.limit = size;
//   }

//   let dateFilter = {};

//   if (month || week) {
//     const currentYear = new Date().getFullYear();
//     const filterMonth = month ? month - 1 : new Date().getMonth(); // Default to current month if month is not provided

//     if (week) {
//       // Calculate week range within the specified or default month
//       const firstDayOfMonth = new Date(currentYear, filterMonth, 1);
//       const weekStart = new Date(
//         firstDayOfMonth.getFullYear(),
//         firstDayOfMonth.getMonth(),
//         (week - 1) * 7 + 1
//       );
//       const weekEnd = new Date(
//         firstDayOfMonth.getFullYear(),
//         firstDayOfMonth.getMonth(),
//         week * 7 + 1
//       );

//       // Ensure the week range is within the month bounds
//       dateFilter.date = {
//         [Op.gte]: weekStart,
//         [Op.lt]: new Date(
//           Math.min(
//             weekEnd.getTime(),
//             new Date(currentYear, filterMonth + 1, 1).getTime() // Start of the next month
//           )
//         ),
//       };
//     } else {
//       // If only month is provided, filter the entire month
//       dateFilter.date = {
//         [Op.gte]: new Date(currentYear, filterMonth, 1), // Start of the month
//         [Op.lt]: new Date(currentYear, filterMonth + 1, 1), // Start of the next month
//       };
//     }
//   }

//   const suppliers = await Supplier.findAll({
//     ...pagination,
//     where: dateFilter,
//     include: [
//       {
//         model: SupplierLorry,
//         as: "supplierLorries",
//       },
//     ],
//   });

//   const totalRecords = await Supplier.count();
//   const totalPages = size ? Math.ceil(totalRecords / size) : 1;

//   return {
//     supplier: suppliers,
//     pagination: {
//       totalRecords,
//       page: page !== null ? page : null,
//       size: size || null,
//       totalPages: totalPages || null,
//     },
//   };
// };

// export const getSupplierWithLorriesById = async (supplierId) => {
//   return await Supplier.findByPk(supplierId, {
//     include: [
//       {
//         model: SupplierLorry,
//         as: "supplierLorries",
//       },
//     ],
//   });
// };
