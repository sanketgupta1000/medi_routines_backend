const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Taken = require('../models/Taken');
const Routine = require('../models/Routine');
const HttpError = require('../models/HttpError');

const createTaken = async (req, res, next) =>
{
    try
    {
        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty())
        {
            throw new HttpError("Invalid inputs passed, please check your data.", 422);
        }

        const { routine, routineMedicine, date, day, time } = req.body;

        // convert to objectId
        const validRoutineId = new mongoose.Types.ObjectId(routine);
        const validRoutineMedicineId = new mongoose.Types.ObjectId(routineMedicine);

        // Check if routine exists
        let foundRoutine;
        try
        {
            foundRoutine = await Routine.findById(validRoutineId);
        } catch (err)
        {
            console.log("TakenController :: createTaken :: ", err);
            throw new HttpError("Could not fetch necessary routine.", 500);
        }
        if (!foundRoutine)
        {
            throw new HttpError("Routine not found.", 404);
        }

        // Check if routineMedicine exists in the routine
        const medicineExists = foundRoutine.medicines.id(validRoutineMedicineId);
        if (!medicineExists)
        {
            throw new HttpError("Medicine not found in routine.", 404);
        }

        // Check if already marked as taken for this day/time
        const alreadyTaken = await Taken.findOne(
        {
            routine: validRoutineId,
            routineMedicine: validRoutineMedicineId,
            day: day,
            time: time,
            date: date
        });
        if (alreadyTaken)
        {
            throw new HttpError("Medicine already marked as taken for this slot.", 409);
        }

        // Create the taken record
        const taken = new Taken(
            {
                routine: validRoutineId,
                routineMedicine: validRoutineMedicineId,
                date,
                day,
                time
            }
        );

        // Save taken and update routine in a transaction
        const session = await mongoose.startSession();
        try
        {
            await session.withTransaction(async () =>
            {
                await taken.save({ session });
                foundRoutine.takenMedicines.push(taken._id);
                await foundRoutine.save({ session });
            });
        }
        catch (err)
        {
            console.log("TakenController :: createTaken :: ", err);
            throw new HttpError("Failed to mark medicine as taken.", 500);
        }
        finally
        {
            await session.endSession();
        }

        res.status(201).json({ taken: taken.toObject({ getters: true }) });
    }
    catch (e)
    {
        console.log(e);
        return next(e);
    }
};

module.exports = {
    createTaken
};