import { AuthGate } from '../../../src/components/AuthGate';
import { EmulsionListPage } from '../../../src/components/domains/EmulsionPages';

export default function CineEcn2EmulsionsPage() {
  return (
    <AuthGate>
      <EmulsionListPage processFilterCode="ECN2" processFilterLabel="Cine (ECN-2)" />
    </AuthGate>
  );
}
