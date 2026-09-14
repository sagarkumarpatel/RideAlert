import { prisma } from './src/prisma';
async function main() {
  const events = await prisma.fatigueEvent.findMany();
  console.log('Events count:', events.length);
  if (events.length > 0) {
    console.log('Last event:', events[events.length - 1]);
  }
}
main();
