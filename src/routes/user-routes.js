const express = require('express');
const {check} = require('express-validator');
const userController = require('../controllers/user-controller.js');
const secureRoute = require('../configs/jwt-config.js');

const router = express.Router();

// for signing up
router.post(
    "/signup",
    [
        check("name").not().isEmpty(),
        check("email").normalizeEmail().isEmail(),
        check("password").isLength({min: 6}),
        check("timezone").not().isEmpty()
    ],
    userController.signup

);

// for signing in, i.e., generate and send jwt
router.post(
    "/login",
    [
        check("email").normalizeEmail().isEmail(),
        check("password").not().isEmpty(),
    ],
    userController.login
);

// for getting user details
router.get(
    "/",
    // secure the route
    secureRoute,
    userController.getUser
);

// route for FCM token registration
router.post(
    "/register-fcm-token",
    secureRoute, // User must be logged in
    [
        check("fcmToken").not().isEmpty() // Validate that a token is provided
    ],
    userController.registerFcmToken // New controller method
);

module.exports = router;