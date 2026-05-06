import { AuthGate } from '../../src/components/AuthGate';
import { DashboardView } from '../../src/components/DashboardView';

export default function DashboardPage() {
  return (
    <AuthGate>
      <DashboardView />
    </AuthGate>
  );
}
