import { Inject, Injectable } from "@nestjs/common";
import { Knex } from "knex";
import {
  TRANSACTION_MANAGER,
  TransactionManager,
} from "../../common/utils/transaction-manager";
import { KNEX_CONNECTION } from "./knex.provider";

@Injectable()
export abstract class BaseKnexRepository {
  protected get db(): Knex | Knex.Transaction {
    return this.txManager.getCurrentTransaction() ?? this.knex;
  }

  constructor(
    @Inject(KNEX_CONNECTION) private readonly knex: Knex,
    @Inject(TRANSACTION_MANAGER) private readonly txManager: TransactionManager,
  ) {}
}
