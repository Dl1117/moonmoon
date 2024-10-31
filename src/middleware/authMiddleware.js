// src/middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

export const authenticateJWT = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1]; // Extract the token from the header

  console.log("token", token);
  if (!token) {

    console.log("1")
          return res.status(401).json({ 
            message: 'Access denied. No token provided. Please log in to obtain a token.' 
          }); // Send a meaningful error response if no token is provided
        }
    console.log("1")
      
        jwt.verify(token, JWT_SECRET, (err, user) => {
          if (err) {
            return res.status(403).json({ 
              message: 'Access denied. Invalid token. Please log in again.' 
            }); // Send a meaningful error response if the token is invalid
          }
          req.user = user; // Store user info in the request object
          next(); // Proceed to the next middleware/route handler
        });
    console.log("1")

};
