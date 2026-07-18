import { DriverDetailWorkspace } from '@/components/modules/drivers/DriverDetailWorkspace';

export default function DriverDetailPage({ params }: { params: { id: string } }) {
  return <DriverDetailWorkspace driverId={params.id} />;
}
