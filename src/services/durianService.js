import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const createOrUpdateDurianVariety = async (durianDto) => {
  //const { durianCode, stockQuantity: stockQuantityInput } = durianDto;

  const { durianCode } = durianDto;

  // Convert stockQuantity to an integer if it’s a string
  //let stockQuantity = parseInt(stockQuantityInput, 10);

  return await prisma.$transaction(async (tx) => {
    // Check if the durian code exists
    const durianCodeExist = await tx.durianVariety.findUnique({
      where: { durianCode },
    });

    if (durianCodeExist) {
      // Update stock quantity if durian code exists
      // const updatedDurian = await tx.durianVariety.update({
      //   where: { durianCode },
      //   data: {
      //     stockQuantity: durianCodeExist.stockQuantity + stockQuantity,
      //   },
      // });

      // Return response with message indicating an update
      return {
        message: "Durian already exist",
        data: updatedDurian,
      };
    } else {
      // Create a new durian record if the code doesn't exist
      const newDurian = await tx.durianVariety.create({
        data: {
          durianCode,
          //stockQuantity,
        },
      });

      // Return response indicating a new record was created
      return {
        message: "New durian variety created successfully.",
        data: newDurian,
      };
    }
  });
};

export const getDurianVariety = async (page, size) => {
  const pagination = {};

  if (page !== null && size !== null) {
    const offset = page * size;
    pagination.skip = offset;
    pagination.take = size;
  }

  const durianVariety = await prisma.durianVariety.findMany({ ...pagination });
  const totalRecords = await prisma.durianVariety.count();
  const totalPages = size ? Math.ceil(totalRecords / size) : 1;

  console.log("durian variety", durianVariety);
  return {
    durianVariety,
    pagination: {
      totalRecords,
      page: page !== null ? page : null,
      size: size || null,
      totalPages: totalPages || null,
    },
  };
};



//BELOW ARE FOR NON PRISMA
// import { DurianVariety } from '../../config/database.js';
// export const createOrUpdateDurianVariety = async (durianDto) => {
//   const { durianCode, stockQuantity: stockQuantityInput } = durianDto;

//   // Convert stockQuantity to an integer if it’s a string
//   let stockQuantity = parseInt(stockQuantityInput, 10);

//   try {
//     // Start transaction
//     const result = await sequelize.transaction(async (t) => {
//       // Check if the durian code exists
//       const durian = await DurianVariety.findOne({
//         where: { durianCode },
//         transaction: t,  // Pass transaction
//       });

//       if (durian) {
//         // Update stock quantity if durian code exists
//         const updatedDurian = await durian.update(
//           {
//             stockQuantity: durian.stockQuantity + stockQuantity,
//           },
//           { transaction: t }
//         );

//         // Return response with message indicating an update
//         return {
//           message: "Durian code exists; stock quantity updated successfully.",
//           data: updatedDurian,
//         };
//       } else {
//         // Create a new durian record if the code doesn't exist
//         const newDurian = await DurianVariety.create(
//           {
//             durianCode,
//             stockQuantity,
//           },
//           { transaction: t }
//         );

//         // Return response indicating a new record was created
//         return {
//           message: "New durian variety created successfully.",
//           data: newDurian,
//         };
//       }
//     });

//     return result;
//   } catch (error) {
//     throw new Error(error.message || "Failed to create or update durian variety.");
//   }
// };

// export const getDurianVariety = async (page, size) => {
//   const pagination = {};

//   if (page !== null && size !== null) {
//     const offset = page * size;
//     pagination.offset = offset;
//     pagination.limit = size;
//   }

//   try {
//     const durianVariety = await DurianVariety.findAll(pagination);
//     const totalRecords = await DurianVariety.count();
//     const totalPages = size ? Math.ceil(totalRecords / size) : 1;

//     return {
//       durianVariety,
//       pagination: {
//         totalRecords,
//         page: page !== null ? page : null,
//         size: size || null,
//         totalPages: totalPages || null,
//       },
//     };
//   } catch (error) {
//     throw new Error(error.message || "Failed to retrieve durian variety.");
//   }
// };
