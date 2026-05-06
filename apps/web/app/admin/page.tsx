import { AuthGate } from '../../src/components/AuthGate';
import { AdminOverviewPage } from '../../src/components/domains/AdminPages';

export default function AdminPage() {
  return (
    <AuthGate>
      <AdminOverviewPage />
    </AuthGate>
  );
}
