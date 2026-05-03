import { AuthGate } from '../../../src/components/AuthGate';
import { FilmDetailPage } from '../../../src/components/domains/FilmPages';

export default function FilmDetailRoute() {
  return (
    <AuthGate>
      <FilmDetailPage />
    </AuthGate>
  );
}
