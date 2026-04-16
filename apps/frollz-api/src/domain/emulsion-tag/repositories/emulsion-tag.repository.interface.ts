export const EMULSION_TAG_REPOSITORY = "EMULSION_TAG_REPOSITORY";

export interface IEmulsionTagRepository {
  add(emulsionId: number, tagid: number): Promise<void>;
  remove(emulsionId: number, tagid: number): Promise<void>;
}
