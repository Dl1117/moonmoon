import { adminLoginAuth, createAdminAcc, requestAdvancedSalarySrv, superAdminCancellingPurchaseOrderSrv, superAdminCancellingSalesOrderSrv } from "../services/adminService.js";



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

//super admin method
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

export const superAdminCancellingSalesOrderCtr = async (req, res) => {
  try{
    const {salesId} = req.params;

    const cancellingOrder = await superAdminCancellingSalesOrderSrv(salesId);
    res.status(201).json({
      success: true,
      message: 'Sales order cancelled successfully',
      data: cancellingOrder
    });
  }
  catch (error) {
    console.error('Error cancelling sales order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel sales order'
    });
  }
}

export const superAdminCancellingPurchaseOrderCtr = async (req, res) => {
  try{
    const {purchaseId} = req.params;

    const cancellingOrder = await superAdminCancellingPurchaseOrderSrv(purchaseId);
    res.status(201).json({
      success: true,
      message: 'Purchase order cancelled successfully',
      data: cancellingOrder
    });
  }
  catch (error) {
    console.error('Error cancelling purchase order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel purchase order'
    });
  }
}

export const requestAdvancedSalaryCtr = async (req, res) => {
  try{

    const requestAdvancedSalary = await requestAdvancedSalarySrv(req.body);
    res.status(201).json({
      success: true,
      message: 'Request advanced salary successful',
      data: requestAdvancedSalary
    });


  }catch (error) {
    console.error('Error request advanced salary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to request advanced salary'
    });
  }
}
