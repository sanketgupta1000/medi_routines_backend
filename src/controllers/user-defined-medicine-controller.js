const express = require('express');
const { validationResult } = require('express-validator');
const UserDefinedMedicine = require('../models/UserDefinedMedicine');
const HttpError = require('../models/HttpError');
const User = require('../models/User');
const { default: mongoose } = require('mongoose');

const createUserDefinedMedicine = async(req, res, next)=>
{
    try
    {

        // validate request
        const errors = validationResult(req);
        if(!errors.isEmpty())
        {
            // invalid
            throw new HttpError("Invalid inputs passed, please check your data.", 422);
        }

        // get the data from request body
        const {name} = req.body;

        // get the user id from the request
        const userId = req.user.userId;

        const validUserId = new mongoose.Types.ObjectId(userId);

        // fetch the user
        let user;
        try
        {
            user = await User.findById(validUserId);
        }
        catch(err)
        {
            console.log("UserDefinedMedicineController :: createUserDefinedMedicine :: ", err);
            throw new HttpError("Cannot fetch necessary data. Please try again later.", 500);
        }

        if(!user)
        {
            throw new HttpError("User not found.", 404);
        }

        // create the user-defined-medicine
        const userDefinedMedicine = new UserDefinedMedicine(
            {
                name,
                user: validUserId
            }
        );

        // add the user-defined-medicine to the user
        user.userDefinedMedicines.push(userDefinedMedicine._id);

        try
        {
            
            // save the user-defined-medicine and add it to the user, as one transaction
            // start a session
            let session = await mongoose.startSession();
            // session started
            // do operations as a transaction
            await session.withTransaction(async ()=>
            {
                // must return a promise in this callback
                // async functions by default return a promise
                await userDefinedMedicine.save({session: session});
                await user.save({session: session});
            });
            
            // end the session
            await session.endSession();
            // send the response
            res.status(201).json(
                {
                    userDefinedMedicine: userDefinedMedicine.toObject({getters: true})
                }
            );
        }
        catch(err)
        {
            console.log("UserDefinedMedicineController :: createUserDefinedMedicine :: ", err);
            throw new HttpError("Failed to create the user-defined-medicine. Please try again.", 500);
        }

    }
    catch(e)
    {
        console.log(e);
        return next(e);
    }
};

// method to get all user-defined-medicines
const getAllUserDefinedMedicines = async(req, res, next)=>
{
    try
    {
        // get the user id from the request
        const userId = req.user.userId;

        const validUserId = new mongoose.Types.ObjectId(userId);

        // fetch the user
        let user;
        try
        {
            user = await User.findById(validUserId).populate('userDefinedMedicines');
        }
        catch(err)
        {
            console.log("UserDefinedMedicineController :: getAllUserDefinedMedicines :: ", err);
            throw new HttpError("Cannot fetch necessary data. Please try again later.", 500);
        }

        if(!user)
        {
            throw new HttpError("User not found.", 404);
        }

        // send the response
        res.status(200).json(
            {
                userDefinedMedicines: user.userDefinedMedicines.map(med=>med.toObject({getters: true}))
            }
        );
    }
    catch(e)
    {
        console.log(e);
        return next(e);
    }
};
// export the methods
module.exports = {
    createUserDefinedMedicine,
    getAllUserDefinedMedicines
};