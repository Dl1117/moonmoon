import { adminLoginAuth, createAdminAcc } from "../services/adminService.js";



export const adminLogin = async (req, res) => {
          const { loginId, password } = req.body;
        
          try {
            const admin = await adminLoginAuth({ loginId, password });
            // Here you would typically generate a JWT token
            const token = ''; // Implement token generation logic
            res.status(200).json({ message: 'Admin logged in successfully', admin, token });
          } catch (error) {
            res.status(401).json({ message: error.message });
          }
};


export const createAdminAccount = async (req, res) => {
          try {

            console.log("request body", req.body);
            const { username, loginId, password } = req.body;
        
            // Call the service function to create the admin account
            const newAdmin = await createAdminAcc({ username, loginId, password });
        
            res.status(201).json({
              success: true,
              message: 'Admin account created successfully',
              data: newAdmin
            });
          } catch (error) {
            console.error('Error creating admin account:', error);
            res.status(500).json({
              success: false,
              message: 'Failed to create admin account'
            });
          }
};
