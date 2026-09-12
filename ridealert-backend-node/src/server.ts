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
  const { driverId } = req.body;
  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  
  if (!driver) {
    return res.status(401).json({ error: 'No driver found matching this Driver ID. Please contact your Fleet Manager.' });
  }
  
  const token = jwt.sign({ role: 'DRIVER', driverId }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, driverId, name: driver.name });
});

app.post('/api/drivers', authenticateJWT, async (req: any, res: any) => {
  try {
    if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
    
    const { driverId, name, address, personalContact, parentContact, hasLicence } = req.body;
    
    if (!driverId || !name || !address || !personalContact || !parentContact) {
      return res.status(400).json({ error: 'All fields (Driver ID, Name, Address, Personal Contact, Parent Contact) are required.' });
    }
    
    const driver = await prisma.driver.create({
      data: {
        id: driverId,
        name,
        address,
        personalContact,
        parentContact,
        hasLicence: !!hasLicence,
        defaultVehicleType: 'TWO_WHEELER'
      }
    });
    
    res.json({ success: true, driver });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create driver' });
  }
});

app.get('/api/drivers/me', authenticateJWT, async (req: any, res: any) => {
  try {
    if (req.user?.role !== 'DRIVER') return res.status(403).json({ error: 'Forbidden' });
    const driverId = req.user.driverId;
    
    const driver = await prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) return res.status(404).json({ error: 'Driver not found' });
    
    res.json(driver);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch driver profile' });
  }
});

app.get('/api/drivers/me/overview', authenticateJWT, async (req: any, res: any) => {
  try {
    if (req.user?.role !== 'DRIVER') return res.status(403).json({ error: 'Forbidden' });
    const driverId = req.user.driverId;
    const queryDate = req.query.date as string;
    
    let targetDate = new Date();
    if (queryDate) {
      targetDate = new Date(queryDate);
    }
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const trips = await prisma.trip.findMany({
      where: { 
        driverId,
        startTimestamp: { lte: endOfDay },
        OR: [
          { endTimestamp: null },
          { endTimestamp: { gte: startOfDay } }
        ]
      },
      include: {
        fatigueEvents: {
          where: {
            eventTimestamp: { gte: startOfDay, lte: endOfDay }
          },
          orderBy: { eventTimestamp: 'desc' }
        }
      }
    });

    const events = trips.flatMap(t => t.fatigueEvents);
    const sortedEvents = events.sort((a, b) => b.eventTimestamp.getTime() - a.eventTimestamp.getTime());
    
    const incidents = sortedEvents.filter(e => e.fatigueLevel === 'WARNING' || e.fatigueLevel === 'CRITICAL');
    const fatigueFlags = incidents.length;
    const criticalEvents = incidents.filter(e => e.fatigueLevel === 'CRITICAL').length;
    const trendEvents = [...sortedEvents].sort((a, b) => a.eventTimestamp.getTime() - b.eventTimestamp.getTime());

    res.json({
      summary: {
        fatigueFlags,
        criticalEvents,
        totalTrips: trips.length
      },
      fatigueTrend: { events: trendEvents },
      recentAlerts: incidents
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch driver overview' });
  }
});

// API Endpoints

// 1. Start a trip
app.post('/api/trips', authenticateJWT, async (req, res) => {
  try {
    const { driverId, vehicleId, deviceId, startTimestamp } = req.body;
    
    // Remove auto-create reference data for the MVP to satisfy strict foreign key constraints
    
    let createdVehicleId = null;
    if (vehicleId) {
      const vehicle = await prisma.vehicle.upsert({
        where: { registrationNumber: vehicleId }, 
        update: {},
        create: { registrationNumber: vehicleId, vehicleType: 'TWO_WHEELER' }
      });
      createdVehicleId = vehicle.id;
    }
    
    let createdDeviceId = null;
    if (deviceId) {
      const device = await prisma.device.upsert({
        where: { deviceIdentifier: deviceId },
        update: {},
        create: { deviceIdentifier: deviceId, driverId }
      });
      createdDeviceId = device.id;
    }
    const trip = await prisma.trip.create({
      data: {
        driverId,
        vehicleId: createdVehicleId,
        deviceId: createdDeviceId,
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
app.patch('/api/trips/:tripId/end', authenticateJWT, async (req, res) => {
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
app.post('/api/trips/:tripId/fatigue-events', authenticateJWT, async (req, res) => {
  try {
    const { tripId } = req.params;
    const { timestamp, fatigueLevel, primarySignal, lightCondition, eyeClosureScore, driftScore, latitude, longitude } = req.body;
    
    // If timestamp is a numeric string (e.g., "1726090432134"), convert it to a number first
    const parsedTimestamp = isNaN(Number(timestamp)) ? new Date(timestamp) : new Date(Number(timestamp));

    const event = await prisma.fatigueEvent.create({
      data: {
        tripId,
        eventTimestamp: parsedTimestamp,
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
    const queryDate = req.query.date as string;
    let targetDate = new Date();
    if (queryDate) {
      targetDate = new Date(queryDate);
    }
    
    // Set to start and end of the target day
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const activeTrips = await prisma.trip.count({
      where: { 
        status: 'ACTIVE',
        // Note: For active drivers on historical days, a better approach might be checking if they had ANY trip on that day.
        // For MVP, if it's today, we check ACTIVE. If historical, we just count trips on that day.
        ...(queryDate && targetDate.toDateString() !== new Date().toDateString() ? {
          startTimestamp: {
            gte: startOfDay,
            lte: endOfDay
          }
        } : {})
      }
    });
    
    const fatigueFlags = await prisma.fatigueEvent.count({
      where: {
        eventTimestamp: {
          gte: startOfDay,
          lte: endOfDay
        },
        fatigueLevel: {
          in: ['WARNING', 'CRITICAL']
        }
      }
    });
    
    res.json({
      activeDrivers: activeTrips, // Using trips as proxy
      fatigueFlagsToday: fatigueFlags
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
    const queryDate = req.query.date as string;
    
    let targetDate = new Date();
    if (queryDate) {
      targetDate = new Date(queryDate);
    }
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    // In a real application, you would do a proper group by date
    // For MVP, we will just fetch events for this driver's trips and return them
    const trips = await prisma.trip.findMany({
      where: { driverId },
      include: {
        fatigueEvents: {
          where: {
            eventTimestamp: {
              gte: startOfDay,
              lte: endOfDay
            }
          },
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

// 5.5 Driver Overview (Driver Details Dashboard)
app.get('/api/drivers/:driverId/overview', authenticateJWT, async (req: any, res: any) => {
  try {
    const { driverId } = req.params;
    const queryDate = req.query.date as string;
    
    let targetDate = new Date();
    if (queryDate) {
      targetDate = new Date(queryDate);
    }
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const driver = await prisma.driver.findUnique({
      where: { id: driverId }
    });

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    const trips = await prisma.trip.findMany({
      where: { 
        driverId,
        startTimestamp: {
          lte: endOfDay
        },
        OR: [
          { endTimestamp: null },
          { endTimestamp: { gte: startOfDay } }
        ]
      },
      include: {
        fatigueEvents: {
          where: {
            eventTimestamp: {
              gte: startOfDay,
              lte: endOfDay
            }
          },
          orderBy: { eventTimestamp: 'desc' }
        }
      }
    });

    const isToday = queryDate ? new Date(queryDate).toDateString() === new Date().toDateString() : true;
    
    // Status is active if there is any active trip TODAY, 
    // or if historical, if they had ANY trip that day.
    let status = 'INACTIVE';
    if (isToday) {
      status = trips.some(t => t.status === 'ACTIVE') ? 'ACTIVE' : 'INACTIVE';
    } else {
      status = trips.length > 0 ? 'ACTIVE' : 'INACTIVE';
    }

    const events = trips.flatMap(t => t.fatigueEvents);
    const sortedEvents = events.sort((a, b) => b.eventTimestamp.getTime() - a.eventTimestamp.getTime());
    
    // Map incidents need the trip and driver attached to conform with the frontend IncidentMap
    const incidents = sortedEvents
      .filter(e => e.fatigueLevel === 'WARNING' || e.fatigueLevel === 'CRITICAL')
      .map(e => ({
        ...e,
        trip: {
          id: e.tripId,
          driverId,
          driver: { name: driver.name }
        }
      }));

    const fatigueFlags = incidents.length;
    const criticalEvents = incidents.filter(e => e.fatigueLevel === 'CRITICAL').length;
    
    // Trend data needs to be sorted ascending for the chart
    const trendEvents = [...sortedEvents].sort((a, b) => a.eventTimestamp.getTime() - b.eventTimestamp.getTime());

    res.json({
      driver: {
        id: driver.id,
        name: driver.name,
        status,
        address: driver.address,
        personalContact: driver.personalContact,
        parentContact: driver.parentContact,
        hasLicence: driver.hasLicence
      },
      date: startOfDay.toISOString().split('T')[0],
      summary: {
        fatigueFlags,
        criticalEvents,
        totalTrips: trips.length
      },
      fatigueTrend: { events: trendEvents },
      recentAlerts: incidents, // using incidents for recent alerts since they are filtered to warning/critical
      incidents: incidents
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch driver overview' });
  }
});

// 6. Get all map incidents
app.get('/api/fleet/incidents', authenticateJWT, async (req, res) => {
  try {
    const queryDate = req.query.date as string;
    let targetDate = new Date();
    if (queryDate) {
      targetDate = new Date(queryDate);
    }
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const events = await prisma.fatigueEvent.findMany({
      where: {
        fatigueLevel: { in: ['WARNING', 'CRITICAL'] },
        eventTimestamp: {
          gte: startOfDay,
          lte: endOfDay
        }
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

// 7. Get all drivers
app.get('/api/fleet/drivers', authenticateJWT, async (req, res) => {
  try {
    const drivers = await prisma.driver.findMany({
      include: {
        _count: {
          select: { trips: true, alerts: true }
        },
        trips: {
          orderBy: { startTimestamp: 'desc' },
          take: 1
        }
      }
    });

    const formattedDrivers = drivers.map(d => ({
      id: d.id,
      name: d.name,
      defaultVehicleType: d.defaultVehicleType,
      totalTrips: d._count.trips,
      totalAlerts: d._count.alerts,
      latestTripStatus: d.trips[0]?.status || 'INACTIVE',
      latestTripTime: d.trips[0]?.startTimestamp || null
    }));

    res.json(formattedDrivers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch drivers' });
  }
});

// 8. Delete old data (older than 30 days)
app.delete('/api/fleet/data/old', authenticateJWT, async (req: any, res: any) => {
  try {
    if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    
    // Delete events first, then trips (due to foreign keys). Prisma might cascade, but let's be explicit if needed.
    // Assuming cascading deletes are set up in prisma for trips -> events, but let's delete events first just in case.
    const deletedEvents = await prisma.fatigueEvent.deleteMany({
      where: {
        eventTimestamp: {
          lt: cutoffDate
        }
      }
    });
    
    const deletedTrips = await prisma.trip.deleteMany({
      where: {
        startTimestamp: {
          lt: cutoffDate
        }
      }
    });
    
    res.json({ success: true, message: `Deleted ${deletedEvents.count} events and ${deletedTrips.count} trips.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete old data' });
  }
});

// 9. Delete specific driver
app.delete('/api/drivers/:driverId', authenticateJWT, async (req: any, res: any) => {
  try {
    if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
    const { driverId } = req.params;
    
    // With cascading deletes, this will remove their trips and events.
    await prisma.driver.delete({
      where: { id: driverId }
    });
    
    res.json({ success: true, message: 'Driver deleted successfully' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Driver not found or already deleted' });
    }
    console.error('Delete Driver Error:', error);
    res.status(500).json({ error: 'Failed to delete driver' });
  }
});

app.listen(port, () => {
  console.log(`RideAlert Backend running on port ${port}`);
});
