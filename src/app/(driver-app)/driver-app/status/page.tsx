import { requireDriverAppContext } from '@/lib/auth/driverApp';
import { DriverAppShell } from '@/components/layout/DriverAppShell';
import { StatusUpdateScreen } from '@/components/modules/driver-app/StatusUpdateScreen';

export default async function DriverAppStatusPage() {
  await requireDriverAppContext();
  return (
    <DriverAppShell title="Update Status">
      <StatusUpdateScreen />
    </DriverAppShell>
  );
}
