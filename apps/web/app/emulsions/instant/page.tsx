import { AuthGate } from '../../../src/components/AuthGate';
import { EmulsionListPage } from '../../../src/components/domains/EmulsionPages';

export default function InstantEmulsionsPage() {
  return (
    <AuthGate>
      <EmulsionListPage processFilterCode="Instant" processFilterLabel="Instant" />
    </AuthGate>
  );
}
