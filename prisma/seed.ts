// Dev/demo seed — fills the database with realistic data so the Dashboard
// (and every other page) render like a finished product instead of an
// empty shell. Safe to re-run: every block checks for existing data first.
//
// NOTE on Users: real accounts are created by signing up through Clerk and
// then running `npx tsx prisma/promote-admin.ts <clerkId> <email> <name>`.
// The Users seeded below use placeholder clerkId values (`seed-*`) purely
// so relations (dispatcherId, driver ownership, role counts) have realistic
// data to show — they are NOT real, loggable-in Clerk accounts.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

const CITIES: Array<{ city: string; state: string; lat: number; lng: number }> = [
  { city: 'Dallas', state: 'TX', lat: 32.7767, lng: -96.797 },
  { city: 'Chicago', state: 'IL', lat: 41.8781, lng: -87.6298 },
  { city: 'Memphis', state: 'TN', lat: 35.1495, lng: -90.049 },
  { city: 'Atlanta', state: 'GA', lat: 33.749, lng: -84.388 },
  { city: 'Los Angeles', state: 'CA', lat: 34.0522, lng: -118.2437 },
  { city: 'Phoenix', state: 'AZ', lat: 33.4484, lng: -112.074 },
  { city: 'Columbus', state: 'OH', lat: 39.9612, lng: -82.9988 },
  { city: 'Detroit', state: 'MI', lat: 42.3314, lng: -83.0458 },
  { city: 'Seattle', state: 'WA', lat: 47.6062, lng: -122.3321 },
  { city: 'Portland', state: 'OR', lat: 45.5152, lng: -122.6784 },
  { city: 'Houston', state: 'TX', lat: 29.7604, lng: -95.3698 },
  { city: 'San Antonio', state: 'TX', lat: 29.4241, lng: -98.4936 },
  { city: 'Indianapolis', state: 'IN', lat: 39.7684, lng: -86.158 },
  { city: 'Nashville', state: 'TN', lat: 36.1627, lng: -86.7816 },
  { city: 'Jacksonville', state: 'FL', lat: 30.3322, lng: -81.6557 },
  { city: 'Denver', state: 'CO', lat: 39.7392, lng: -104.9903 },
  { city: 'Kansas City', state: 'MO', lat: 39.0997, lng: -94.5786 },
  { city: 'St. Louis', state: 'MO', lat: 38.627, lng: -90.1994 },
  { city: 'New York', state: 'NY', lat: 40.7128, lng: -74.006 },
  { city: 'Charlotte', state: 'NC', lat: 35.2271, lng: -80.8431 },
];

const CLIENT_NAMES = [
  'Eagle Freight LLC', 'Southern Star Logistics', 'Midwest Carriers Inc.',
  'Blue Horizon Transport', 'Pioneer Trucking Co.', 'Summit Freight Solutions',
  'Lone Star Hauling', 'Great Lakes Logistics',
];

const DRIVER_NAMES = [
  'Иван Петров', 'Алексей Смирнов', 'Виктор Козлов', 'Дмитрий Волков', 'Сергей Морозов',
  'Michael Johnson', 'James Rodriguez', 'Robert Martinez', 'David Anderson', 'William Garcia',
  'Николай Соколов', 'Андрей Лебедев', 'Олег Новиков', 'Павел Крылов', 'Максим Захаров',
  'Christopher Lee', 'Daniel Thompson', 'Matthew White', 'Anthony Harris', 'Joshua Clark',
  'Игорь Фролов', 'Роман Быков', 'Виталий Орлов', 'Артём Гусев', 'Станислав Кузнецов',
  'Joseph Lewis', 'Charles Walker', 'Thomas Hall', 'Kevin Young', 'Brian King',
  'Юрий Медведев', 'Владимир Титов', 'Евгений Комаров', 'Денис Воробьёв', 'Григорий Соловьёв',
  'Steven Wright', 'Timothy Scott', 'Richard Green', 'Ronald Baker', 'Edward Adams',
];

const LOAD_STATUS_POOL: string[] = [
  'NEW_LEAD', 'NEGOTIATING', 'BOOKED', 'BOOKED', 'ASSIGNED', 'ASSIGNED',
  'EN_ROUTE_TO_PICKUP', 'AT_PICKUP', 'LOADED', 'IN_TRANSIT', 'IN_TRANSIT', 'IN_TRANSIT',
  'AT_DELIVERY', 'DELIVERED', 'POD_UPLOADED', 'INVOICED', 'INVOICED', 'PAID', 'PAID',
  'CLOSED', 'CLOSED', 'CANCELLED', 'PROBLEM',
];

async function main() {
  console.log('Seeding database...');

  // ── Company settings ──────────────────────────────────────────────────
  const existingSettings = await prisma.companySettings.findFirst();
  if (!existingSettings) {
    await prisma.companySettings.create({
      data: {
        companyName: 'Dispatch CRM Demo Co.',
        companyPercentage: 10.0,
        seniorCommissionRate: 1.5,
        targetRpm: 2.5,
        fixedExpenses: 5000,
        timezone: 'America/Chicago',
      },
    });
    console.log('✓ Company settings created');
  }

  // ── Placeholder demo users (role summary, dispatcher assignment) ───────
  const userCount = await prisma.user.count();
  let users: Awaited<ReturnType<typeof prisma.user.create>>[] = [];
  if (userCount === 0) {
    const seedUsers = [
      { role: 'ADMIN', fullName: 'Иван Петров', email: 'ivan.petrov@dispatchcrm.demo', isSenior: true },
      { role: 'SENIOR_DISPATCHER', fullName: 'Алексей Смирнов', email: 'alexey.smirnov@dispatchcrm.demo', isSenior: true },
      { role: 'DISPATCHER', fullName: 'Мария Иванова', email: 'maria.ivanova@dispatchcrm.demo', isSenior: false },
      { role: 'DISPATCHER', fullName: 'Sarah Mitchell', email: 'sarah.mitchell@dispatchcrm.demo', isSenior: false },
      { role: 'UPDATER', fullName: 'Дмитрий Волков', email: 'dmitry.volkov@dispatchcrm.demo', isSenior: false },
      { role: 'FINANCE', fullName: 'Елена Кузнецова', email: 'elena.kuznetsova@dispatchcrm.demo', isSenior: false },
    ];
    for (let i = 0; i < seedUsers.length; i++) {
      const u = seedUsers[i];
      const created = await prisma.user.create({
        data: {
          clerkId: `seed-${u.role.toLowerCase()}-${i}`,
          fullName: u.fullName,
          email: u.email,
          role: u.role as any,
          isSenior: u.isSenior,
          status: 'ACTIVE',
        },
      });
      users.push(created);
    }
    console.log(`✓ ${users.length} placeholder demo users created (role: dispatcher/updater/finance/admin)`);
  } else {
    users = await prisma.user.findMany();
  }

  const dispatchers = users.filter((u) => u.role === 'DISPATCHER' || u.role === 'SENIOR_DISPATCHER');
  const updaters = users.filter((u) => u.role === 'UPDATER');

  // ── Clients ──────────────────────────────────────────────────────────
  const clientCount = await prisma.client.count();
  let clients: Awaited<ReturnType<typeof prisma.client.create>>[] = [];
  if (clientCount === 0) {
    for (const name of CLIENT_NAMES) {
      const c = await prisma.client.create({
        data: {
          name,
          status: 'ACTIVE',
          dispatcherId: dispatchers.length ? rand(dispatchers).id : undefined,
        } as any,
      });
      clients.push(c);
    }
    console.log(`✓ ${clients.length} clients created`);
  } else {
    clients = await prisma.client.findMany();
  }

  // ── Trucks ───────────────────────────────────────────────────────────
  const truckCount = await prisma.truck.count();
  let trucks: Awaited<ReturnType<typeof prisma.truck.create>>[] = [];
  if (truckCount === 0 && clients.length) {
    for (let i = 0; i < 16; i++) {
      const t = await prisma.truck.create({
        data: {
          clientId: rand(clients).id,
          truckNumber: `TRK-${1000 + i}`,
          trailerType: rand(['DRY_VAN', 'REEFER', 'FLATBED']) as any,
          maintenanceStatus: rand(['OK', 'OK', 'OK', 'DUE_SOON']) as any,
          year: randInt(2018, 2024),
          make: rand(['Freightliner', 'Peterbilt', 'Kenworth', 'Volvo']),
          model: 'Cascadia',
        },
      });
      trucks.push(t);
    }
    console.log(`✓ ${trucks.length} trucks created`);
  } else {
    trucks = await prisma.truck.findMany();
  }

  // ── Drivers ──────────────────────────────────────────────────────────
  const driverCount = await prisma.driver.count();
  let drivers: Awaited<ReturnType<typeof prisma.driver.create>>[] = [];
  if (driverCount === 0 && clients.length) {
    for (let i = 0; i < DRIVER_NAMES.length; i++) {
      const home = rand(CITIES);
      const status = rand(['AVAILABLE', 'AVAILABLE', 'ON_LOAD', 'ON_LOAD', 'ON_LOAD', 'OFF_DUTY', 'INACTIVE']);
      const truck = trucks.find((t) => !drivers.some((d) => d.currentTruckId === t.id));
      const d = await prisma.driver.create({
        data: {
          clientId: rand(clients).id,
          fullName: DRIVER_NAMES[i],
          phone: `+1-${randInt(200, 999)}-555-${String(randInt(1000, 9999))}`,
          status: status as any,
          homeBase: `${home.city}, ${home.state}`,
          score: randInt(72, 100),
          dispatcherId: dispatchers.length ? rand(dispatchers).id : undefined,
          updaterId: updaters.length ? rand(updaters).id : undefined,
          currentTruckId: status !== 'INACTIVE' && truck ? truck.id : undefined,
        } as any,
      });
      drivers.push(d);
    }
    console.log(`✓ ${drivers.length} drivers created`);
  } else {
    drivers = await prisma.driver.findMany();
  }

  // ── Loads (+ status history, invoices, location updates) ───────────────
  const loadCount = await prisma.load.count();
  if (loadCount === 0 && clients.length && drivers.length) {
    let created = 0;
    for (let i = 0; i < 70; i++) {
      const status = rand(LOAD_STATUS_POOL);
      const pickup = rand(CITIES);
      let delivery = rand(CITIES);
      while (delivery.city === pickup.city) delivery = rand(CITIES);

      const totalMiles = randInt(180, 2400);
      const rate = Math.round(totalMiles * (1.8 + Math.random() * 1.4));
      const createdAt = daysAgo(randInt(0, 55));
      const isDispatched = ![
        'NEW_LEAD', 'NEGOTIATING',
      ].includes(status);
      const isActiveOnRoad = ['ASSIGNED', 'EN_ROUTE_TO_PICKUP', 'AT_PICKUP', 'LOADED', 'IN_TRANSIT', 'AT_DELIVERY', 'PROBLEM'].includes(status);
      const driver = isDispatched ? rand(drivers.filter((d) => d.status !== 'INACTIVE')) : undefined;
      const truck = driver?.currentTruckId ? trucks.find((t) => t.id === driver.currentTruckId) : undefined;

      const load = await prisma.load.create({
        data: {
          clientId: rand(clients).id,
          dispatcherId: dispatchers.length ? rand(dispatchers).id : undefined,
          updaterId: updaters.length && isActiveOnRoad ? rand(updaters).id : undefined,
          driverId: driver?.id,
          truckId: truck?.id,
          pickupCity: pickup.city,
          pickupState: pickup.state,
          pickupLat: pickup.lat,
          pickupLng: pickup.lng,
          pickupAt: createdAt,
          deliveryCity: delivery.city,
          deliveryState: delivery.state,
          deliveryLat: delivery.lat,
          deliveryLng: delivery.lng,
          deliveryAt: new Date(createdAt.getTime() + 1000 * 60 * 60 * randInt(12, 72)),
          rate,
          totalMiles,
          loadedMiles: totalMiles,
          rpm: parseFloat((rate / totalMiles).toFixed(2)),
          commodity: rand(['General Freight', 'Produce', 'Electronics', 'Building Materials', 'Automotive Parts']),
          equipmentType: rand(['DRY_VAN', 'REEFER', 'FLATBED']) as any,
          status: status as any,
          invoiceStatus: ['INVOICED', 'PAID', 'CLOSED'].includes(status) ? 'PAID' : 'PENDING',
          paymentStatus: status === 'PAID' || status === 'CLOSED' ? 'RECEIVED' : 'PENDING',
          createdAt,
          updatedAt: new Date(createdAt.getTime() + 1000 * 60 * 60 * randInt(1, 48)),
        } as any,
      });
      created++;

      // Status history (at least one transition)
      await prisma.loadStatusHistory.create({
        data: {
          loadId: load.id,
          fromStatus: 'NEW_LEAD',
          toStatus: status as any,
          changedById: dispatchers.length ? rand(dispatchers).id : undefined,
          source: 'CRM',
          at: load.updatedAt,
        },
      });

      // Location update for on-the-road loads, so the fleet map has markers
      if (isActiveOnRoad && driver) {
        const progress = Math.random();
        const lat = pickup.lat + (delivery.lat - pickup.lat) * progress;
        const lng = pickup.lng + (delivery.lng - pickup.lng) * progress;
        await prisma.locationUpdate.create({
          data: {
            driverId: driver.id,
            loadId: load.id,
            lat, lng,
            label: `${Math.round(progress * 100)}% маршрута`,
            source: 'MANUAL',
            eta: new Date(Date.now() + 1000 * 60 * 60 * randInt(2, 36)),
            etaLabel: `через ${randInt(2, 36)} ч`,
            updatedById: updaters.length ? rand(updaters).id : undefined,
            at: daysAgo(0),
          },
        });
      }

      // Invoice for loads that reached invoicing
      if (['INVOICED', 'PAID', 'CLOSED'].includes(status)) {
        const issuedAt = new Date(load.updatedAt);
        const paid = status !== 'INVOICED';
        await prisma.invoice.create({
          data: {
            loadId: load.id,
            clientId: load.clientId,
            number: `INV-${10000 + created}`,
            amount: rate,
            issuedAt,
            dueAt: new Date(issuedAt.getTime() + 1000 * 60 * 60 * 24 * 30),
            paidAmount: paid ? rate : 0,
            paidAt: paid ? new Date(issuedAt.getTime() + 1000 * 60 * 60 * 24 * randInt(1, 20)) : undefined,
            status: paid ? 'PAID' : 'PENDING',
          },
        });
      }
    }
    console.log(`✓ ${created} loads created (with status history, location updates, invoices)`);
  }

  // ── Integrations ─────────────────────────────────────────────────────
  const integrationCount = await prisma.integration.count();
  if (integrationCount === 0) {
    const telegramConnected = !!process.env.TELEGRAM_BOT_TOKEN && !!process.env.TELEGRAM_WEBHOOK_SECRET;
    await prisma.integration.createMany({
      data: [
        { type: 'ringcentral', name: 'RingCentral', status: 'disconnected', isConnected: false },
        { type: 'gmail', name: 'Gmail', status: 'disconnected', isConnected: false },
        {
          type: 'telegram', name: 'Telegram', isConnected: telegramConnected,
          status: telegramConnected ? 'connected' : 'disconnected',
          lastSyncAt: telegramConnected ? new Date() : undefined,
        },
      ],
    });
    console.log('✓ Integrations seeded');
  }

  // ── Activity log ─────────────────────────────────────────────────────
  const activityCount = await prisma.activityLog.count();
  if (activityCount === 0) {
    const recentLoads = await prisma.load.findMany({ orderBy: { createdAt: 'desc' }, take: 12 });
    const templates: Array<{ action: string; title: (l: any) => string; description?: (l: any) => string }> = [
      { action: 'created', title: (l) => `Новый груз ${l.loadCode} создан`, description: (l) => `${l.pickupCity ?? '—'} → ${l.deliveryCity ?? '—'}` },
      { action: 'status_changed', title: (l) => `Статус груза ${l.loadCode} изменён`, description: (l) => `Текущий статус: ${l.status}` },
      { action: 'payment_received', title: (l) => `Получена оплата по грузу ${l.loadCode}`, description: (l) => `Сумма: $${l.rate.toLocaleString('en-US')}` },
    ];
    let idx = 0;
    for (const l of recentLoads) {
      const tpl = templates[idx % templates.length];
      await prisma.activityLog.create({
        data: {
          actorId: dispatchers.length ? rand(dispatchers).id : undefined,
          entityType: 'Load',
          entityId: l.id,
          action: tpl.action,
          title: tpl.title(l),
          description: tpl.description ? tpl.description(l) : undefined,
          createdAt: daysAgo(randInt(0, 5)),
        },
      });
      idx++;
    }
    await prisma.activityLog.create({
      data: {
        entityType: 'Communication',
        action: 'message_received',
        title: 'Новое сообщение от клиента',
        description: 'Клиент запросил обновление статуса груза.',
        createdAt: daysAgo(0),
      },
    });
    console.log('✓ Activity log seeded');
  }

  console.log('Seed complete. Sign up via /login, then promote yourself to ADMIN (see prisma/promote-admin.ts) to log in as a real user — the seeded "Иван Петров" etc. are demo-only placeholder rows.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
