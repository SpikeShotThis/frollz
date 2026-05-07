import { AuthGate } from '../../../src/components/AuthGate';
import { DeviceStatsPage } from '../../../src/components/domains/InsightsPages';

export default function DeviceStatsRoute() {
  return (
    <AuthGate>
      <DeviceStatsPage />
    </AuthGate>
  );
}
