import {
  createOrUpdateDurianVariety,
  getDurianVariety,
} from "../services/durianService.js";

export const handleCreateOrUpdateDurianVariety = async (req, res) => {
  try {
    const result = await createOrUpdateDurianVariety(req.body);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    console.error("Error handling durian variety:", error);
    res.status(500).json({
      success: false,
      message: "Failed to handle durian variety",
    });
  }
};

export const fetchDurianVarieties = async (req, res) => {
  try {
    const { page, size } = req.query;

    // Convert `page` and `size` to numbers and provide default values if not supplied
    const pageNumber = page ? parseInt(page, 10) : null;
    const pageSize = size ? parseInt(size, 10) : null;
    const durianVarieties = await getDurianVariety(pageNumber, pageSize);

    res.status(200).json({
      success: true,
      data: durianVarieties,
    });
  } catch (error) {
    console.error("Error fetching durian varieties:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch durian varieties",
    });
  }
};
