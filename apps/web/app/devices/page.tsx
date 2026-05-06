import { Suspense } from 'react';
import { AuthGate } from '../../src/components/AuthGate';
import { DeviceListPage } from '../../src/components/domains/DevicePages';

export default function DevicesPage() {
  return (
    <AuthGate>
      <Suspense>
        <DeviceListPage />
      </Suspense>
    </AuthGate>
  );
}
