import { Suspense } from 'react';
import { AuthGate } from '../../../src/components/AuthGate';
import { FilmInventoryPage } from '../../../src/components/domains/FilmPages';

export default function FilmMediumFormatRoute() {
  return (
    <AuthGate>
      <Suspense>
        <FilmInventoryPage formatKey="medium-format" />
      </Suspense>
    </AuthGate>
  );
}
