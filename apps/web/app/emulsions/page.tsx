import { AuthGate } from '../../src/components/AuthGate';
import { EmulsionListPage } from '../../src/components/domains/EmulsionPages';

export default function EmulsionsPage() {
  return (
    <AuthGate>
      <EmulsionListPage />
    </AuthGate>
  );
}
