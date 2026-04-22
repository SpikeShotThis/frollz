import { Entity, ManyToOne, Property } from '@mikro-orm/decorators/legacy';
import { AutoIncrementEntity } from './base.entity.js';
import { EmulsionEntity, FilmFormatEntity, PackageTypeEntity } from './reference.entities.js';
import { UserEntity } from './user.entity.js';

@Entity({ tableName: 'film_stock' })
export class FilmStockEntity extends AutoIncrementEntity {
  @ManyToOne(() => UserEntity, { fieldName: 'user_id' })
  user!: UserEntity;

  @Property({ type: 'text' })
  name!: string;

  @ManyToOne(() => EmulsionEntity, { fieldName: 'emulsion_id' })
  emulsion!: EmulsionEntity;

  @ManyToOne(() => PackageTypeEntity, { fieldName: 'package_type_id' })
  packageType!: PackageTypeEntity;

  @ManyToOne(() => FilmFormatEntity, { fieldName: 'film_format_id' })
  filmFormat!: FilmFormatEntity;

  @Property({ type: 'integer', fieldName: 'units_total' })
  unitsTotal!: number;

  @Property({ type: 'text', nullable: true, fieldName: 'expiration_date' })
  expirationDate!: string | null;
}
