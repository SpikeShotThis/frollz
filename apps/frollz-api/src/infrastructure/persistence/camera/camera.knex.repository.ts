import { Injectable, Logger } from "@nestjs/common";
import { ICameraRepository } from "../../../domain/camera/repositories/camera.repository.interface";
import {
  Camera,
  CameraStatus,
} from "../../../domain/camera/entities/camera.entity";
import { CameraMapper } from "./camera.mapper";
import { CameraFormatJoinRow, CameraRow } from "../types/db.types";
import { BaseKnexRepository } from "../base.knex.repository";

@Injectable()
export class CameraKnexRepository
  extends BaseKnexRepository
  implements ICameraRepository
{
  async findById(id: number): Promise<Camera | null> {
    const row = await this.db<CameraRow>("camera").where({ id }).first();
    if (!row) {
      return null;
    }

    const acceptedFormats = await this.findAcceptedFormats(id);
    return CameraMapper.toDomain(row, acceptedFormats);
  }

  async findAll(criteria: {
    brand?: string;
    model?: string;
    status?: CameraStatus;
    formatId?: number;
    unloaded?: boolean;
  }): Promise<Camera[]> {
    let query = this.db.select("camera.*").from("camera");
    if (criteria.brand) {
      query = query.whereILike("brand", `%${criteria.brand}%`);
    }
    if (criteria.model) {
      query = query.whereILike("model", `%${criteria.model}%`);
    }
    if (criteria.status) {
      query = query.where("status", criteria.status);
    }
    if (criteria.formatId) {
      query = query
        .join("camera_accepted_format as caf", "camera.id", "caf.camera_id")
        .where("caf.format_id", criteria.formatId);
    }
    if (criteria.unloaded) {
      throw new Error("Unloaded filter not implemented yet");
    }
    const rows = await query;

    const results = await Promise.all(
      rows.map(async (row) => {
        const acceptedFormats = await this.findAcceptedFormats(row.id);
        return CameraMapper.toDomain(row, acceptedFormats);
      }),
    );

    return results;
  }

  async save(camera: Camera, formatIds: number[] = []): Promise<number> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...data } = CameraMapper.toPersistence(camera);

    if (formatIds.length > 0) {
      const existingFormats = await this.db("format")
        .whereIn("id", formatIds)
        .select("id");
      const existingFormatIds = existingFormats.map(
        (f: { id: number }) => f.id,
      );
      const missingFormatIds = formatIds.filter(
        (fid) => !existingFormatIds.includes(fid),
      );
      if (missingFormatIds.length > 0) {
        throw new Error(
          `Formats with IDs ${missingFormatIds.join(", ")} do not exist`,
        );
      }
    }

    const [generatedId] = await this.db("camera").insert(data);

    if (formatIds.length > 0) {
      Logger.debug(
        `Saving accepted formats for camera ${generatedId}: ${formatIds.join(", ")}`,
      );
      await this.saveAcceptedFormats(generatedId, formatIds);
    }
    return generatedId;
  }
  async update(camera: Camera): Promise<void> {
    const row = CameraMapper.toPersistence(camera);
    await this.db("camera").where({ id: camera.id }).update(row);
  }
  async delete(id: number): Promise<void> {
    await this.db("camera").where({ id }).delete();
  }

  private async findAcceptedFormats(
    cameraId: number,
  ): Promise<CameraFormatJoinRow[]> {
    return this.db("camera_accepted_format as caf")
      .join("format as f", "caf.format_id", "f.id")
      .join("package as p", "f.package_id", "p.id")
      .select(
        "caf.camera_id",
        "caf.format_id",
        "f.name as format_name",
        "p.id as package_id",
        "p.name as package_name",
      )
      .where("caf.camera_id", cameraId);
  }

  private async saveAcceptedFormats(
    cameraId: number,
    formatIds: number[],
  ): Promise<void> {
    const existingFormatIds: number[] = await this.db("camera_accepted_format")
      .where({ camera_id: cameraId })
      .pluck("format_id");

    const noLongerAccepted = existingFormatIds.filter(
      (f) => !formatIds.includes(f),
    );
    const newlyAccepted = formatIds.filter(
      (f) => !existingFormatIds.includes(f),
    );

    if (noLongerAccepted.length > 0) {
      await this.db("camera_accepted_format")
        .where({ camera_id: cameraId })
        .whereIn("format_id", noLongerAccepted)
        .delete();
    }
    if (newlyAccepted.length > 0) {
      const rows = newlyAccepted.map((formatId) => ({
        camera_id: cameraId,
        format_id: formatId,
      }));
      await this.db("camera_accepted_format").insert(rows);
    }
  }
}
