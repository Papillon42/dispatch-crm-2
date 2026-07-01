import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Company settings (singleton)
  const existingSettings = await prisma.companySettings.findFirst();
  if (!existingSettings) {
    await prisma.companySettings.create({
      data: {
        companyName: 'Your Dispatch Co.',
        companyPercentage: 10.0,
        seniorCommissionRate: 1.5,
        targetRpm: 2.5,
        fixedExpenses: 5000,
        timezone: 'America/Chicago',
      },
    });
    console.log('✓ Company settings created');
  }

  // NOTE: Admin user creation requires a real Clerk ID.
  // After signing up via Clerk in the app, run this to promote yourself to ADMIN:
  //
  //   npx tsx prisma/promote-admin.ts <your-clerk-id> <your-email> <your-name>
  //
  console.log('Seed complete. Sign up via /login, then promote yourself to ADMIN (see prisma/promote-admin.ts).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
