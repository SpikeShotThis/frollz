import { AuthGate } from '../../../src/components/AuthGate';
import { EmulsionDetailPage } from '../../../src/components/domains/EmulsionPages';

export default function EmulsionDetailRoute() {
  return (
    <AuthGate>
      <EmulsionDetailPage />
    </AuthGate>
  );
}
