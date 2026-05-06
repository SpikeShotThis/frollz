import { AuthGate } from '../../../src/components/AuthGate';
import { EmulsionListPage } from '../../../src/components/domains/EmulsionPages';

export default function BlackAndWhiteEmulsionsPage() {
  return (
    <AuthGate>
      <EmulsionListPage processFilterCode="BW" processFilterLabel="Black & White" />
    </AuthGate>
  );
}
