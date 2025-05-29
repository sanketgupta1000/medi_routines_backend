const cron = require('node-cron');
const mongoose = require('mongoose');
const User = require('../models/User');
const Routine = require('../models/Routine');
const { sendPushNotification } = require('./fcm-service');
const HttpError = require('../models/HttpError');

// This cron job runs every hour at the 0th minute.
// For 10 AM checks, hourly is reasonable.
// More frequent (e.g., every 15 or 30 mins) gives more precision but more load.
const scheduleDailyNotifications = () =>
{
    cron.schedule('0,30 * * * *', async () =>
    { // Runs at 0 and 30 min of every hour
        console.log(`[Scheduler] Running hourly check for 10 AM notifications at ${new Date().toISOString()}`);

        try {
            const users = await User.find({
                fcmTokens: { $exists: true, $ne: [] } // Only users with FCM tokens
            }).select('+timezone +fcmTokens +email'); // Select necessary fields

            for (const user of users)
            {
                if (!user.timezone || user.fcmTokens.length === 0) {
                    continue;
                }

                let currentHourInUserTimezone;
                try
                {
                    // Get current hour in user's timezone (0-23 format)
                    const nowInUserTz = new Date().toLocaleTimeString('en-US', {
                        timeZone: user.timezone,
                        hour12: false,
                        hour: 'numeric'
                    });
                    currentHourInUserTimezone = parseInt(nowInUserTz, 10);
                }
                catch (tzError)
                {
                    console.error(`[Scheduler] Invalid timezone for user ${user.email} (${user._id}): ${user.timezone}. Error: ${tzError.message}`);
                    continue;
                }

                // Check if it's 10 AM for the user
                if (currentHourInUserTimezone === 10)
                {
                    console.log(`[Scheduler] It's 10 AM for user ${user.email} in ${user.timezone}. Fetching routines.`);

                    const currentDate = new Date();
                    const dateFormat = new Intl.DateTimeFormat("en-GB", { timeZone: user.timezone }); // DD/MM/YYYY
                    const localDateString = dateFormat.format(currentDate);

                    const dayFormat = new Intl.DateTimeFormat("en-US", { timeZone: user.timezone, weekday: 'long' });
                    const localDayString = dayFormat.format(currentDate); // e.g., "Wednesday"

                    const userRoutines = await Routine.find({ user: user._id })
                        .populate('medicines.medicine') // Populate actual medicine details
                        .populate('takenMedicines');    // To check if already taken

                    let medicinesForNotification = [];

                    for (const routine of userRoutines)
                    {
                        for (const med of routine.medicines)
                        {
                            const scheduleForToday = med.schedule.find(s => s.day === localDayString);

                            if (scheduleForToday && scheduleForToday.times && scheduleForToday.times.length > 0)
                            {
                                // Check if this medicine (any slot for today) is NOT already taken
                                // This is a simplified check: if any slot of this med for today is taken, we skip.
                                const isTakenToday = routine.takenMedicines.some(taken =>
                                    taken.routineMedicine && // Ensure routineMedicine is populated or exists
                                    taken.routineMedicine.toString() === med._id.toString() &&
                                    taken.date === localDateString // Compare date strings
                                );

                                if (!isTakenToday && med.medicine)
                                { // Ensure med.medicine is populated
                                    medicinesForNotification.push(med.medicine.name);
                                }
                            }
                        }
                    }
                    medicinesForNotification = [...new Set(medicinesForNotification)]; // Unique medicine names

                    if (medicinesForNotification.length > 0)
                    {
                        const notificationTitle = "Medication Reminder";
                        const notificationBody = `Your today's medicines: ${medicinesForNotification.join(', ')}.`;

                        console.log(`[Scheduler] Sending notification to user ${user.email}: "${notificationBody}"`);
                        try
                        {
                            await sendPushNotification(user.fcmTokens, notificationTitle, notificationBody, {});
                        }
                        catch (sendError)
                        {
                            console.error(`[Scheduler] Failed to send notification to ${user.email}:`, sendError.message);
                        }
                    }
                    else
                    {
                        console.log(`[Scheduler] No pending untaken medications for user ${user.email} at 10 AM on ${localDateString}.`);
                    }
                }
            }
        }
        catch (error)
        {
            console.error('[Scheduler] Error in scheduled task:', error);
        }
    });

    console.log('[Scheduler] Daily notification scheduler initialized.');
};

module.exports = { scheduleDailyNotifications };