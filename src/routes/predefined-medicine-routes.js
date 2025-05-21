const express = require('express');
const router = express.Router();

const predefinedMedicineController = require('../controllers/predefined-medicine-controller.js');

const secureRoute = require('../configs/jwt-config.js');

// for getting all predefined medicines
router.get(
    "/",
    // secure the route
    secureRoute,
    predefinedMedicineController.getAllPredefinedMedicines
);

module.exports = router;