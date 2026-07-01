import { requireDriverAppContext } from '@/lib/auth/driverApp';
import { DriverAppShell } from '@/components/layout/DriverAppShell';
import { DocumentsChatScreen } from '@/components/modules/driver-app/DocumentsChatScreen';

export default async function DriverAppDocumentsPage() {
  await requireDriverAppContext();
  return (
    <DriverAppShell title="Documents & Chat">
      <DocumentsChatScreen />
    </DriverAppShell>
  );
}
