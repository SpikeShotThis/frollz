import { Inject, Injectable } from "@nestjs/common";
import { Knex } from "knex";
import { RequestContext } from "./request-context";
import { APP_LOGGER, AppLogger } from "./app-logger";
import { KNEX_CONNECTION } from "../../infrastructure/persistence/knex.provider";

export const TRANSACTION_MANAGER = Symbol("TransactionManager");

@Injectable()
export class TransactionManager {
  constructor(
    @Inject(KNEX_CONNECTION) private readonly knex: Knex,
    @Inject(APP_LOGGER) private readonly logger: AppLogger,
  ) {}

  async runInTransaction<T>(fn: () => Promise<T>): Promise<T> {
    const existingTrx = RequestContext.getTransaction();

    // 🔁 Nested transaction → use savepoint
    if (existingTrx) {
      this.logger.log("Using nested transaction", {
        depth: RequestContext.getDepth(),
      });

      return existingTrx.transaction(async (trx) => {
        RequestContext.incrementDepth();
        RequestContext.setTransaction(trx);

        try {
          const result = await fn();
          return result;
        } finally {
          RequestContext.decrementDepth();
          RequestContext.setTransaction(existingTrx);
        }
      });
    }

    // 🆕 Root transaction
    return this.knex.transaction(async (trx) => {
      return RequestContext.run(async () => {
        RequestContext.setTransaction(trx);
        RequestContext.incrementDepth();

        this.logger.log("Starting transaction");

        try {
          const result = await fn();

          this.logger.log("Committing transaction");
          return result;
        } catch (err) {
          this.logger.error("Rolling back transaction", err);
          throw err;
        } finally {
          RequestContext.decrementDepth();
        }
      });
    });
  }

  getCurrentTransaction() {
    return RequestContext.getTransaction();
  }
}
