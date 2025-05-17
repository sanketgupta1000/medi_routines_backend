const mongoose = require('mongoose');

// This model represents predefined medicines in the database.
const predefinedMedicineSchema = new mongoose.Schema({
    name: { type: String, required: true }
});

const PredefinedMedicine = mongoose.model('PredefinedMedicine', predefinedMedicineSchema);
module.exports = PredefinedMedicine;