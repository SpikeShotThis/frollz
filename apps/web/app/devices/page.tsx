import { AuthGate } from '../../src/components/AuthGate';
import { DeviceDashboardPage } from '../../src/components/domains/DevicePages';

export default function DevicesPage() {
  return (
    <AuthGate>
      <DeviceDashboardPage />
    </AuthGate>
  );
}
