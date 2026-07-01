import { LoadStatus } from '@prisma/client';

// Ordered pipeline stages shown as the kanban funnel at the top of the Loads screen
export const FUNNEL_ORDER: LoadStatus[] = [
  'NEW_LEAD', 'NEGOTIATING', 'BOOKED', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'INVOICED',
];
