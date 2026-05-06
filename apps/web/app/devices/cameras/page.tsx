import { AuthGate } from '../../../src/components/AuthGate';
import { DeviceListPage } from '../../../src/components/domains/DevicePages';

export default function CameraDevicesPage() {
  return (
    <AuthGate>
      <DeviceListPage lockedDeviceTypeCode="camera" />
    </AuthGate>
  );
}
