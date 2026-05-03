import { AuthGate } from '../../../src/components/AuthGate';
import { DeviceDetailPage } from '../../../src/components/domains/DevicePages';

export default function DeviceDetailRoute() {
  return (
    <AuthGate>
      <DeviceDetailPage />
    </AuthGate>
  );
}
