import { prisma } from './src/prisma';
async function main() {
  const activeTrips = await prisma.trip.findMany({ where: { status: 'ACTIVE' } });
  console.log('Active trips:', activeTrips);
}
main();
