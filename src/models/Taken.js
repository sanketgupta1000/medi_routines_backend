// This model represents which user took which medicine from which routine
// and at what date

const mongoose = require("mongoose");

const takenSchema = new mongoose.Schema({
    
    // no need to store the user id, since it can be derived from the routine

    // routine id
    routine: { type: mongoose.Schema.Types.ObjectId, ref: 'Routine', required: true },

    // the routine medicine id, actually _id of the medicine in the routine
    // since by default, subdocs have _id field, so can use that to refer to the medicine
    routineMedicine: { type: mongoose.Schema.Types.ObjectId, required: true },

    // date in string
    date: { type: String, required: true },

    // day in string
    day: { type: String, enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], required: true },

    // time in string
    time: { type: String, enum: ["Morning", "Afternoon", "Evening", "Night"], required: true },

    // date and time of taking the medicine, day can be derived from this
    takenAt: { type: Date, default: Date.now() }
});

const Taken = mongoose.model("Taken", takenSchema);

module.exports = Taken;