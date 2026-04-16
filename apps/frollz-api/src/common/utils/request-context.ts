import { AsyncLocalStorage } from "async_hooks";
import { Knex } from "knex";
import { randomUUID } from "crypto";

type Store = {
  requestId: string;
  trx?: Knex.Transaction;
  trxDepth: number;
};

export class RequestContext {
  private static als = new AsyncLocalStorage<Store>();

  static run<T>(callback: () => Promise<T>) {
    const store: Store = {
      requestId: randomUUID(),
      trx: undefined,
      trxDepth: 0,
    };

    return this.als.run(store, callback);
  }

  static getStore(): Store {
    const store = this.als.getStore();
    if (!store) {
      throw new Error("RequestContext not initialized");
    }
    return store;
  }

  static getRequestId(): string {
    return this.getStore().requestId;
  }

  static getTransaction(): Knex.Transaction | undefined {
    return this.als.getStore()?.trx;
  }

  static setTransaction(trx: Knex.Transaction) {
    this.getStore().trx = trx;
  }

  static incrementDepth() {
    this.getStore().trxDepth++;
  }

  static decrementDepth() {
    this.getStore().trxDepth--;
  }

  static getDepth() {
    return this.getStore().trxDepth;
  }
}
