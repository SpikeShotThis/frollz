import { AuthGate } from '../../../src/components/AuthGate';
import { FilmStatsPage } from '../../../src/components/domains/InsightsPages';

export default function FilmStatsRoute() {
  return (
    <AuthGate>
      <FilmStatsPage />
    </AuthGate>
  );
}
