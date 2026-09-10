import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { prisma } from './prisma';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

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
    const { timestamp, fatigueLevel, primarySignal, lightCondition, eyeClosureScore, driftScore } = req.body;
    
    const event = await prisma.fatigueEvent.create({
      data: {
        tripId,
        eventTimestamp: new Date(timestamp),
        fatigueLevel,
        primarySignal,
        lightCondition,
        eyeClosureScore,
        driftScore
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
app.get('/api/fleet/summary', async (req, res) => {
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
app.get('/api/drivers/:driverId/fatigue-trend', async (req, res) => {
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

app.listen(port, () => {
  console.log(`RideAlert Backend running on port ${port}`);
});
