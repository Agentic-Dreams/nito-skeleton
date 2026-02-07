# Nito Skeleton

> 🚀 NestJS production-ready skeleton with auth, database, and security best practices

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔐 **Authentication** | JWT-based auth with refresh tokens |
| 🗄️ **Database** | PostgreSQL + Drizzle ORM with RLS |
| 🛡️ **Security** | Helmet, CORS, rate limiting ready |
| 📊 **Health Checks** | Terminus integration |
| 📝 **Logging** | Winston structured logging |
| 📚 **API Docs** | Swagger/OpenAPI auto-generated |
| ⚡ **Fastify** | High-performance HTTP server |
| 🐳 **Docker** | Production-ready Dockerfile |

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 14+

### 1. Clone and Install

```bash
git clone https://github.com/mouzotech/nito-skeleton.git my-project
cd my-project
npm ci
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Database Setup

```bash
# Generate migrations
npm run db:generate

# Run migrations
npm run db:migrate
```

### 4. Run

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## 🔧 Environment Variables

### Required (4 variables mínimas)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/db` |
| `JWT_SECRET` | Secret for JWT signing (min 32 chars) | `your-super-secret-key-32-chars-min` |
| `FRONTEND_URL` | URL of your frontend (CORS) | `https://app.example.com` |
| `PORT` | Server port | `3000` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `JWT_EXPIRES_IN` | JWT expiration | `24h` |
| `SMTP_HOST` | SMTP server for emails | - |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | SMTP username | - |
| `SMTP_PASS` | SMTP password | - |
| `LOG_LEVEL` | Logging level | `info` |

## 📁 Project Structure

```
src/
├── auth/                 # Authentication module
│   ├── decorators/       # @CurrentUser, @Roles
│   ├── dto/             # Auth DTOs
│   ├── guards/          # JWT & Roles guards
│   ├── auth.controller.ts
│   ├── auth.module.ts
│   ├── auth.service.ts
│   └── jwt.strategy.ts
├── common/              # Shared utilities
│   ├── filters/         # Exception filters
│   ├── interceptors/    # Logging, RLS
│   └── logger/          # Winston config
├── config/              # Configuration
│   ├── database.config.ts
│   └── env.validation.ts
├── database/            # Database setup
│   ├── schema/          # Drizzle schemas
│   ├── database.module.ts
│   └── database.service.ts
├── health/              # Health checks
│   └── health.controller.ts
├── app.module.ts        # Root module
└── main.ts             # Bootstrap
```

## 🛠️ Creating a New Module

```bash
# Generate module
nest generate module features/my-feature
nest generate controller features/my-feature
nest generate service features/my-feature
```

## 🧪 Testing

```bash
# Unit tests
npm run test

# Coverage
npm run test:cov

# E2E tests
npm run test:e2e
```

## 🐳 Docker

```bash
# Build
docker build -t my-app .

# Run
docker run -p 3000:3000 --env-file .env my-app
```

## 📝 License

MIT
