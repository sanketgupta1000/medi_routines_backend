const express = require('express');
const router = express.Router();
const secureRoute = require('../configs/jwt-config.js');
const routineController = require('../controllers/routine-controller.js');
const { check } = require('express-validator');

// route to create a new routine
router.post(
    "/",
    secureRoute,
    [
        check("name")
            .not()
            .isEmpty(),
        check("medicines")
            .isArray({min: 1}),
        check("medicines.*.medicineType")
            .isIn(["PredefinedMedicine", "UserDefinedMedicine"]),
        check("medicines.*.medicine")
            .not()
            .isEmpty(),
        check("medicines.*.schedule")
            .isArray({min: 1}),
        check("medicines.*.schedule.*.day")
            .isIn(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]),
        check("medicines.*.schedule.*.times")
            .isArray({min: 1}),
        check("medicines.*.schedule.*.times.*")
            .isIn(["Morning", "Afternoon", "Evening", "Night"]),

    ],
  routineController.createRoutine
);

// route to get all routines of the user
router.get(
    "/",
    secureRoute,
    routineController.getAllRoutines
);

// route to get upcoming routines
router.get(
    "/upcoming",
    secureRoute,
    routineController.getUpcomingRoutines
);

// route to get a routine by id
router.get(
    "/:routineId",
    secureRoute,
    routineController.getRoutineById
);

// route to delete a routine by id
router.delete(
    "/:routineId",
    secureRoute,
    routineController.deleteRoutineById
);

module.exports = router;