import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { prisma } from './prisma';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import http from 'http';
import { Server } from 'socket.io';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-ridealert-key';

// --- WebSocket Setup ---
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware for sockets
io.use((socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.query.token;
  if (!token) {
    return next(new Error('Authentication error: Token missing'));
  }
  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return next(new Error('Authentication error: Invalid token'));
    // We only scope admin connections by companyId
    if (user.role === 'ADMIN' && user.companyId) {
      socket.data.user = user;
      next();
    } else {
      return next(new Error('Authentication error: Only admins can subscribe to real-time events'));
    }
  });
});

io.on('connection', (socket) => {
  const companyId = socket.data.user.companyId;
  console.log(`[Socket] Admin connected to company channel: ${companyId}`);
  socket.join(companyId);

  socket.on('disconnect', () => {
    console.log(`[Socket] Admin disconnected from company channel: ${companyId}`);
  });
});

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
app.post('/api/auth/admin-signup', async (req: any, res: any) => {
  try {
    const { companyName, username, email, password } = req.body;
    
    if (!companyName || !username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }]
      }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email or Username is already registered.' });
    }

    const company = await prisma.company.create({
      data: { companyName }
    });

    const passwordHash = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
      data: {
        companyId: company.id,
        email,
        username,
        passwordHash,
        role: 'ADMIN'
      }
    });

    const token = jwt.sign({ role: 'ADMIN', email: user.email, companyId: company.id }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, role: 'ADMIN', companyId: company.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create account.' });
  }
});

app.post('/api/auth/admin-login', async (req: any, res: any) => {
  try {
    const { identifier, password } = req.body; // Can be email or username
    
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }]
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email/password, please try again.' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email/password, please try again.' });
    }

    const token = jwt.sign({ role: user.role, email: user.email, companyId: user.companyId }, JWT_SECRET, { expiresIn: '24h' });
    return res.json({ token, role: user.role, companyId: user.companyId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/driver-login', async (req: any, res: any) => {
  try {
    const { driverId } = req.body;
    const driver = await prisma.driver.findUnique({ where: { id: driverId } });
    
    if (!driver) {
      return res.status(401).json({ error: 'No driver found matching this Driver ID. Please contact your Company Manager.' });
    }
    
    const token = jwt.sign({ role: 'DRIVER', driverId, companyId: driver.companyId }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, driverId, name: driver.name, companyId: driver.companyId });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/drivers', authenticateJWT, async (req: any, res: any) => {
  try {
    if (req.user?.role !== 'ADMIN' || !req.user?.companyId) return res.status(403).json({ error: 'Forbidden' });
    
    const { driverId, name, address, personalContact, parentContact, hasLicence } = req.body;
    
    if (!driverId || !name || !address || !personalContact || !parentContact) {
      return res.status(400).json({ error: 'All fields (Driver ID, Name, Address, Personal Contact, Parent Contact) are required.' });
    }
    
    const driver = await prisma.driver.create({
      data: {
        id: driverId,
        companyId: req.user.companyId,
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
    
    const driver = await prisma.driver.findUnique({ where: { id: driverId, companyId: req.user.companyId } });
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
    const companyId = req.user.companyId;
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
        companyId,
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

// 1. Start a trip
app.post('/api/trips', authenticateJWT, async (req: any, res: any) => {
  try {
    const { driverId, vehicleId, deviceId, startTimestamp } = req.body;
    const companyId = req.user.companyId;
    
    let createdVehicleId = null;
    if (vehicleId) {
      const vehicle = await prisma.vehicle.upsert({
        where: { registrationNumber: vehicleId }, 
        update: {},
        create: { registrationNumber: vehicleId, vehicleType: 'TWO_WHEELER', companyId }
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
        companyId,
        driverId,
        vehicleId: createdVehicleId,
        deviceId: createdDeviceId,
        startTimestamp: startTimestamp ? new Date(startTimestamp) : new Date(),
        status: 'ACTIVE'
      }
    });
    
    // Broadcast trip status change
    io.to(companyId).emit('trip_status_change', { driverId, status: 'ACTIVE' });
    
    res.json({ tripId: trip.id, status: trip.status });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to start trip' });
  }
});

// 2. End a trip
app.patch('/api/trips/:tripId/end', authenticateJWT, async (req: any, res: any) => {
  try {
    const { tripId } = req.params;
    const { endTimestamp } = req.body || {};
    
    // Validate company access
    const existingTrip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!existingTrip || existingTrip.companyId !== req.user.companyId) {
      return res.status(404).json({ error: 'Trip not found.' });
    }

    const trip = await prisma.trip.update({
      where: { id: tripId },
      data: {
        endTimestamp: endTimestamp ? new Date(endTimestamp) : new Date(),
        status: 'COMPLETED'
      }
    });
    
    // Broadcast trip status change
    io.to(req.user.companyId).emit('trip_status_change', { driverId: trip.driverId, status: 'COMPLETED' });
    
    res.json({ success: true, trip });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to end trip' });
  }
});

// 3. Log a fatigue event
app.post('/api/trips/:tripId/fatigue-events', authenticateJWT, async (req: any, res: any) => {
  try {
    const { tripId } = req.params;
    const { timestamp, fatigueLevel, primarySignal, lightCondition, eyeClosureScore, driftScore, latitude, longitude } = req.body;
    
    const parsedTimestamp = isNaN(Number(timestamp)) ? new Date(timestamp) : new Date(Number(timestamp));

    const trip = await prisma.trip.findUnique({ where: { id: tripId }, include: { driver: true } });
    if (!trip || trip.companyId !== req.user.companyId) {
      return res.status(404).json({ error: 'Trip not found or unauthorized.' });
    }

    const event = await prisma.fatigueEvent.create({
      data: {
        companyId: req.user.companyId,
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
    
    if (fatigueLevel === 'CRITICAL') {
      if (trip.driverId) {
        await prisma.alert.create({
          data: {
            companyId: req.user.companyId,
            fatigueEventId: event.id,
            driverId: trip.driverId,
            severity: 'CRITICAL'
          }
        });
      }
    }

    // BROADCAST event to the specific company room via WebSockets
    const eventPayload = {
      ...event,
      trip: {
        id: trip.id,
        driverId: trip.driverId,
        driver: { name: trip.driver?.name }
      }
    };
    io.to(req.user.companyId).emit('fatigue_event', eventPayload);
    
    res.json({ success: true, eventId: event.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to log fatigue event' });
  }
});

// 4. Fleet summary
app.get('/api/fleet/summary', authenticateJWT, async (req: any, res: any) => {
  try {
    if (req.user?.role !== 'ADMIN' || !req.user?.companyId) return res.status(403).json({ error: 'Forbidden' });

    const queryDate = req.query.date as string;
    let targetDate = new Date();
    if (queryDate) {
      targetDate = new Date(queryDate);
    }
    
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const activeTrips = await prisma.trip.findMany({
      where: { 
        companyId: req.user.companyId,
        status: 'ACTIVE',
        ...(queryDate && targetDate.toDateString() !== new Date().toDateString() ? {
          startTimestamp: {
            gte: startOfDay,
            lte: endOfDay
          }
        } : {
          startTimestamp: {
            gte: new Date(Date.now() - 2 * 60 * 60 * 1000) 
          }
        })
      },
      distinct: ['driverId'],
      select: { driverId: true }
    });
    
    const fatigueFlags = await prisma.fatigueEvent.count({
      where: {
        companyId: req.user.companyId,
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
      activeDrivers: activeTrips.length,
      fatigueFlagsToday: fatigueFlags
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

// 5. Driver fatigue trend
app.get('/api/drivers/:driverId/fatigue-trend', authenticateJWT, async (req: any, res: any) => {
  try {
    if (req.user?.role !== 'ADMIN' || !req.user?.companyId) return res.status(403).json({ error: 'Forbidden' });
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
    
    const trips = await prisma.trip.findMany({
      where: { driverId, companyId: req.user.companyId },
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
    if (req.user?.role !== 'ADMIN' || !req.user?.companyId) return res.status(403).json({ error: 'Forbidden' });
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
      where: { id: driverId, companyId: req.user.companyId }
    });

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    const trips = await prisma.trip.findMany({
      where: { 
        driverId,
        companyId: req.user.companyId,
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

    const isToday = queryDate ? new Date(queryDate).toDateString() === new Date().toDateString() : true;
    
    let status = 'INACTIVE';
    if (isToday) {
      status = trips.some(t => t.status === 'ACTIVE' && t.startTimestamp.getTime() > Date.now() - 2 * 60 * 60 * 1000) ? 'ACTIVE' : 'INACTIVE';
    } else {
      status = trips.length > 0 ? 'ACTIVE' : 'INACTIVE';
    }

    const events = trips.flatMap(t => t.fatigueEvents);
    const sortedEvents = events.sort((a, b) => b.eventTimestamp.getTime() - a.eventTimestamp.getTime());
    
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
      summary: { fatigueFlags, criticalEvents, totalTrips: trips.length },
      fatigueTrend: { events: trendEvents },
      recentAlerts: incidents,
      incidents: incidents
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch driver overview' });
  }
});

// 6. Get all map incidents
app.get('/api/fleet/incidents', authenticateJWT, async (req: any, res: any) => {
  try {
    if (req.user?.role !== 'ADMIN' || !req.user?.companyId) return res.status(403).json({ error: 'Forbidden' });
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
        companyId: req.user.companyId,
        fatigueLevel: { in: ['WARNING', 'CRITICAL'] },
        eventTimestamp: { gte: startOfDay, lte: endOfDay }
      },
      include: {
        trip: { include: { driver: true } }
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
app.get('/api/fleet/drivers', authenticateJWT, async (req: any, res: any) => {
  try {
    if (req.user?.role !== 'ADMIN' || !req.user?.companyId) return res.status(403).json({ error: 'Forbidden' });
    const drivers = await prisma.driver.findMany({
      where: { companyId: req.user.companyId },
      include: {
        _count: { select: { trips: true, alerts: true } },
        trips: { orderBy: { startTimestamp: 'desc' }, take: 1 }
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
    if (req.user?.role !== 'ADMIN' || !req.user?.companyId) return res.status(403).json({ error: 'Forbidden' });
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    
    const deletedEvents = await prisma.fatigueEvent.deleteMany({
      where: {
        companyId: req.user.companyId,
        eventTimestamp: { lt: cutoffDate }
      }
    });
    
    const deletedTrips = await prisma.trip.deleteMany({
      where: {
        companyId: req.user.companyId,
        startTimestamp: { lt: cutoffDate }
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
    if (req.user?.role !== 'ADMIN' || !req.user?.companyId) return res.status(403).json({ error: 'Forbidden' });
    const { driverId } = req.params;
    
    const driver = await prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver || driver.companyId !== req.user.companyId) {
      return res.status(404).json({ error: 'Driver not found or unauthorized' });
    }

    await prisma.driver.delete({ where: { id: driverId } });
    
    res.json({ success: true, message: 'Driver deleted successfully' });
  } catch (error) {
    console.error('Delete Driver Error:', error);
    res.status(500).json({ error: 'Failed to delete driver' });
  }
});

server.listen(port, () => {
  console.log(`RideAlert Backend (Multi-Tenant) running on port ${port}`);
});
