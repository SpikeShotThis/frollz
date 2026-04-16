import { Injectable, Logger } from "@nestjs/common";
import { RequestContext } from "./request-context";

export const APP_LOGGER = Symbol("AppLogger");

@Injectable()
export class AppLogger {
  private logger = new Logger("App");

  log(message: string, meta?: Record<string, unknown>) {
    this.logger.log(this.format(message, meta));
  }

  error(message: string, trace?: unknown) {
    this.logger.error(this.format(message), trace);
  }

  private format(message: string, meta?: Record<string, unknown>): string {
    return JSON.stringify({
      requestId: RequestContext.getRequestId(),
      ...meta,
      message,
    });
  }
}
