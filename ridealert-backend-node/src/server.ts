import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { prisma } from './prisma';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-ridealert-key';

// --- Auth Middleware ---
const authenticateJWT = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  } else {
    res.sendStatus(401);
  }
};

// --- Auth Routes ---
app.post('/api/auth/admin-login', async (req, res) => {
  // For MVP, hardcode an admin login if not in DB
  const { email, password } = req.body;
  if (email === 'admin@ridealert.com' && password === 'admin123') {
    const token = jwt.sign({ role: 'ADMIN', email }, JWT_SECRET, { expiresIn: '24h' });
    return res.json({ token, role: 'ADMIN' });
  }
  res.status(401).json({ error: 'Invalid credentials' });
});

app.post('/api/auth/driver-login', async (req, res) => {
  // For MVP, drivers can log in with just their ID
  const { driverId } = req.body;
  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!driver) {
    // Auto-create for demo purposes
    await prisma.driver.create({ data: { id: driverId, name: 'Driver ' + driverId, defaultVehicleType: 'TWO_WHEELER' } });
  }
  const token = jwt.sign({ role: 'DRIVER', driverId }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, driverId, name: driver?.name || ('Driver ' + driverId) });
});

// API Endpoints

// 1. Start a trip
app.post('/api/trips', async (req, res) => {
  try {
    const { driverId, vehicleId, deviceId, startTimestamp } = req.body;
    
    // Auto-create reference data for the MVP to satisfy foreign key constraints
    if (driverId) {
      await prisma.driver.upsert({
        where: { id: driverId },
        update: {},
        create: { id: driverId, name: 'Demo Driver', defaultVehicleType: 'TWO_WHEELER' }
      });
    }
    
    if (vehicleId) {
      await prisma.vehicle.upsert({
        where: { registrationNumber: vehicleId }, // Wait, id is uuid by default, registrationNumber is unique
        update: {},
        create: { id: vehicleId, registrationNumber: vehicleId, vehicleType: 'TWO_WHEELER' }
      });
    }
    
    if (deviceId) {
      await prisma.device.upsert({
        where: { deviceIdentifier: deviceId }, // deviceIdentifier is unique
        update: {},
        create: { id: deviceId, deviceIdentifier: deviceId, driverId }
      });
    }
    const trip = await prisma.trip.create({
      data: {
        driverId,
        vehicleId,
        deviceId,
        startTimestamp: startTimestamp ? new Date(startTimestamp) : new Date(),
        status: 'ACTIVE'
      }
    });
    
    res.json({ tripId: trip.id, status: trip.status });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to start trip' });
  }
});

// 2. End a trip
app.patch('/api/trips/:tripId/end', async (req, res) => {
  try {
    const { tripId } = req.params;
    const { endTimestamp } = req.body;
    
    const trip = await prisma.trip.update({
      where: { id: tripId },
      data: {
        endTimestamp: endTimestamp ? new Date(endTimestamp) : new Date(),
        status: 'COMPLETED'
      }
    });
    
    res.json({ success: true, trip });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to end trip' });
  }
});

// 3. Log a fatigue event
app.post('/api/trips/:tripId/fatigue-events', async (req, res) => {
  try {
    const { tripId } = req.params;
    const { timestamp, fatigueLevel, primarySignal, lightCondition, eyeClosureScore, driftScore, latitude, longitude } = req.body;
    
    const event = await prisma.fatigueEvent.create({
      data: {
        tripId,
        eventTimestamp: new Date(timestamp),
        fatigueLevel,
        primarySignal,
        lightCondition,
        eyeClosureScore,
        driftScore,
        latitude,
        longitude
      }
    });
    
    // Auto-escalate to alert if CRITICAL
    if (fatigueLevel === 'CRITICAL') {
      const trip = await prisma.trip.findUnique({ where: { id: tripId } });
      if (trip?.driverId) {
        await prisma.alert.create({
          data: {
            fatigueEventId: event.id,
            driverId: trip.driverId,
            severity: 'CRITICAL'
          }
        });
      }
    }
    
    res.json({ success: true, eventId: event.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to log fatigue event' });
  }
});

// 4. Fleet summary
app.get('/api/fleet/summary', authenticateJWT, async (req, res) => {
  try {
    const activeTrips = await prisma.trip.count({
      where: { status: 'ACTIVE' }
    });
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const fatigueFlagsToday = await prisma.fatigueEvent.count({
      where: {
        eventTimestamp: {
          gte: today
        },
        fatigueLevel: {
          in: ['WARNING', 'CRITICAL']
        }
      }
    });
    
    res.json({
      activeDrivers: activeTrips, // Using active trips as proxy for active drivers
      fatigueFlagsToday
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

// 5. Driver fatigue trend
app.get('/api/drivers/:driverId/fatigue-trend', authenticateJWT, async (req, res) => {
  try {
    const { driverId } = req.params;
    
    // In a real application, you would do a proper group by date
    // For MVP, we will just fetch events for this driver's trips and return them
    const trips = await prisma.trip.findMany({
      where: { driverId },
      include: {
        fatigueEvents: {
          orderBy: { eventTimestamp: 'asc' }
        }
      }
    });
    
    const events = trips.flatMap(t => t.fatigueEvents);
    
    res.json({
      driverId,
      events
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch trend' });
  }
});

// 6. Get all map incidents
app.get('/api/fleet/incidents', authenticateJWT, async (req, res) => {
  try {
    const events = await prisma.fatigueEvent.findMany({
      where: {
        fatigueLevel: { in: ['WARNING', 'CRITICAL'] },
        latitude: { not: null },
        longitude: { not: null }
      },
      include: {
        trip: {
          include: { driver: true }
        }
      },
      orderBy: { eventTimestamp: 'desc' },
      take: 100
    });
    
    res.json(events);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch map incidents' });
  }
});

app.listen(port, () => {
  console.log(`RideAlert Backend running on port ${port}`);
});
