import { AuthGate } from '../../../src/components/AuthGate';
import { EmulsionListPage } from '../../../src/components/domains/EmulsionPages';

export default function ColorPositiveE6EmulsionsPage() {
  return (
    <AuthGate>
      <EmulsionListPage processFilterCode="E6" processFilterLabel="Color Positive (E-6)" />
    </AuthGate>
  );
}
