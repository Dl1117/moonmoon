/*
  Warnings:

  - You are about to alter the column `stockQuantity` on the `DurianVariety` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.

*/
-- AlterTable
ALTER TABLE `DurianVariety` MODIFY `stockQuantity` INTEGER NOT NULL;
