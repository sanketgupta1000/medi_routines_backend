const express = require('express');
const {validationResult} = require('express-validator');
const Routine = require('../models/Routine');
const HttpError = require('../models/HttpError');
const User = require('../models/User');
const UserDefinedMedicine = require('../models/UserDefinedMedicine');
const PredefinedMedicine = require('../models/PredefinedMedicine');
const mongoose = require('mongoose');
const { path } = require('../../app');

// method to create a new routine
const createRoutine = async(req, res, next)=>
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
        const {name, medicines} = req.body;

        // get the user id from request
        const userId = req.user.userId;
        const validUserId = new mongoose.Types.ObjectId(String(userId));
        
        let user;
        // find the user
        try
        {
            user = await User.findById(validUserId);
        }
        catch(err)
        {
            console.log(err);
            throw new HttpError("Creating routine failed, please try again", 500);
        }

        // check if user exists
        if(!user)
        {
            throw new HttpError("Could not find user for provided id", 404);
        }

        // first extract all the predefined medicines ids and the user-defined medicines ids from the request
        let predefinedMedicinesIds = [];
        let userDefinedMedicinesIds = [];
        for(let i=0; i<medicines.length; i++)
        {
            if(medicines[i].medicineType === "PredefinedMedicine")
            {
                predefinedMedicinesIds.push(new mongoose.Types.ObjectId(String(medicines[i].medicine)));
            }
            else if(medicines[i].medicineType === "UserDefinedMedicine")
            {
                userDefinedMedicinesIds.push(new mongoose.Types.ObjectId(String(medicines[i].medicine)));
            }
        }

        // now check if all the predefined medicines exist in the database
        let predefinedMedicines;
        try
        {
            predefinedMedicines = await PredefinedMedicine.find({_id: {$in: predefinedMedicinesIds}});
        }
        catch(err)
        {
            console.log(err);
            throw new HttpError("Creating routine failed, please try again", 500);
        }

        if(predefinedMedicines.length !== predefinedMedicinesIds.length)
        {
            throw new HttpError("Could not find some of the predefined medicines, please check your data", 404);
        }

        // now check if all the user-defined medicines exist in the database
        let userDefinedMedicines;
        try
        {
            userDefinedMedicines = await UserDefinedMedicine.find({_id: {$in: userDefinedMedicinesIds}});
        }
        catch(err)
        {
            console.log(err);
            throw new HttpError("Creating routine failed, please try again", 500);
        }

        if(userDefinedMedicines.length !== userDefinedMedicinesIds.length)
        {
            throw new HttpError("Could not find some of the user-defined medicines, please check your data", 404);
        }

        // now map all the medicine in the medicines array to the correct format
        for(let i=0; i<medicines.length; i++)
        {
            medicines[i].medicine = new mongoose.Types.ObjectId(String(medicines[i].medicine));
        }

        // create the routine
        const routine = new Routine(
            {
                name,
                user: validUserId,
                medicines,
                createdAt: Date.now(),
                takenMedicines: []

            }
        );

        // add the routine to the user
        user.routines.push(routine._id);
        // save the routine and the user as one transaction

        try
        {
            const session = await mongoose.startSession();
            await session.withTransaction(
                async ()=>
                {
                    await routine.save({session: session});
                    await user.save({session: session});
                }
            );
            await session.endSession();
            res.status(201).json({routine: routine.toObject({getters: true})});

        }
        catch(err)
        {
            console.log(err);
            throw new HttpError("Creating routine failed, please try again", 500);
        }

    }
    catch(err)
    {
        console.log(err);
        return next(err);
    }
}

// method to get all routines of the user
const getAllRoutines = async (req, res, next) =>
{
    try
    {

        const userId = req.user.userId;
        const validUserId = new mongoose.Types.ObjectId(String(userId));
    
        let user;
        try
        {
            user = await User.findById(validUserId).populate({path: "routines", populate: [{path: "medicines.medicine"}, {path: "takenMedicines"}]});
        }
        catch(err)
        {
            console.log(err);
            throw new HttpError("Fetching routines failed, please try again", 500);
        }
    
        if(!user)
        {
            throw new HttpError("Could not find user for provided id", 404);
        }
    
        res.status(200).json({routines: user.routines.map(routine => routine.toObject({getters: true}))});
        // console.log("from getAllRoutines", JSON.stringify(user.routines.map(routine => routine.toObject({getters: true})), null, 2));
    }
    catch(err)
    {
        console.log(err);
        return next(err);
    }
};

// method to get a routine by id
const getRoutineById = async (req, res, next) =>
{
    try
    {

        const routineId = req.params.routineId;
        const validRoutineId = new mongoose.Types.ObjectId(String(routineId));
    
        // get the user id from request
        const userId = req.user.userId;
        const validUserId = new mongoose.Types.ObjectId(String(userId));
    
        let routine;
        try
        {
            routine = await Routine.findOne({_id: validRoutineId, user: validUserId}).populate("medicines.medicine").populate("takenMedicines");
        }
        catch(err)
        {
            console.log(err);
            throw new HttpError("Fetching routine failed, please try again", 500);
        }
    
        if(!routine)
        {
            throw new HttpError("Could not find routine for provided id", 404);
        }
    
        res.status(200).json({routine: routine.toObject({getters: true})});
    }
    catch(err)
    {
        console.log(err);
        return next(err);
    }
};

// method to get upcoming routines
// by upcoming routines, we mean the routines for which there are medicines to be taken on this day, i.e., the medicines that have a schedule matching the current date

// response format:
// {
//     routines: [
//         {
//             routineId: "...",
//             routineName: "...",
//             localDate: "...",   // date in string local format according to the user's timezone
//             localDay: "...",    // day according to the user's timezone
//             localTime: "...",   // this is either Morning, Afternoon, Evening, or Night
//             routineMedicines: [
//                 {
//                     routineMedicineId: "...",   // this is the _id from the medicines subdoc in Routine
//                     routineMedicineName: "..."
//                 }
//             ]
//         }
//     ]
// }

const getUpcomingRoutines = async (req, res, next) =>
{

    try
    {

        // first, get the user id from request
        const userId = req.user.userId;
        const validUserId = new mongoose.Types.ObjectId(userId);
    
        // fetch the user
        let user;
        try
        {
            user = await User
                .findById(validUserId);
        }
        catch(err)
        {
            console.log(err);
            throw new HttpError("Fetching routines failed, please try again", 500);
        }

        if(!user)
        {
            throw new HttpError("Could not find user for provided id", 404);
        }

        // now will get user's local date and time, and day
        const currentDate = new Date();

        // create DateTimeFormat required instances
        // formatter to get only the date in user's timezone
        const dateFormat = new Intl.DateTimeFormat("en-GB", {timeZone: user.timezone, year: "numeric", month: "2-digit", day: "2-digit"});
        // formatter to get only the day in user's timezone
        const dateFormatDay = new Intl.DateTimeFormat("en-GB", {timeZone: user.timezone, weekday: "long"});
        // formatter to get only the time in user's timezone
        const timeFormat = new Intl.DateTimeFormat("en-GB", {timeZone: user.timezone, hour: "numeric", minute: "numeric", hour12: false});

        const localDate = dateFormat.format(currentDate);
        const localDay = dateFormatDay.format(currentDate);
        const localTime = timeFormat.format(currentDate);

        // change localTime to the required format: Morning, Afternoon, Evening, Night
        // Map hour to time slot
        const [localHour] = localTime.split(":").map(Number);
        const timeSlots = ["Morning", "Afternoon", "Evening", "Night"];
        let currentSlotIdx = 0;
        // if (localHour >= 0 && localHour < 12) currentSlotIdx = 0;
        // else if (localHour >= 12 && localHour < 17) currentSlotIdx = 1;
        // else if (localHour >= 17 && localHour < 21) currentSlotIdx = 2;
        // else currentSlotIdx = 3;

        // fetch all routines with medicines and takenMedicines populated
        let routines;
        try
        {
            routines = await Routine
                .find({user: validUserId})
                .populate("medicines.medicine")
                .populate("takenMedicines");
        }
        catch(err)
        {
            console.log("RoutineController :: getUpcomingRoutines :: ", err);
            throw new HttpError("Fetching routines failed, please try again", 500);
        }

        const response = [];
        for (const routine of routines)
        {
            // For each slot from morning to end of day
            for (let slotIdx = currentSlotIdx; slotIdx < timeSlots.length; slotIdx++)
            {
                const slot = timeSlots[slotIdx];
                const routineMedicines = [];

                for (const med of routine.medicines)
                {
                    // Find today's schedule for this medicine
                    const todaySchedule = med.schedule.find(s => s.day === localDay);
                    if (!todaySchedule) continue;
                    if (!todaySchedule.times.includes(slot)) continue;

                    // Check if already taken for this slot today, on this date
                    const alreadyTaken = routine.takenMedicines.some(taken =>
                        taken.routineMedicine?.toString() === med._id.toString() &&
                        taken.day === localDay &&
                        taken.time === slot &&
                        taken.date === localDate
                    );
                    if (!alreadyTaken)
                    {
                        routineMedicines.push(
                            {
                                routineMedicineId: med._id,
                                routineMedicineName: med.medicine.name
                            }
                        );
                    }
                }

                if (routineMedicines.length > 0)
                {
                    response.push({
                        routineId: routine._id,
                        routineName: routine.name,
                        localDate,
                        localDay,
                        localTime: slot,
                        routineMedicines
                    });
                }
            }
        }

        res.json({ upcomingRoutines: response });


    }
    catch(e)
    {
        console.log(e);
        return next(e);
    }


}

// exporting the methods
module.exports = {
    createRoutine,
    getAllRoutines,
    getRoutineById,
    getUpcomingRoutines
};