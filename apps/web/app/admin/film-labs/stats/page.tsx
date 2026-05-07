import { AuthGate } from '../../../../src/components/AuthGate';
import { LabStatsPage } from '../../../../src/components/domains/InsightsPages';

export default function LabStatsRoute() {
  return (
    <AuthGate>
      <LabStatsPage />
    </AuthGate>
  );
}
