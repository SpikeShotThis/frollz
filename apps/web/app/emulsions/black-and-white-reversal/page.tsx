import { AuthGate } from '../../../src/components/AuthGate';
import { EmulsionListPage } from '../../../src/components/domains/EmulsionPages';

export default function BlackAndWhiteReversalEmulsionsPage() {
  return (
    <AuthGate>
      <EmulsionListPage processFilterCode="BWReversal" processFilterLabel="B&W Reversal" />
    </AuthGate>
  );
}
