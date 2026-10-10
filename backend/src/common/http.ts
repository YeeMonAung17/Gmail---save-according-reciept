import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger, ValidationPipe } from '@nestjs/common';
import { Request, Response } from 'express';
import { DomainError } from '../domain/money';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('API');

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    if (exception instanceof DomainError) {
      response.status(422).json({ message: exception.message, fields: exception.fields });
      return;
    }
    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      const details = typeof body === 'string' ? { message: body } : body as Record<string, unknown>;
      response.status(exception.getStatus()).json({ ...details, message: Array.isArray(details.message) ? details.message.join(' ') : details.message });
      return;
    }
    if (exception instanceof Error && 'status' in exception && typeof exception.status === 'number') {
      response.status(exception.status).json({ message: exception.status === 413 ? 'Request is too large.' : 'Request body is invalid.' });
      return;
    }
    this.logger.error(`Unexpected server failure: ${exception instanceof Error ? exception.name : 'UnknownError'}`);
    response.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
}

export function validationPipe(): ValidationPipe {
  return new ValidationPipe({
    transform: true, whitelist: true, forbidNonWhitelisted: true,
    validationError: { target: false, value: false },
  });
}

export function checkOrigin(request: Request, response: Response, next: () => void): void {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) { next(); return; }
  const origin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
  if (request.headers.origin !== origin) { response.status(403).json({ message: 'Request origin is not allowed.' }); return; }
  if (!request.is('application/json')) { response.status(415).json({ message: 'Send a JSON request body.' }); return; }
  next();
}
