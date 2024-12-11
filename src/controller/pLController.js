import { calculateDailyProfitLossSrv } from "../services/pL.js";

export const calculateDailyProfitLossController = async (req, res) => {
  try {
    const result = await calculateDailyProfitLossSrv();
    res.status(201).json(result);
  } catch (error) {
    console.error("Error creating purchase order:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to create purchase order" });
  }
};
