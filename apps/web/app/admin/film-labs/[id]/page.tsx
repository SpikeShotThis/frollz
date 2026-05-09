import { AuthGate } from '../../../../src/components/AuthGate';
import { FilmLabDetailPage } from '../../../../src/components/domains/FilmLabPages';

export default function FilmLabDetailRoute() {
  return (
    <AuthGate>
      <FilmLabDetailPage />
    </AuthGate>
  );
}
