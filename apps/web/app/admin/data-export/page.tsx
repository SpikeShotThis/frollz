import { AuthGate } from '../../../src/components/AuthGate';
import { DataExportImportPage } from '../../../src/components/domains/AdminPages';

export default function DataExportPage() {
  return (
    <AuthGate>
      <DataExportImportPage />
    </AuthGate>
  );
}
