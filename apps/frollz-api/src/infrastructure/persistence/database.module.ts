import { Module } from "@nestjs/common";
import { KNEX_CONNECTION, KnexProvider } from "./knex.provider";
import { MigrationRunnerService } from "./migration-runner.service";
import { APP_LOGGER, AppLogger } from "../../common/utils/app-logger";
import {
  TRANSACTION_MANAGER,
  TransactionManager,
} from "../../common/utils/transaction-manager";

@Module({
  providers: [
    KnexProvider,
    { provide: APP_LOGGER, useClass: AppLogger },
    { provide: TRANSACTION_MANAGER, useClass: TransactionManager },
    MigrationRunnerService,
  ],
  exports: [KNEX_CONNECTION, TRANSACTION_MANAGER],
})
export class DatabaseModule {}
