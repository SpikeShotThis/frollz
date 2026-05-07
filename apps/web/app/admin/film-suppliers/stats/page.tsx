import { AuthGate } from '../../../../src/components/AuthGate';
import { SupplierStatsPage } from '../../../../src/components/domains/InsightsPages';

export default function SupplierStatsRoute() {
  return (
    <AuthGate>
      <SupplierStatsPage />
    </AuthGate>
  );
}
