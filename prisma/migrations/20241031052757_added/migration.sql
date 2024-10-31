/*
  Warnings:

  - A unique constraint covering the columns `[loginId]` on the table `admin` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `admin_loginId_key` ON `admin`(`loginId`);
