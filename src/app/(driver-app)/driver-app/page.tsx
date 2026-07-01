import { requireDriverAppContext } from '@/lib/auth/driverApp';
import { DriverAppShell } from '@/components/layout/DriverAppShell';
import { CurrentLoadScreen } from '@/components/modules/driver-app/CurrentLoadScreen';

export default async function DriverAppHomePage() {
  await requireDriverAppContext();
  return (
    <DriverAppShell title="Current Load">
      <CurrentLoadScreen />
    </DriverAppShell>
  );
}
