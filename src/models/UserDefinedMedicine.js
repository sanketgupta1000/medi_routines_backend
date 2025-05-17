const mongoose = require('mongoose');

// This model represents user defined medicines in the database.
const userDefinedMedicineSchema = new mongoose.Schema({
    // name of the medicine
    name: { type: String, required: true },
    // the user whose medicine is this
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const UserDefinedMedicine = mongoose.model('UserDefinedMedicine', userDefinedMedicineSchema);
module.exports = UserDefinedMedicine;