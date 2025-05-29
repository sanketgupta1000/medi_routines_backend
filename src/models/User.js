const mongoose = require('mongoose');

// This model represents users in the database.

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },

    // user's timezone
    timezone: { type: String, required: true },

    // user's own created routines, will only store the ids (just like foreign key in rdbms)
    // another way can be to store complete list of the routines, but if frequent updations are there, then performance issues can occur
    // since with each update on routine, need to update on user too
    routines : [{type: mongoose.Schema.Types.ObjectId, ref: 'Routine'}],
    // user's own defined medicines
    userDefinedMedicines: [{type: mongoose.Schema.Types.ObjectId, ref:'UserDefinedMedicine'}],
    fcmTokens: [{type:String}]  // for push notifications
});

const User = mongoose.model('User', userSchema);

module.exports = User;