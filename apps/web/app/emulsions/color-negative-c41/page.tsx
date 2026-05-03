import { AuthGate } from '../../../src/components/AuthGate';
import { EmulsionListPage } from '../../../src/components/domains/EmulsionPages';

export default function ColorNegativeC41EmulsionsPage() {
  return (
    <AuthGate>
      <EmulsionListPage processFilterCode="C41" processFilterLabel="Color Negative (C-41)" />
    </AuthGate>
  );
}
