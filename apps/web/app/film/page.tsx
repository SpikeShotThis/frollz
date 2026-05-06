import { Suspense } from 'react';
import { AuthGate } from '../../src/components/AuthGate';
import { FilmListPage } from '../../src/components/domains/FilmPages';

export default function FilmPage() {
  return (
    <AuthGate>
      <Suspense>
        <FilmListPage />
      </Suspense>
    </AuthGate>
  );
}
