export class UpdateCameraDto {
  brand!: string;
  model!: string;
  status!: 'active' | 'retired' | 'in_repair';
  notes?: string;
  serial_number?: string;
  purchase_price?: number;
  acquired_at?: Date;
}