# Nito Skeleton

> 🚀 NestJS production-ready skeleton with auth, database, security, logging and automated deployment

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔐 **Authentication** | JWT-based auth with bcrypt |
| 🗄️ **Database** | PostgreSQL + Drizzle ORM |
| 🛡️ **Security** | CORS, validation pipes |
| 📊 **Health Checks** | Terminus integration |
| 📝 **Logging** | Winston JSON for Grafana |
| 📚 **API Docs** | Swagger/OpenAPI auto-generated |
| ⚡ **Fastify** | High-performance HTTP server |
| 🐳 **Docker** | Production-ready multi-stage build |
| 🔄 **CI/CD** | GitHub Actions + self-hosted runner |

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- Docker (for deployment)

### 1. Create from Template

On GitHub, click **"Use this template"** → **"Create a new repository"**

Or via CLI:
```bash
gh repo create mi-proyecto --template Agentic-Dreams/nito-skeleton
```

### 2. Clone and Install

```bash
git clone https://github.com/YOUR_USERNAME/mi-proyecto.git
cd mi-proyecto
npm ci
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your values
```

### 4. Database Setup

```bash
# Start PostgreSQL (with Docker)
docker-compose up -d db

# Run migrations
npm run db:migrate
```

### 5. Run

```bash
# Development
npm run start:dev

# Production
npm run build
npm start
```

Visit: http://localhost:3000/api/docs

## 🔧 Environment Variables

### Required (4 variables mínimas)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/db` |
| `JWT_SECRET` | Secret for JWT (min 32 chars) | `your-super-secret-32-chars-minimum` |
| `FRONTEND_URL` | Frontend URL (CORS) | `https://app.example.com` |
| `PORT` | Server port | `3000` |

## 🧪 Testing

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:cov

# E2E tests
npm run test:e2e
```

## 🚀 Automated Deployment

This template includes GitHub Actions for CI/CD.

### Setup

1. **Configure GitHub Secrets** (Settings → Secrets and variables → Actions):

| Secret | Description |
|--------|-------------|
| `DATABASE_URL_DEV` | PostgreSQL URL for dev environment |
| `JWT_SECRET_DEV` | JWT secret for dev |
| `FRONTEND_URL_DEV` | Frontend URL for dev CORS |
| `DEV_DOMAIN` | Subdomain for dev deployment (e.g., `dev-api.example.com`) |
| `DATABASE_URL_PROD` | PostgreSQL URL for production |
| `JWT_SECRET_PROD` | JWT secret for production |
| `FRONTEND_URL_PROD` | Frontend URL for prod CORS |
| `PROD_DOMAIN` | Domain for production (e.g., `api.example.com`) |

2. **Setup Self-hosted Runner** (on your server):
```bash
# Download runner from GitHub Actions settings
curl -o actions-runner-linux-x64-2.XXX.tar.gz -L https://github.com/...
tar xzf actions-runner-linux-x64-2.XXX.tar.gz

# Configure
./config.sh --url https://github.com/YOUR_ORG/YOUR_REPO --token TOKEN
sudo ./svc.sh install
sudo ./svc.sh start
```

3. **Deploy**:
   - Push to `dev` branch → auto-deploys to development
   - Push to `main` branch → auto-deploys to production

### Workflow Stages

```
Push to branch
    ↓
Run Tests (with PostgreSQL service)
    ↓
Build Docker Image
    ↓
Deploy to Environment (dev/prod)
    ↓
Traefik routes traffic with SSL
```

## 📝 Logging (Grafana-compatible)

Structured JSON logs for Loki/Grafana:

```json
{
  "timestamp": "2025-02-07T18:30:00.123Z",
  "level": "info",
  "message": "Request completed",
  "service": "nito-skeleton",
  "environment": "production",
  "type": "response",
  "requestId": "1738955400123-abc123",
  "method": "POST",
  "url": "/auth/login",
  "statusCode": 200,
  "duration": 333
}
```

See `docs/LOGS_GRAFANA.md` for query examples.

## 🐳 Docker

```bash
# Build image
docker build -t my-app .

# Run locally
docker run -p 3000:3000 --env-file .env my-app

# With Docker Compose (includes PostgreSQL)
docker-compose up -d
```

## 📁 Project Structure

```
├── .github/workflows/
│   └── deploy.yml          # CI/CD pipeline
├── src/
│   ├── auth/               # JWT authentication
│   ├── common/             # Logging & filters
│   ├── config/             # Environment validation
│   ├── database/           # Drizzle ORM setup
│   ├── health/             # Health checks
│   └── main.ts             # Bootstrap
├── test/
│   └── app.e2e-spec.ts     # E2E tests
├── docs/
│   └── LOGS_GRAFANA.md     # Logging documentation
├── docker-compose.yml
├── Dockerfile
└── package.json
```

## 🛠️ Creating a New Feature

```bash
# Generate module structure
nest generate module features/products
nest generate controller features/products
nest generate service features/products

# Create schema
echo "export const products = pgTable('products', {...});" > src/database/schema/products.ts

# Add export to index
echo "export * from './products';" >> src/database/schema/index.ts

# Generate migration
npm run db:generate

# Run tests
npm test
```

## 📄 License

MIT
