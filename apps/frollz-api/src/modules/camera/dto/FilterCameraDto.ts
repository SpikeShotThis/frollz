import { CameraStatus } from "../../../domain/camera/entities/camera.entity";

export class FilterCameraDto {
  brand?: string = undefined;
  model?: string = undefined;
  status?: CameraStatus = undefined;
  formatId?: number = undefined;
  unloaded?: boolean = undefined;
}
