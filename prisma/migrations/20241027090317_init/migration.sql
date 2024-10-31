-- CreateTable
CREATE TABLE `admin` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NULL,
    `password` VARCHAR(191) NULL,
    `loginId` VARCHAR(191) NULL,
    `userType` ENUM('ADMIN', 'MEMBER') NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin_jwt` (
    `id` VARCHAR(191) NOT NULL,
    `adminId` VARCHAR(191) NOT NULL,
    `accessToken` VARCHAR(191) NULL,
    `refreshToken` VARCHAR(191) NULL,
    `accessTokenExpiryDate` DATETIME(3) NULL,
    `refreshTokenExpiryDate` DATETIME(3) NULL,

    UNIQUE INDEX `admin_jwt_adminId_key`(`adminId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase` (
    `id` VARCHAR(191) NOT NULL,
    `supplierId` VARCHAR(191) NULL,
    `supplierLorryId` VARCHAR(191) NULL,
    `purchaseStatus` ENUM('PENDING', 'COMPLETED', 'CANCELLED') NOT NULL,
    `purchaseDate` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_invoice` (
    `id` VARCHAR(191) NOT NULL,
    `image` LONGBLOB NULL,
    `purchaseId` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_info` (
    `id` VARCHAR(191) NOT NULL,
    `pricePerKg` VARCHAR(191) NULL,
    `kgPurchased` VARCHAR(191) NULL,
    `totalPurchasePrice` VARCHAR(191) NULL,
    `durianVarietyId` VARCHAR(191) NULL,
    `purchaseId` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `supplier` (
    `id` VARCHAR(191) NOT NULL,
    `companyName` VARCHAR(191) NOT NULL,
    `contact` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `supplier_lorry` (
    `id` VARCHAR(191) NOT NULL,
    `lorryPlateNumber` VARCHAR(191) NOT NULL,
    `supplierId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sales` (
    `id` VARCHAR(191) NOT NULL,
    `companyName` VARCHAR(191) NULL,
    `salesStatus` ENUM('PENDING', 'COMPLETED', 'RETURNED') NOT NULL,
    `salesDate` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sales_invoice` (
    `id` VARCHAR(191) NOT NULL,
    `image` LONGBLOB NULL,
    `purchaseId` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sales_info` (
    `id` VARCHAR(191) NOT NULL,
    `pricePerKg` VARCHAR(191) NULL,
    `kgSales` VARCHAR(191) NULL,
    `totalSalesValue` VARCHAR(191) NULL,
    `durianVarietyId` VARCHAR(191) NULL,
    `salesId` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DurianVariety` (
    `id` VARCHAR(191) NOT NULL,
    `durianCode` VARCHAR(191) NOT NULL,
    `stockQuantity` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `DurianVariety_durianCode_key`(`durianCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `admin_jwt` ADD CONSTRAINT `admin_jwt_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_invoice` ADD CONSTRAINT `purchase_invoice_purchaseId_fkey` FOREIGN KEY (`purchaseId`) REFERENCES `purchase`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_info` ADD CONSTRAINT `purchase_info_purchaseId_fkey` FOREIGN KEY (`purchaseId`) REFERENCES `purchase`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_lorry` ADD CONSTRAINT `supplier_lorry_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `supplier`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales_invoice` ADD CONSTRAINT `sales_invoice_purchaseId_fkey` FOREIGN KEY (`purchaseId`) REFERENCES `sales`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales_info` ADD CONSTRAINT `sales_info_salesId_fkey` FOREIGN KEY (`salesId`) REFERENCES `sales`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
