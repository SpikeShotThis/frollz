import { AuthGate } from '../../../src/components/AuthGate';
import { DeviceListPage } from '../../../src/components/domains/DevicePages';

export default function InterchangeableBackDevicesPage() {
  return (
    <AuthGate>
      <DeviceListPage lockedDeviceTypeCode="interchangeable_back" />
    </AuthGate>
  );
}
