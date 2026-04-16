import { Camera, CameraStatus } from "../entities/camera.entity";

export const CAMERA_REPOSITORY = Symbol("CAMERA_REPOSITORY");

export interface ICameraRepository {
  findAll(criteria: {
    brand?: string;
    model?: string;
    status?: CameraStatus;
    formatId?: number;
    unloaded?: boolean;
  }): Camera[] | PromiseLike<Camera[]>;
  findById(id: number): Promise<Camera | null>;
  save(camera: Camera, formatIds: number[]): Promise<number>;
  update(camera: Camera): Promise<void>;
  delete(id: number): Promise<void>;
}
