const express = require('express');
const { check } = require('express-validator');
const userDefinedMedicineController = require('../controllers/user-defined-medicine-controller.js');
const secureRoute = require('../configs/jwt-config.js');

const router = express.Router();

// create a new user-defined-medicine
router.post(
    "/",
    // secure the route
    secureRoute,
    [
        check("name").not().isEmpty()
    ],
    userDefinedMedicineController.createUserDefinedMedicine
);

// get all user-defined-medicines
router.get(
    "/",
    // secure the route
    secureRoute,
    userDefinedMedicineController.getAllUserDefinedMedicines
);

// route to delete a user-defined-medicine
router.delete(
    "/:userDefinedMedicineId",
    // secure the route
    secureRoute,
    userDefinedMedicineController.deleteUserDefinedMedicine
);

module.exports = router;