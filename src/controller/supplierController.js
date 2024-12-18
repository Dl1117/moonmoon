// controllers/supplierController.js
import {
  createSuppliersWithLorries,
  getSuppliersWithLorries,
  getSupplierWithLorriesById,
} from "../services/supplierService.js";

// Create Supplier with Optional Lorry/Lorries
export const createSupplier = async (req, res) => {
  try {
    const supplierData = req.body.suppliers;
    if (
      !supplierData ||
      !Array.isArray(supplierData) ||
      supplierData.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid supplier data. Please provide an array of suppliers.",
      });
    }
    const newSupplier = await createSuppliersWithLorries(supplierData);
    res.status(201).json({ success: true, data: newSupplier });
  } catch (error) {
    console.error("Error creating supplier:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to create supplier" });
  }
};

// Get all Suppliers with Lorry/Lorries
export const getAllSuppliers = async (req, res) => {
  try {
    const { page, size, month, week } = req.query;

    // Convert `page` and `size` to numbers and provide default values if not supplied
    const pageNumber = page ? parseInt(page, 10) : null;
    const pageSize = size ? parseInt(size, 10) : null;
    const filterMonth = month ? parseInt(month, 10) : null;
    const filterWeek = week ? parseInt(week, 10) : null;
    const suppliers = await getSuppliersWithLorries(
      pageNumber,
      pageSize,
      filterMonth,
      filterWeek
    );
    res.status(200).json({ success: true, data: suppliers });
  } catch (error) {
    console.error("Error retrieving suppliers:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to retrieve suppliers" });
  }
};

// Get Single Supplier with Lorry/Lorries by ID
export const getSupplierById = async (req, res) => {
  try {
    const { id } = req.params;
    const supplier = await getSupplierWithLorriesById(id);
    if (!supplier) {
      return res
        .status(404)
        .json({ success: false, message: "Supplier not found" });
    }
    res.status(200).json({ success: true, data: supplier });
  } catch (error) {
    console.error("Error retrieving supplier by ID:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to retrieve supplier" });
  }
};
