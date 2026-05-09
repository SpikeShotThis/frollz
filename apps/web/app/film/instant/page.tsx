import { Suspense } from 'react';
import { AuthGate } from '../../../src/components/AuthGate';
import { FilmInventoryPage } from '../../../src/components/domains/FilmPages';

export default function FilmInstantRoute() {
  return (
    <AuthGate>
      <Suspense>
        <FilmInventoryPage formatKey="instant" />
      </Suspense>
    </AuthGate>
  );
}
