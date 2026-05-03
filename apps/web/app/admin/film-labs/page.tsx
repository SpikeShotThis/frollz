import { AuthGate } from '../../../src/components/AuthGate';
import { FilmLabsAdminPage } from '../../../src/components/domains/AdminPages';

export default function FilmLabsPage() {
  return (
    <AuthGate>
      <FilmLabsAdminPage />
    </AuthGate>
  );
}
