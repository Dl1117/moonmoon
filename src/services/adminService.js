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
            { adminId: admin.id, loginId: admin.loginId }, // Payload
            JWT_SECRET, // Secret key
            { expiresIn: '1h' } // Token expiration time
          );

          // Optionally, you could also generate a refresh token here if needed
          const refreshToken = jwt.sign(
            { adminId: admin.id,
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
        