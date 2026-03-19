import { ApiProperty } from "@nestjs/swagger";

export class TransitionMetadataField {
  @ApiProperty()
  field: string;

  @ApiProperty()
  fieldType: string;

  @ApiProperty({ required: false, nullable: true })
  defaultValue: string | null;

  @ApiProperty()
  isRequired: boolean;
}

export class TransitionEdge {
  @ApiProperty()
  id: string;

  @ApiProperty()
  fromState: string;

  @ApiProperty()
  toState: string;

  @ApiProperty()
  transitionType: string;

  @ApiProperty()
  requiresDate: boolean;

  @ApiProperty({ type: [TransitionMetadataField] })
  metadata: TransitionMetadataField[];
}

export class TransitionGraph {
  @ApiProperty({ type: [String] })
  states: string[];

  @ApiProperty({ type: [TransitionEdge] })
  transitions: TransitionEdge[];
}
