import type { ExceptionFilter, ArgumentsHost} from '@nestjs/common';
import { Catch, HttpStatus } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { DomainError } from '../../domain/errors.js';

const statusByCode: Record<string, number> = {
  UNAUTHORIZED: HttpStatus.UNAUTHORIZED,
  FORBIDDEN: HttpStatus.FORBIDDEN,
  NOT_FOUND: HttpStatus.NOT_FOUND,
  CONFLICT: HttpStatus.CONFLICT,
  DOMAIN_ERROR: HttpStatus.UNPROCESSABLE_ENTITY,
  VALIDATION_ERROR: HttpStatus.BAD_REQUEST
};

@Catch(DomainError)
export class DomainErrorFilter implements ExceptionFilter<DomainError> {
  catch(exception: DomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<FastifyReply>();
    const status = statusByCode[exception.code] ?? HttpStatus.INTERNAL_SERVER_ERROR;

    void response.code(status).send({
      error: {
        code: exception.code,
        message: exception.message,
        details: exception.details
      }
    });
  }
}