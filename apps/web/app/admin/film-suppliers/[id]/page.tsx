import { AuthGate } from '../../../../src/components/AuthGate';
import { FilmSupplierDetailPage } from '../../../../src/components/domains/FilmSupplierPages';

export default function FilmSupplierDetailRoute() {
  return (
    <AuthGate>
      <FilmSupplierDetailPage />
    </AuthGate>
  );
}
