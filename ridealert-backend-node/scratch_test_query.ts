import { prisma } from './src/prisma';
async function main() {
  const queryDate = '2026-09-14';
  let targetDate = new Date();
  if (queryDate) {
    targetDate = new Date(queryDate);
  }
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);
  
  console.log('Querying from', startOfDay, 'to', endOfDay);

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
    take: 50
  });

  console.log('Events returned:', events.length);
  if(events.length > 0) {
      console.log('Last event:', events[0]);
  }
}
main();
