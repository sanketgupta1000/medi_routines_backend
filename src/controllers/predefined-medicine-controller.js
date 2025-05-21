const PredefinedMedicine = require('../models/PredefinedMedicine');
const HttpError = require('../models/HttpError');

const getAllPredefinedMedicines = async (req, res) =>
{
    try
    {
        const medicines = await PredefinedMedicine.find();
        
        res
        .json(
            {
                predefinedMedicines: medicines.map((m)=>
                    m.toObject({getters: true})
                )
            }
        );

    }
    catch (error)
    {
        console.log("PredefinedMedicineController :: getAll :: ", error);
        return next(new HttpError("Could not get the medicines from database", 500));
    }
};

module.exports = {
    getAllPredefinedMedicines
};