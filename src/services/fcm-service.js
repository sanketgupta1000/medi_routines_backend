const admin = require('firebase-admin');
const config = require('../configs/config.js');
const HttpError = require('../models/HttpError.js');

let serviceAccount;
try
{
    serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH);
}
catch (error)
{
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.error("Failed to load Firebase service account key. Push notifications will not work.");
    console.error("Please ensure FIREBASE_SERVICE_ACCOUNT_KEY_PATH environment variable is set");
    console.error("or update the path in src/services/fcm-service.js");
    console.error("Error details:", error.message);
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
}


if (serviceAccount)
{
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
else
{
    console.warn("Firebase Admin SDK not initialized because service account key is missing.");
}


const sendPushNotification = async (registrationTokens, title, body, data = {}) =>
{
    if (!admin.apps.length)
    { // Check if Firebase Admin SDK was initialized
        console.error("Firebase Admin SDK not initialized. Cannot send push notification.");
        return { successCount: 0, failureCount: Array.isArray(registrationTokens) ? registrationTokens.length : 1 };
    }
    if (!registrationTokens || registrationTokens.length === 0)
    {
        console.log("No registration tokens provided for push notification.");
        return { successCount: 0, failureCount: 0 };
    }

    const message = {
        notification: {
            title: title,
            body: body,
        },
        data: data, // Optional: for custom data to be handled by the client app
        tokens: Array.isArray(registrationTokens) ? registrationTokens : [registrationTokens],
    };

    try
    {
        const response = await admin.messaging().sendEachForMulticast(message);
        console.log('FCM send response:', response.successCount, 'successes,', response.failureCount, 'failures');

        if (response.failureCount > 0)
        {
            response.responses.forEach((resp, idx) =>
            {
                if (!resp.success)
                {
                    console.error(`Failed to send to token ${registrationTokens[idx]}:`, resp.error.code, resp.error.message);
                    // Handle invalid/expired tokens:
                    // These error codes indicate the token is no longer valid.
                    if (resp.error.code === 'messaging/registration-token-not-registered' ||
                        resp.error.code === 'messaging/invalid-registration-token' ||
                        resp.error.code === 'messaging/mismatched-credential')
                    { // Mismatched sender ID
                        // TODO: Implement logic to find the user associated with registrationTokens[idx]
                        // and remove this specific token from their user.fcmTokens array.
                        console.warn(`Token ${registrationTokens[idx]} is invalid. It should be removed from the database.`);
                    }
                }
            });
        }
        return response;
    }
    catch (error)
    {
        console.error('Error sending FCM message:', error);
        throw new HttpError("Failed to send push notification.", 500);
    }
};

module.exports = { sendPushNotification };