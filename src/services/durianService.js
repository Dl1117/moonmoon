import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createOrUpdateDurianVariety = async (durianDto) => {
  const { durianCode, stockQuantity: stockQuantityInput } = durianDto;

  // Convert stockQuantity to an integer if it’s a string
  let stockQuantity = parseInt(stockQuantityInput, 10);
  
  return await prisma.$transaction(async (tx) => {
    // Check if the durian code exists
    const durianCodeExist = await tx.durianVariety.findUnique({
      where: { durianCode }
    });

    if (durianCodeExist) {
      // Update stock quantity if durian code exists
      const updatedDurian = await tx.durianVariety.update({
        where: { durianCode },
        data: {
          stockQuantity: durianCodeExist.stockQuantity + stockQuantity
        }
      });

      // Return response with message indicating an update
      return {
        message: 'Durian code exists; stock quantity updated successfully.',
        data: updatedDurian
      };
    } else {
      // Create a new durian record if the code doesn't exist
      const newDurian = await tx.durianVariety.create({
        data: {
          durianCode,
          stockQuantity
        }
      });

      // Return response indicating a new record was created
      return {
        message: 'New durian variety created successfully.',
        data: newDurian
      };
    }
  });
};


export const getDurianVariety = async () => {
          return prisma.durianVariety.findMany();
}
