import { Entity, ManyToOne, Property } from '@mikro-orm/decorators/legacy';
import { AutoIncrementEntity } from './base.entity.js';
import { EmulsionEntity, FilmFormatEntity, PackageTypeEntity } from './reference.entities.js';
import { FilmSupplierEntity } from './film-supplier.entity.js';
import { UserEntity } from './user.entity.js';

@Entity({ tableName: 'film_lot' })
export class FilmLotEntity extends AutoIncrementEntity {
  @ManyToOne(() => UserEntity, { fieldName: 'user_id' })
  user!: UserEntity;

  @ManyToOne(() => EmulsionEntity, { fieldName: 'emulsion_id' })
  emulsion!: EmulsionEntity;

  @ManyToOne(() => PackageTypeEntity, { fieldName: 'package_type_id' })
  packageType!: PackageTypeEntity;

  @ManyToOne(() => FilmFormatEntity, { fieldName: 'film_format_id' })
  filmFormat!: FilmFormatEntity;

  @Property({ type: 'integer' })
  quantity!: number;

  @Property({ type: 'text', nullable: true, fieldName: 'expiration_date' })
  expirationDate!: string | null;

  @ManyToOne(() => FilmSupplierEntity, { fieldName: 'supplier_id', nullable: true })
  supplier!: FilmSupplierEntity | null;

  @Property({ type: 'json', nullable: true, fieldName: 'purchase_info' })
  purchaseInfo!: {
    channel?: string | null;
    price?: number | null;
    currencyCode?: string | null;
    orderRef?: string | null;
    obtainedDate?: string | null;
  } | null;

  @Property({ type: 'integer', nullable: true })
  rating!: number | null;

  @Property({ type: 'text', fieldName: 'created_at' })
  createdAt!: string;
}
