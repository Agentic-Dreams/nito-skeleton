# Estructura de Logs JSON para Grafana

## Ejemplo de log de request
```json
{
  "timestamp": "2025-02-07T18:30:00.123Z",
  "level": "info",
  "message": "Incoming request",
  "service": "nito-skeleton",
  "environment": "production",
  "type": "request",
  "requestId": "1738955400123-abc123",
  "method": "POST",
  "url": "/auth/login",
  "ip": "192.168.1.100",
  "userAgent": "Mozilla/5.0..."
}
```

## Ejemplo de log de response
```json
{
  "timestamp": "2025-02-07T18:30:00.456Z",
  "level": "info",
  "message": "Request completed",
  "service": "nito-skeleton",
  "environment": "production",
  "type": "response",
  "requestId": "1738955400123-abc123",
  "method": "POST",
  "url": "/auth/login",
  "statusCode": 200,
  "duration": 333,
  "durationMs": "333ms"
}
```

## Ejemplo de log de error
```json
{
  "timestamp": "2025-02-07T18:30:01.789Z",
  "level": "error",
  "message": "Request failed",
  "service": "nito-skeleton",
  "environment": "production",
  "type": "error",
  "requestId": "1738955400123-abc123",
  "method": "POST",
  "url": "/auth/login",
  "statusCode": 401,
  "duration": 150,
  "errorName": "UnauthorizedException",
  "errorMessage": "Invalid credentials",
  "stack": "Error: Invalid credentials\n    at AuthService.login..."
}
```

## Labels para Grafana Loki

| Label | Descripción | Ejemplo |
|-------|-------------|---------|
| `service` | Nombre del servicio | `nito-skeleton` |
| `environment` | Entorno de ejecución | `production`, `development` |
| `type` | Tipo de log | `request`, `response`, `error` |
| `level` | Nivel de log | `info`, `error`, `warn`, `debug` |
| `method` | Método HTTP | `GET`, `POST`, `PUT`, `DELETE` |
| `statusCode` | Código de respuesta | `200`, `401`, `500` |
| `requestId` | ID único de traza | `1738955400123-abc123` |

## Queries útiles en Grafana

```logql
# Buscar errores
{service="nito-skeleton", level="error"}

# Requests lentos (> 1s)
{service="nito-skeleton", type="response"} | json | duration > 1000

# Errores de auth
{service="nito-skeleton", type="error", statusCode="401"}

# Requests por método
{service="nito-skeleton", type="request"} | json | line_format "{{.method}} {{.url}}"
```
