import { AuthGate } from '../../../src/components/AuthGate';
import { FilmSuppliersAdminPage } from '../../../src/components/domains/AdminPages';

export default function FilmSuppliersPage() {
  return (
    <AuthGate>
      <FilmSuppliersAdminPage />
    </AuthGate>
  );
}
