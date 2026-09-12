import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanup() {
  console.log('Starting cleanup of orphaned records...');

  try {
    // 1. Delete trips where driver doesn't exist
    // First, find all driver IDs in the DB
    const drivers = await prisma.driver.findMany({ select: { id: true } });
    const validDriverIds = drivers.map(d => d.id);

    // Delete trips where driverId is null, OR driverId is not in the valid list
    const deletedTrips = await prisma.trip.deleteMany({
      where: {
        OR: [
          { driverId: null },
          { driverId: { notIn: validDriverIds } }
        ]
      }
    });
    console.log(`Deleted ${deletedTrips.count} orphaned trips.`);

    // 2. Delete fatigue events where trip doesn't exist
    const trips = await prisma.trip.findMany({ select: { id: true } });
    const validTripIds = trips.map(t => t.id);

    const deletedEvents = await prisma.fatigueEvent.deleteMany({
      where: {
        OR: [
          { tripId: null },
          { tripId: { notIn: validTripIds } }
        ]
      }
    });
    console.log(`Deleted ${deletedEvents.count} orphaned fatigue events.`);

    // 3. Delete alerts where driver or fatigue event doesn't exist
    const events = await prisma.fatigueEvent.findMany({ select: { id: true } });
    const validEventIds = events.map(e => e.id);

    const deletedAlerts = await prisma.alert.deleteMany({
      where: {
        OR: [
          { driverId: null },
          { driverId: { notIn: validDriverIds } },
          { fatigueEventId: null },
          { fatigueEventId: { notIn: validEventIds } }
        ]
      }
    });
    console.log(`Deleted ${deletedAlerts.count} orphaned alerts.`);

    // 4. Update devices to set driverId = null if driver doesn't exist
    const unassignedDevices = await prisma.device.updateMany({
      where: {
        driverId: { not: null, notIn: validDriverIds }
      },
      data: {
        driverId: null
      }
    });
    console.log(`Unassigned ${unassignedDevices.count} devices from deleted drivers.`);

    console.log('Cleanup completed successfully!');
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();
