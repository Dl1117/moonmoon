import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs"; // Use bcryptjs instead
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;

// export const createAdminAcc = async ({ username, loginId, password }) => {
//   // Encrypt the provided password
//   const encryptedPassword = await bcrypt.hash(password, 10);

//   // Create the new admin record
//   return prisma.admin.create({
//     data: {
//       username,
//       loginId,
//       password: encryptedPassword,
//       userType: 'ADMIN'  // Assuming `userType` is an enum with a value 'ADMIN'
//     }
//   });
// };
export const createAdminAcc = async ({ username, loginId, password }) => {
  // Check if the required fields are provided
  if (!username || !loginId || !password) {
    throw new Error("Username, loginId, and password are required.");
  }

  try {
    // Encrypt the provided password
    const encryptedPassword = await bcrypt.hash(password, 10);

    // Check if the admin already exists based on loginId (you can modify this as needed)
    const existingAdmin = await prisma.admin.findUnique({
      where: { loginId },
    });

    if (existingAdmin) {
      throw new Error("An admin with this login ID already exists.");
    }

    // Create the new admin record
    const newAdmin = await prisma.admin.create({
      data: {
        username,
        loginId,
        password: encryptedPassword,
        userType: "ADMIN", // Assuming `userType` is an enum with a value 'ADMIN'
      },
    });

    return { success: true, data: newAdmin };
  } catch (error) {
    // Handle database or other internal errors
    throw new Error(
      error.message || "Internal server error while creating admin account"
    );
  }
};

// Admin Login Authentication
export const adminLoginAuth = async (loginDto) => {
  try {
    const { loginId, password } = loginDto;

    // Find admin by loginId
    const admin = await prisma.admin.findUnique({ where: { loginId } });

    if (!admin) {
      throw new Error("Admin not found");
    }

    // Compare provided password with stored password
    const passwordMatches = await bcrypt.compare(password, admin.password);

    if (!passwordMatches) {
      throw new Error("Incorrect password");
    }

    // Generate JWT token
    const accessToken = jwt.sign(
      { adminId: admin.id, loginId: admin.loginId, role: admin.userType }, // Payload
      JWT_SECRET, // Secret key
      { expiresIn: "1h" } // Token expiration time
    );

    // Optionally, you could also generate a refresh token here if needed
    const refreshToken = jwt.sign(
      { adminId: admin.id, loginId: admin.loginId, role: admin.userType },
      JWT_SECRET,
      { expiresIn: "8h" } // Longer expiration for refresh tokens
    );

    // Save the JWT tokens to the database (AdminJwt model)
    await prisma.adminJwt.upsert({
      where: { adminId: admin.id },
      update: {
        accessToken,
        refreshToken,
        accessTokenExpiryDate: new Date(Date.now() + 3600000), // 1 hour from now
        refreshTokenExpiryDate: new Date(Date.now() + 3600000 * 8), // 7 days from now
      },
      create: {
        adminId: admin.id,
        accessToken,
        refreshToken,
        accessTokenExpiryDate: new Date(Date.now() + 3600000), // 1 hour from now
        refreshTokenExpiryDate: new Date(Date.now() + 3600000 * 8), // 7 days from now
      },
    });

    return { admin, accessToken, refreshToken };
  } catch (error) {
    // Handle errors specifically and provide meaningful error messages
    if (error.message === "Admin not found") {
      throw new Error("Admin not found");
    } else if (error.message === "Incorrect password") {
      throw new Error("Incorrect password");
    } else {
      throw new Error("An error occurred while processing the login request");
    }
  }
};

//SUPERADMIN method
//cancelling sales order
export const superAdminCancellingSalesOrderSrv = async (salesId) => {
  try {
    const result = await prisma.$transaction(async (prisma) => {
      // Check if the sales order exists before updating
      const salesOrder = await prisma.sales.findUnique({
        where: { id: salesId },
      });

      if (!salesOrder) {
        throw new Error("Sales order not found");
      }

      // Update the sales status to CANCELLED within the transaction
      const updatedSalesOrder = await prisma.sales.update({
        where: { id: salesId },
        data: { salesStatus: "CANCELLED" },
      });

      // Return the updated sales order from the transaction
      return updatedSalesOrder;
    });

    // Return the result of the transaction (updated sales order)
    return result;
  } catch (error) {
    // Handle errors (e.g., if the sales order with the provided ID doesn't exist)
    throw new Error(error.message || "Failed to cancel sales order");
  }
};

//cancelling purchase order
export const superAdminCancellingPurchaseOrderSrv = async (purchaseId) => {
  try {
    const result = await prisma.$transaction(async (prisma) => {
      // Check if the purchase order exists before updating
      const purchaseOrder = await prisma.purchase.findUnique({
        where: { id: purchaseId },
      });

      if (!purchaseOrder) {
        throw new Error("Purchase order not found");
      }

      // Update the purchase status to CANCELLED within the transaction
      const updatedPurchaseOrder = await prisma.purchase.update({
        where: { id: purchaseId },
        data: { purchaseStatus: "CANCELLED" },
      });

      // Return the updated purchase order from the transaction
      return updatedPurchaseOrder;
    });

    // Return the result of the transaction (updated purchase order)
    return result;
  } catch (error) {
    // Handle errors (e.g., if the purchase order with the provided ID doesn't exist)
    throw new Error(error.message || "Failed to cancel purchase order");
  }
};

//normal admin salary advanced request
// export const requestAdvancedSalarySrv = async (adminInfo) => {
//   const { adminId, salaryAdvancedAmount } = adminInfo;

//   try {
//       // Execute the whole process as a transaction
//       const result = await prisma.$transaction(async (prisma) => {
//           // 1. Retrieve the Admin's current outstanding amount
//           const admin = await prisma.admin.findUnique({
//               where: {
//                   id: adminId,
//               },
//               select: {
//                   id: true,
//                   salary: true, // Assuming there's an 'outstandingAmount' field
//               },
//           });

//           if (!admin) {
//               throw new Error('Admin not found');
//           }

//           // 2. Calculate the updated outstanding amount
//           const salary = parseFloat(admin.salary || '0');
//           const advanceAmount = parseFloat(salaryAdvancedAmount);
//           const updatedOutstandingAmount = advanceAmount - salary;

//           // 3. Insert the new advanced salary request into the SalaryAdvanced table
//           const newSalaryAdvance = await prisma.salaryAdvanced.create({
//               data: {
//                   adminId: adminId,
//                   salaryAdvancedAmount: salaryAdvancedAmount,
//                   outstandingAmount: updatedOutstandingAmount.toString(),
//                   requestDate: new Date(),
//               },
//           });

//           // Return the new salary advance record and updated admin data
//           return {
//               salaryAdvance: newSalaryAdvance,
//           };
//       });

//       // If the transaction completes successfully
//       return {
//           success: true,
//           message: 'Salary advanced request processed successfully',
//           data: result,
//       };
//   } catch (error) {
//       // If any operation within the transaction fails, the whole transaction is rolled back
//       console.error('Error processing salary advanced request:', error);
//       return {
//           success: false,
//           message: 'Failed to process salary advanced request',
//           error: error.message,
//       };
//   }
// };
export const requestAdvancedSalarySrv = async (adminInfo) => {
  const { adminId, salaryAdvancedAmount } = adminInfo;

  // Input validation before proceeding with the transaction
  if (!adminId || !salaryAdvancedAmount) {
    return {
      success: false,
      message: "Admin ID and salary advanced amount are required.",
      data: null,
    };
  }

  try {
    // Execute the whole process as a transaction
    const result = await prisma.$transaction(async (prisma) => {
      // 1. Retrieve the Admin's current salary
      const admin = await prisma.admin.findUnique({
        where: {
          id: adminId,
        },
        select: {
          id: true,
          salary: true, // Assuming the admin object has a salary field
        },
      });

      if (!admin) {
        throw new Error("Admin not found");
      }

      // 2. Validate salaryAdvancedAmount
      if (isNaN(salaryAdvancedAmount) || salaryAdvancedAmount <= 0) {
        throw new Error("Invalid salary advanced amount provided");
      }

      // 3. Calculate the updated outstanding amount
      const salary = parseFloat(admin.salary || "0");
      const advanceAmount = parseFloat(salaryAdvancedAmount);
      const updatedOutstandingAmount = advanceAmount - salary;

      // 4. Insert the new advanced salary request into the SalaryAdvanced table
      const newSalaryAdvance = await prisma.salaryAdvanced.create({
        data: {
          adminId: adminId,
          salaryAdvancedAmount: salaryAdvancedAmount,
          outstandingAmount: updatedOutstandingAmount,
          requestDate: new Date(),
        },
      });

      //5. Record advanced salary into expenses
      await prisma.expenses.create({
        data: {
          expensesAmount: salaryAdvancedAmount,
          expensesType: "SALARY",
          date: new Date(),
        },
      });

      // Return the new salary advance record and updated admin data
      return {
        salaryAdvance: newSalaryAdvance,
      };
    });

    // If the transaction completes successfully
    return {
      success: true,
      message: "Salary advanced request processed successfully",
      data: result, // Result directly from the transaction (no nesting)
    };
  } catch (error) {
    // Check for specific errors and return corresponding messages
    if (error.message === "Admin not found") {
      return {
        success: false,
        message: "The admin with the provided ID does not exist.",
        data: null,
      };
    }

    if (error.message === "Invalid salary advanced amount provided") {
      return {
        success: false,
        message: "Please provide a valid salary advance amount greater than 0.",
        data: null,
      };
    }

    // Log the error for debugging
    console.error("Error processing salary advanced request:", error);

    // Generic error handling
    return {
      success: false,
      message:
        error.message ||
        "Failed to process salary advance request due to an unknown error.",
      data: null,
    };
  }
};
