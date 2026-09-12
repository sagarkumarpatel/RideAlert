import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetDb() {
  console.log('Resetting all database tables...');
  try {
    // We use TRUNCATE with CASCADE to clear all tables cleanly.
    // Because Prisma uses UUIDs for this schema, there are no auto-increment sequences to reset.
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "SyncLog", "Alert", "FatigueEvent", "Trip", "Device", "Vehicle", "Driver", "User", "Fleet" CASCADE;`);
    console.log('Database reset successfully. All demo data has been cleared.');
  } catch (error) {
    console.error('Error resetting database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetDb();
