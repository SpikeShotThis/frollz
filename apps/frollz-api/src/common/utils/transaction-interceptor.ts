import {
  Inject,
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable, from, lastValueFrom } from "rxjs";
import { TransactionManager, TRANSACTION_MANAGER } from "./transaction-manager";
import { Request } from "express";

@Injectable()
export class TransactionInterceptor implements NestInterceptor {
  constructor(
    @Inject(TRANSACTION_MANAGER) private readonly txManager: TransactionManager,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req: Request = context.switchToHttp().getRequest();

    const isMutating = ["POST", "PUT", "PATCH", "DELETE"].includes(
      req.method.toUpperCase(),
    );

    if (!isMutating) {
      return next.handle();
    }

    return from(
      this.txManager.runInTransaction(async () => {
        return await lastValueFrom(next.handle());
      }),
    );
  }
}
