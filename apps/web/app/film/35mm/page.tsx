import { Suspense } from 'react';
import { AuthGate } from '../../../src/components/AuthGate';
import { FilmInventoryPage } from '../../../src/components/domains/FilmPages';

export default function Film35mmRoute() {
  return (
    <AuthGate>
      <Suspense>
        <FilmInventoryPage formatKey="35mm" />
      </Suspense>
    </AuthGate>
  );
}
