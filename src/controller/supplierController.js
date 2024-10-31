// controllers/supplierController.js
import { createSuppliersWithLorries, getSuppliersWithLorries, getSupplierWithLorriesById } from '../services/supplierService.js';

// Create Supplier with Optional Lorry/Lorries
export const createSupplier = async (req, res) => {
  try {
    const supplierData = req.body.suppliers;
    const newSupplier = await createSuppliersWithLorries(supplierData);
    res.status(201).json({ success: true, data: newSupplier });
  } catch (error) {
    console.error('Error creating supplier:', error);
    res.status(500).json({ success: false, message: 'Failed to create supplier' });
  }
};

// Get all Suppliers with Lorry/Lorries
export const getAllSuppliers = async (req, res) => {
  try {
    const suppliers = await getSuppliersWithLorries();
    res.status(200).json({ success: true, data: suppliers });
  } catch (error) {
    console.error('Error retrieving suppliers:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve suppliers' });
  }
};

// Get Single Supplier with Lorry/Lorries by ID
export const getSupplierById = async (req, res) => {
  try {
    const { id } = req.params;
    const supplier = await getSupplierWithLorriesById(id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }
    res.status(200).json({ success: true, data: supplier });
  } catch (error) {
    console.error('Error retrieving supplier by ID:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve supplier' });
  }
};
