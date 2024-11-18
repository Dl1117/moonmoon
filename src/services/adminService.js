import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;

export const createAdminAcc = async ({ username, loginId, password }) => {
  // Encrypt the provided password
  const encryptedPassword = await bcrypt.hash(password, 10);

  // Create the new admin record
  return prisma.admin.create({
    data: {
      username,
      loginId,
      password: encryptedPassword,
      userType: 'ADMIN'  // Assuming `userType` is an enum with a value 'ADMIN'
    }
  });
};


// Admin Login Authentication
export const adminLoginAuth = async (loginDto) => {
          const { loginId, password } = loginDto;
        
          // Find admin by loginId
          const admin = await prisma.admin.findUnique({ where: { loginId } });
        
          if (!admin) {
            throw new Error('Admin not found');
          }
        
          // Compare provided password with stored password
          const passwordMatches = bcrypt.compare(password, admin.password);
        
          if (!passwordMatches) {
            throw new Error('Incorrect password');
          }

          // Generate JWT token
          const accessToken = jwt.sign(
            { adminId: admin.id, loginId: admin.loginId, role: admin.userType }, // Payload
            JWT_SECRET, // Secret key
            { expiresIn: '1h' } // Token expiration time
          );

          // Optionally, you could also generate a refresh token here if needed
          const refreshToken = jwt.sign(
            { adminId: admin.id,
              loginId: admin.loginId,
              role: admin.userType
             },
            JWT_SECRET,
            { expiresIn: '8h' } // Longer expiration for refresh tokens
          );

          // Save the JWT tokens to the database (AdminJwt model)
          await prisma.adminJwt.upsert({
            where: { adminId: admin.id },
            update: {
              accessToken,
              refreshToken,
              accessTokenExpiryDate: new Date(Date.now() + 3600000), // 1 hour from now
              refreshTokenExpiryDate: new Date(Date.now() + 3600000 * 8) // 7 days from now
            },
            create: {
              adminId: admin.id,
              accessToken,
              refreshToken,
              accessTokenExpiryDate: new Date(Date.now() + 3600000), // 1 hour from now
              refreshTokenExpiryDate: new Date(Date.now() + 3600000 * 8) // 7 days from now
            }
          });

          return { admin, accessToken, refreshToken };
                        
                  
};




//SUPERADMIN method
//cancelling sales order
export const superAdminCancellingSalesOrderSrv = async (salesId) => {

 try {
    // Update the sales status to CANCELLED
    const updatedSalesOrder = await prisma.sales.update({
      where: { id: salesId },
      data: { salesStatus: 'CANCELLED' },
    });

    // Return the updated sales order
    return updatedSalesOrder;
  } catch (error) {
    // Handle errors (e.g., if the sales order with the provided ID doesn't exist)
    throw new Error(`Failed to cancel sales order: ${error.message}`);
  }

}


//cancelling purchase order
export const superAdminCancellingPurchaseOrderSrv = async (purchaseId) => {
  try {
    // Update the sales status to CANCELLED
    const updatedSalesOrder = await prisma.purchase.update({
      where: { id: purchaseId },
      data: { purchaseStatus: 'CANCELLED' },
    });

    // Return the updated sales order
    return updatedSalesOrder;
  } catch (error) {
    // Handle errors (e.g., if the sales order with the provided ID doesn't exist)
    throw new Error(`Failed to cancel sales order: ${error.message}`);
  }
}

//normal admin salary advanced request
export const requestAdvancedSalarySrv = async (adminInfo) => {
  const { adminId, salaryAdvancedAmount } = adminInfo;

  try {
      // Execute the whole process as a transaction
      const result = await prisma.$transaction(async (prisma) => {
          // 1. Retrieve the Admin's current outstanding amount
          const admin = await prisma.admin.findUnique({
              where: {
                  id: adminId,
              },
              select: {
                  id: true,
                  salary: true, // Assuming there's an 'outstandingAmount' field
              },
          });

          if (!admin) {
              throw new Error('Admin not found');
          }

          // 2. Calculate the updated outstanding amount
          const salary = parseFloat(admin.salary || '0');
          const advanceAmount = parseFloat(salaryAdvancedAmount);
          const updatedOutstandingAmount = advanceAmount - salary;

          // 3. Insert the new advanced salary request into the SalaryAdvanced table
          const newSalaryAdvance = await prisma.salaryAdvanced.create({
              data: {
                  adminId: adminId,
                  salaryAdvancedAmount: salaryAdvancedAmount,
                  outstandingAmount: updatedOutstandingAmount.toString(),
                  requestDate: new Date(),
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
          message: 'Salary advanced request processed successfully',
          data: result,
      };
  } catch (error) {
      // If any operation within the transaction fails, the whole transaction is rolled back
      console.error('Error processing salary advanced request:', error);
      return {
          success: false,
          message: 'Failed to process salary advanced request',
          error: error.message,
      };
  }
};



        