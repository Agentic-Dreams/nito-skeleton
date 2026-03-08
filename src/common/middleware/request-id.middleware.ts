import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';

/**
 * RequestIdMiddleware
 *
 * Asigna un ID único a cada request para trazabilidad en logs y Grafana.
 *
 * - Si el cliente envía el header `X-Request-ID`, se respeta.
 * - Si no, se genera un UUID v4 automáticamente.
 * - El ID se expone en el header de respuesta `X-Request-ID`.
 * - Disponible en el request como `req.requestId` para logs.
 *
 * Funciona con Fastify y Express (NestJS abstrae la diferencia).
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    const requestId =
      (req.headers['x-request-id'] as string | undefined) || randomUUID();

    req.requestId = requestId;

    // Fastify uses .header(), Express uses .setHeader() — try both
    if (typeof res.header === 'function') {
      res.header('X-Request-ID', requestId);
    } else {
      res.setHeader('X-Request-ID', requestId);
    }

    next();
  }
}
