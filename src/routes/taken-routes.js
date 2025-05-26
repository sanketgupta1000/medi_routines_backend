const express = require('express');
const { check } = require('express-validator');
const secureRoute = require('../configs/jwt-config.js');
const takenController = require('../controllers/taken-controller.js');

const router = express.Router();

// route to create a new taken medicine
router.post(
    "/",
    secureRoute,
    [
        check("routine")
            .not()
            .isEmpty(),
        check("routineMedicine")
            .not()
            .isEmpty(),
            // date must be in DD/MM/YYYY format
        check("date")
            .not()
            .isEmpty()
            .matches(/^\d{2}\/\d{2}\/\d{4}$/),
        check("day")
            .not()
            .isEmpty()
            .isIn(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]),
        check("time")
            .not()
            .isEmpty()
            .isIn(["Morning", "Afternoon", "Evening", "Night"])
    ],
    takenController.createTaken
);

// route to mark multiple medicines as taken of a routine on a specific date, day and time
router.post(
    "/multiple",
    secureRoute,
    [
        check("routine")
            .not()
            .isEmpty(),
        check("routineMedicines")
            .isArray({ min: 1 }),
        // date must be in DD/MM/YYYY format
        check("date")
            .not()
            .isEmpty()
            .matches(/^\d{2}\/\d{2}\/\d{4}$/),
        check("day")
            .not()
            .isEmpty()
            .isIn(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]),
        check("time")
            .not()
            .isEmpty()
            .isIn(["Morning", "Afternoon", "Evening", "Night"])
    ],
    takenController.createMultipleTaken
);

module.exports = router;