import { requireDriverAppContext } from '@/lib/auth/driverApp';
import { DriverAppShell } from '@/components/layout/DriverAppShell';
import { DriverFinanceScreen } from '@/components/modules/driver-app/DriverFinanceScreen';

export default async function DriverAppFinancePage() {
  await requireDriverAppContext();
  return (
    <DriverAppShell title="My Finance">
      <DriverFinanceScreen />
    </DriverAppShell>
  );
}
