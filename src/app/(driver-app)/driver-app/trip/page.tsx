import { requireDriverAppContext } from '@/lib/auth/driverApp';
import { DriverAppShell } from '@/components/layout/DriverAppShell';
import { RouteScreen } from '@/components/modules/driver-app/RouteScreen';

export default async function DriverAppRoutePage() {
  await requireDriverAppContext();
  return (
    <DriverAppShell title="Route">
      <RouteScreen />
    </DriverAppShell>
  );
}
