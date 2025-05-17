const mongoose = require("mongoose");

const routineSchema = new mongoose.Schema({
    
    // name of the routine
    name: {type: String, required: true},
    // the user whose routine is this
    user: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},

    // date and time of creation of the routine
    createdAt: {type: Date, default: Date.now},
    
    // will use an array of subdocs to store the medicines for a routine
    // also, since a medicine can be of one of two types, must use dynamic reference using refPath
    // refPath allows referring to multiple models based on value of another field
    medicines : [
        {
            medicineType: {type: String, enum: ["PredefinedMedicine", "UserDefinedMedicine"], required: true},

            medicine: {
                type: mongoose.Schema.Types.ObjectId,
                refPath: "medicines.medicineType",
                required: true
            },

            schedule: [
                {
                    day: {type: String, enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], required: true},
                    times: [{type: String, enum: ["Morning", "Afternoon", "Evening", "Night"], required: true}],
                }
            ]

        }
    ],

    // list of taken medicines
    takenMedicines: [{type: mongoose.Schema.Types.ObjectId, ref: 'Taken'}]

});

const Routine = mongoose.model("Routine", routineSchema);
module.exports = Routine;