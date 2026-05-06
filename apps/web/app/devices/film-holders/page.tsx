import { AuthGate } from '../../../src/components/AuthGate';
import { DeviceListPage } from '../../../src/components/domains/DevicePages';

export default function FilmHolderDevicesPage() {
  return (
    <AuthGate>
      <DeviceListPage lockedDeviceTypeCode="film_holder" />
    </AuthGate>
  );
}
