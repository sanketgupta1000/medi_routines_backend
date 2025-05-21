const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

let replSet;
let app;
let token;
let userId;
let medId;

beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { storageEngine: 'wiredTiger' } });
    const uri = replSet.getUri();
    process.env.MONGODB_CONNECTION = uri;
    app = require('../app');
    await mongoose.connect(uri, { dbName: "test" });
});

afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
});

beforeEach(async () => {
    await mongoose.connection.db.dropDatabase();
    // Signup and login a user to get a token for secure routes
    const signupRes = await request(app)
        .post('/api/user/signup')
        .send({
            name: "Routine User",
            email: "routine@example.com",
            password: "password123",
            timezone: "Asia/Kolkata"
        });
    expect(signupRes.statusCode).toBe(201);
    userId = signupRes.body.user.id || signupRes.body.userId;

    const loginRes = await request(app)
        .post('/api/user/login')
        .send({
            email: "routine@example.com",
            password: "password123"
        });
    expect(loginRes.statusCode).toBe(200);
    token = loginRes.body.token;

    // Create a user-defined medicine for use in routine tests
    const medRes = await request(app)
        .post('/api/user-defined-medicine')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: "Test Med" });
    expect(medRes.statusCode).toBe(201);
    medId = medRes.body.userDefinedMedicine.id;
});

describe('Routine Routes', () => {
    // CREATE ROUTINE
    it('should not allow unauthenticated user to create a routine', async () => {
        const res = await request(app)
            .post('/api/routine')
            .send({ name: "Test Routine", medicines: [] });
        expect(res.statusCode).toBe(401);
    });

    it('should not create a routine with invalid input', async () => {
        const res = await request(app)
            .post('/api/routine')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: "", medicines: [] }); // name is required
        expect(res.statusCode).toBe(422);
    });

    it('should not create a routine if user does not exist', async () => {
        // Simulate by deleting user before request
        await mongoose.connection.db.collection('users').deleteMany({});
        const res = await request(app)
            .post('/api/routine')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: "Routine",
                medicines: [
                    {
                        medicineType: "UserDefinedMedicine",
                        medicine: medId,
                        schedule: [{ day: "Monday", times: ["Morning"] }]
                    }
                ]
            });
        expect(res.statusCode).toBe(404);
        expect(res.body.message).toMatch(/Could not find user/);
    });

    it('should not create a routine if user-defined medicine does not exist', async () => {
        const fakeMedId = new mongoose.Types.ObjectId();
        const res = await request(app)
            .post('/api/routine')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: "Routine",
                medicines: [
                    {
                        medicineType: "UserDefinedMedicine",
                        medicine: fakeMedId,
                        schedule: [{ day: "Monday", times: ["Morning"] }]
                    }
                ]
            });
        expect(res.statusCode).toBe(404);
        expect(res.body.message).toMatch(/Could not find some of the user-defined medicines/);
    });

    it('should create a routine with valid input', async () => {
        const routineRes = await request(app)
            .post('/api/routine')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: "Morning Routine",
                medicines: [
                    {
                        medicineType: "UserDefinedMedicine",
                        medicine: medId,
                        schedule: [{ day: "Monday", times: ["Morning"] }]
                    }
                ]
            });
        expect(routineRes.statusCode).toBe(201);
        expect(routineRes.body).toHaveProperty('routine');
        expect(routineRes.body.routine).toHaveProperty('id');
        expect(routineRes.body.routine).toHaveProperty('name', 'Morning Routine');
        expect(routineRes.body.routine).toHaveProperty('medicines');
        expect(Array.isArray(routineRes.body.routine.medicines)).toBe(true);
        expect(routineRes.body.routine.medicines.length).toBe(1);
        expect(routineRes.body.routine.medicines[0]).toHaveProperty('medicineType', 'UserDefinedMedicine');
        expect(routineRes.body.routine.medicines[0]).toHaveProperty('medicine', medId.toString());
        expect(routineRes.body.routine.medicines[0]).toHaveProperty('schedule');
        expect(Array.isArray(routineRes.body.routine.medicines[0].schedule)).toBe(true);
        expect(routineRes.body.routine.medicines[0].schedule.length).toBe(1);
        expect(routineRes.body.routine.medicines[0].schedule[0]).toHaveProperty('day', 'Monday');
        expect(routineRes.body.routine.medicines[0].schedule[0]).toHaveProperty('times');
        expect(Array.isArray(routineRes.body.routine.medicines[0].schedule[0].times)).toBe(true);
        expect(routineRes.body.routine.medicines[0].schedule[0].times.length).toBe(1);
        expect(routineRes.body.routine.medicines[0].schedule[0].times[0]).toBe('Morning');

    });

    // GET ALL ROUTINES
    it('should not allow unauthenticated user to get all routines', async () => {
        const res = await request(app)
            .get('/api/routine');
        expect(res.statusCode).toBe(401);
    });

    it('should return 404 if user does not exist when getting all routines', async () => {
        await mongoose.connection.db.collection('users').deleteMany({});
        const res = await request(app)
            .get('/api/routine')
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toBe(404);
        expect(res.body.message).toMatch(/Could not find user/);
    });

    it('should get all routines for authenticated user', async () => {
        // Create a routine first
        await request(app)
            .post('/api/routine')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: "Routine1",
                medicines: [
                    {
                        medicineType: "UserDefinedMedicine",
                        medicine: medId,
                        schedule: [{ day: "Monday", times: ["Morning"] }]
                    }
                ]
            });

        const res = await request(app)
            .get('/api/routine')
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('routines');
        expect(Array.isArray(res.body.routines)).toBe(true);
        expect(res.body.routines.length).toBe(1);
        expect(res.body.routines[0]).toHaveProperty('name', 'Routine1');
        expect(res.body.routines[0]).toHaveProperty('medicines');
        expect(Array.isArray(res.body.routines[0].medicines)).toBe(true);
        expect(res.body.routines[0].medicines.length).toBe(1);
        expect(res.body.routines[0].medicines[0]).toHaveProperty('medicineType', 'UserDefinedMedicine');
        expect(res.body.routines[0].medicines[0]).toHaveProperty('medicine');
        expect(res.body.routines[0].medicines[0].medicine).toHaveProperty('_id', medId.toString());
        expect(res.body.routines[0].medicines[0].medicine).toHaveProperty('name', 'Test Med');
        expect(res.body.routines[0].medicines[0]).toHaveProperty('schedule');
        expect(Array.isArray(res.body.routines[0].medicines[0].schedule)).toBe(true);
        expect(res.body.routines[0].medicines[0].schedule.length).toBe(1);
        expect(res.body.routines[0].medicines[0].schedule[0]).toHaveProperty('day', 'Monday');
        expect(res.body.routines[0].medicines[0].schedule[0]).toHaveProperty('times');
        expect(Array.isArray(res.body.routines[0].medicines[0].schedule[0].times)).toBe(true);
        expect(res.body.routines[0].medicines[0].schedule[0].times.length).toBe(1);
        expect(res.body.routines[0].medicines[0].schedule[0].times[0]).toBe('Morning');
        console.log(JSON.stringify(res.body, null, 2));
    });

    // // GET ROUTINE BY ID
    it('should not allow unauthenticated user to get a routine by id', async () => {
        const res = await request(app)
            .get('/api/routine/123456789012345678901234');
        expect(res.statusCode).toBe(401);
    });

    it('should return 404 if routine does not exist for user', async () => {
        const fakeRoutineId = new mongoose.Types.ObjectId();
        const res = await request(app)
            .get(`/api/routine/${fakeRoutineId}`)
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toBe(404);
        expect(res.body.message).toMatch(/Could not find routine/);
    });

    it('should get a routine by id for authenticated user', async () => {
        // Create a routine first
        const routineRes = await request(app)
            .post('/api/routine')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: "RoutineById",
                medicines: [
                    {
                        medicineType: "UserDefinedMedicine",
                        medicine: medId,
                        schedule: [{ day: "Monday", times: ["Morning"] }]
                    }
                ]
            });
        const routineId = routineRes.body.routine.id;

        const res = await request(app)
            .get(`/api/routine/${routineId}`)
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('routine');
        expect(res.body.routine).toHaveProperty('id', routineId);
        expect(res.body.routine).toHaveProperty('name', 'RoutineById');
        expect(res.body.routine).toHaveProperty('medicines');
        expect(Array.isArray(res.body.routine.medicines)).toBe(true);
        expect(res.body.routine.medicines.length).toBe(1);
        expect(res.body.routine.medicines[0]).toHaveProperty('medicineType', 'UserDefinedMedicine');
        expect(res.body.routine.medicines[0]).toHaveProperty('medicine');
        expect(res.body.routine.medicines[0].medicine).toHaveProperty('_id', medId.toString());
        expect(res.body.routine.medicines[0].medicine).toHaveProperty('name', 'Test Med');
        expect(res.body.routine.medicines[0]).toHaveProperty('schedule');
        expect(Array.isArray(res.body.routine.medicines[0].schedule)).toBe(true);
        expect(res.body.routine.medicines[0].schedule.length).toBe(1);
        expect(res.body.routine.medicines[0].schedule[0]).toHaveProperty('day', 'Monday');
        expect(res.body.routine.medicines[0].schedule[0]).toHaveProperty('times');
        expect(Array.isArray(res.body.routine.medicines[0].schedule[0].times)).toBe(true);
        expect(res.body.routine.medicines[0].schedule[0].times.length).toBe(1);
        expect(res.body.routine.medicines[0].schedule[0].times[0]).toBe('Morning');
        console.log(res.body);
    });

    // // GET UPCOMING ROUTINES
    it('should not allow unauthenticated user to get upcoming routines', async () => {
        const res = await request(app)
            .get('/api/routine/upcoming');
        expect(res.statusCode).toBe(401);
    });

    it('should return 404 if user does not exist when getting upcoming routines', async () => {
        await mongoose.connection.db.collection('users').deleteMany({});
        const res = await request(app)
            .get('/api/routine/upcoming')
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toBe(404);
        expect(res.body.message).toMatch(/Could not find user/);
    });

    it('should get upcoming routines for authenticated user (empty if none scheduled for today)', async () => {
        // No routines scheduled for today
        const res = await request(app)
            .get('/api/routine/upcoming')
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.upcomingRoutines)).toBe(true);
        expect(res.body.upcomingRoutines.length).toBe(0);
        console.log(res.body);
    });

    it('should get upcoming routines for authenticated user (all scheduled times if none taken)', async () => {
        // Create Cough Syrup and Goitre Med
        const coughSyrupRes = await request(app)
            .post('/api/user-defined-medicine')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: "Cough Syrup" });
        const coughSyrupId = coughSyrupRes.body.userDefinedMedicine.id;

        const goitreMedRes = await request(app)
            .post('/api/user-defined-medicine')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: "Goitre Med" });
        const goitreMedId = goitreMedRes.body.userDefinedMedicine.id;

        // Create Throat Infection routine (Cough Syrup every day, all slots)
        await request(app)
            .post('/api/routine')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: "Throat Infection",
                medicines: [
                    {
                        medicineType: "UserDefinedMedicine",
                        medicine: coughSyrupId,
                        schedule: [
                            { day: "Monday", times: ["Morning", "Afternoon", "Evening"] },
                            { day: "Tuesday", times: ["Morning", "Afternoon", "Evening"] },
                            { day: "Wednesday", times: ["Morning", "Afternoon", "Evening"] },
                            { day: "Thursday", times: ["Morning", "Afternoon", "Evening"] },
                            { day: "Friday", times: ["Morning", "Afternoon", "Evening"] },
                            { day: "Saturday", times: ["Morning", "Afternoon", "Evening"] },
                            { day: "Sunday", times: ["Morning", "Afternoon", "Evening"] }
                        ]
                    }
                ]
            });

        // Create Goitre routine (only Sat/Sun morning)
        await request(app)
            .post('/api/routine')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: "Goitre",
                medicines: [
                    {
                        medicineType: "UserDefinedMedicine",
                        medicine: goitreMedId,
                        schedule: [
                            { day: "Saturday", times: ["Morning"] },
                            { day: "Sunday", times: ["Morning"] }
                        ]
                    }
                ]
            });

        // Assume today is Wednesday
        const today = "Wednesday";

        // Get upcoming routines
        const res = await request(app)
            .get('/api/routine/upcoming')
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.upcomingRoutines)).toBe(true);

        // Should include Throat Infection for Morning, Afternoon, Evening (Cough Syrup)
        const routines = res.body.upcomingRoutines;
        const throatRoutines = routines.filter(r => r.routineName === "Throat Infection");
        const times = throatRoutines.map(r => r.localTime);
        expect(times).toEqual(expect.arrayContaining(["Morning", "Afternoon", "Evening"]));
        // Should not include Goitre
        const hasGoitre = routines.some(r => r.routineName === "Goitre");
        expect(hasGoitre).toBe(false);
        console.log(JSON.stringify(res.body, null, 2));
    });

    it('should get upcoming routines for authenticated user (exclude times already taken)', async () => {
        // Create Cough Syrup
        const coughSyrupRes = await request(app)
            .post('/api/user-defined-medicine')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: "Cough Syrup" });
        const coughSyrupId = coughSyrupRes.body.userDefinedMedicine.id;

        // Create Throat Infection routine (Cough Syrup every day, all slots)
        const routineRes = await request(app)
            .post('/api/routine')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: "Throat Infection",
                medicines: [
                    {
                        medicineType: "UserDefinedMedicine",
                        medicine: coughSyrupId,
                        schedule: [
                            { day: "Monday", times: ["Morning", "Afternoon", "Evening"] },
                            { day: "Tuesday", times: ["Morning", "Afternoon", "Evening"] },
                            { day: "Wednesday", times: ["Morning", "Afternoon", "Evening"] },
                            { day: "Thursday", times: ["Morning", "Afternoon", "Evening"] },
                            { day: "Friday", times: ["Morning", "Afternoon", "Evening"] },
                            { day: "Saturday", times: ["Morning", "Afternoon", "Evening"] },
                            { day: "Sunday", times: ["Morning", "Afternoon", "Evening"] }
                        ]
                    }
                ]
            });
        const routineId = routineRes.body.routine.id;

        // Get routineMedicineId for Cough Syrup
        const routinesRes = await request(app)
            .get('/api/routine')
            .set('Authorization', `Bearer ${token}`);
        const throatRoutine = routinesRes.body.routines.find(r => r.name === "Throat Infection");
        console.log(JSON.stringify(throatRoutine, null, 2));
        const coughMed = throatRoutine.medicines.find(m => m.medicine.name === "Cough Syrup");

        // Mark as taken for "Morning"
        const today = "Wednesday";
        await request(app)
            .post('/api/taken')
            .set('Authorization', `Bearer ${token}`)
            .send({
                routine: routineId,
                routineMedicine: coughMed._id,
                // date must be in DD/MM/YYYY format
                date: new Date().toLocaleDateString('en-GB'),
                day: today,
                time: "Morning"
            });

        // Get upcoming routines
        const res = await request(app)
            .get('/api/routine/upcoming')
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.upcomingRoutines)).toBe(true);

        // Should only include Afternoon and Evening for Cough Syrup
        const routines = res.body.upcomingRoutines;
        const throatRoutines = routines.filter(r => r.routineName === "Throat Infection");
        const times = throatRoutines.map(r => r.localTime);
        expect(times).toEqual(expect.arrayContaining(["Afternoon", "Evening"]));
        expect(times).not.toContain("Morning");
        console.log("should get upcoming routines for authenticated user (exclude times already taken)", JSON.stringify(res.body, null, 2));
    });
});