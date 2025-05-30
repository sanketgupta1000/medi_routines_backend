const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// config
const config = require('./src/configs/config.js');

const HttpError = require('./src/models/HttpError.js');

const app = express();

// import routes
const userRoutes = require("./src/routes/user-routes.js");
const routineRoutes = require("./src/routes/routine-routes.js");
const takenRoutes = require("./src/routes/taken-routes.js");
const predefinedMedicineRoutes = require("./src/routes/predefined-medicine-routes.js");
const userDefinedMedicineRoutes = require("./src/routes/user-defined-medicine-routes.js");

// cors config
const corsOptions = {
    origin: config.nodeEnv === 'production'
    ?
    ['https://medi-routines-frontend.vercel.app', 'https://mediroutines.sanket.codes']
    :
    ['http://localhost:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// middleware to convert request body to json
app.use(express.json());

// actually use the routes
app.use("/api/user", userRoutes);
app.use("/api/routine", routineRoutes);
app.use("/api/taken", takenRoutes);
app.use("/api/predefined-medicine", predefinedMedicineRoutes);
app.use("/api/user-defined-medicine", userDefinedMedicineRoutes);

// for keeping the server alive via poll
app.get("/cron/poll", (req, res)=>
{
    res.send("Cron poll succeeded!");
});

// middleware to handle 404 errors
// no routes matched
app.use((req, res, next) => {
    const error = new HttpError('Could not find this route.', 404);
    throw error;
});

// error handling middleware
app.use((error, req, res, next) => {
    if (res.headerSent)
    {
        return next(error);
    }
    res.status(error.code || 500);
    res.json({
        message: error.message || 'An unknown error occurred!',
    });
});

// just export the app
// so that we can use it in the server.js file
// this way, we can test the app
module.exports = app;