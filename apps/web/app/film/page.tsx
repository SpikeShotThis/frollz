import { AuthGate } from '../../src/components/AuthGate';
import { FilmDashboardPage } from '../../src/components/domains/FilmPages';

export default function FilmPage() {
  return (
    <AuthGate>
      <FilmDashboardPage />
    </AuthGate>
  );
}
