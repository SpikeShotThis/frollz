import { ApiProperty } from "@nestjs/swagger";

export enum RollState {
  ADDED = "Added",
  FROZEN = "Frozen",
  REFRIGERATED = "Refrigerated",
  SHELVED = "Shelved",
  LOADED = "Loaded",
  FINISHED = "Finished",
  SENT_FOR_DEVELOPMENT = "Sent For Development",
  DEVELOPED = "Developed",
  RECEIVED = "Received",
}

export enum ObtainmentMethod {
  GIFT = "Gift",
  PURCHASE = "Purchase",
}

export class Roll {
  @ApiProperty()
  _key?: string;

  @ApiProperty()
  rollId: string; // format: roll-{stock name}-ISO8601 Date Hashed

  @ApiProperty()
  stockKey: string; // Reference to stock

  @ApiProperty({ enum: RollState })
  state: RollState;

  @ApiProperty({ required: false })
  imagesUrl?: string; // URL to album of images

  @ApiProperty()
  dateObtained: Date;

  @ApiProperty({ enum: ObtainmentMethod })
  obtainmentMethod: ObtainmentMethod;

  @ApiProperty()
  obtainedFrom: string;

  @ApiProperty({ required: false })
  expirationDate?: Date;

  @ApiProperty({ default: 0 })
  timesExposedToXrays: number;

  @ApiProperty({ required: false })
  loadedInto?: string;

  @ApiProperty({ required: false })
  createdAt?: Date;

  @ApiProperty({ required: false })
  updatedAt?: Date;
}
