// Run this ONCE after your first Clerk sign-up to become ADMIN.
// Usage: npx tsx prisma/promote-admin.ts <clerkId> <email> <fullName>
//
// Find your Clerk ID: Clerk Dashboard → Users → click your user → copy "User ID"

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const [clerkId, email, fullName] = process.argv.slice(2);

  if (!clerkId || !email || !fullName) {
    console.error('Usage: npx tsx prisma/promote-admin.ts <clerkId> <email> "<Full Name>"');
    process.exit(1);
  }

  const user = await prisma.user.upsert({
    where: { clerkId },
    update: { role: 'ADMIN', status: 'ACTIVE' },
    create: {
      clerkId,
      email,
      fullName,
      role: 'ADMIN',
      isSenior: true,
      status: 'ACTIVE',
      ndaAccepted: true,
      ndaAcceptedAt: new Date(),
    },
  });

  console.log('✓ Promoted to ADMIN:', user);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
