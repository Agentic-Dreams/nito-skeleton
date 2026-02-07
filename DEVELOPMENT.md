# Nito Skeleton - Development Guide

## Creating a New Project from This Template

### Step 1: Use the Template

On GitHub, click "Use this template" → "Create a new repository"

### Step 2: Clone and Setup

```bash
git clone https://github.com/YOUR-USERNAME/YOUR-PROJECT.git
cd YOUR-PROJECT
npm ci
```

### Step 3: Configure

```bash
cp .env.example .env
# Edit .env with your database and secrets
```

### Step 4: Database

```bash
# Start PostgreSQL
docker-compose up -d db

# Or use local PostgreSQL
# Update DATABASE_URL in .env

# Run migrations
npm run db:migrate
```

### Step 5: Development

```bash
npm run start:dev
```

## Adding a New Feature Module

Example: Creating a `products` module:

```bash
nest generate module products
nest generate controller products
nest generate service products
```

### 1. Create Schema

```typescript
// src/database/schema/products.ts
import { pgTable, uuid, varchar, decimal, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  name: varchar('name', { length: 255 }).notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
```

### 2. Create DTOs

```typescript
// src/products/dto/create-product.dto.ts
import { IsString, IsNumber, IsUUID } from 'class-validator';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsNumber()
  price: number;
}
```

### 3. Implement Service

```typescript
// src/products/products.service.ts
@Injectable()
export class ProductsService {
  constructor(private readonly db: DatabaseService) {}

  async create(userId: string, dto: CreateProductDto) {
    const database = this.db.getDatabase();
    return database.insert(products).values({ ...dto, userId }).returning();
  }
}
```

### 4. Implement Controller

```typescript
// src/products/products.controller.ts
@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateProductDto) {
    return this.service.create(userId, dto);
  }
}
```

### 5. Update Module

```typescript
// src/products/products.module.ts
@Module({
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
```

### 6. Register in AppModule

```typescript
// src/app.module.ts
imports: [
  // ... existing modules
  ProductsModule,
],
```

### 7. Generate and Run Migration

```bash
npm run db:generate
npm run db:migrate
```

## Deployment

### With Docker

```bash
docker build -t my-app .
docker run -p 3000:3000 --env-file .env my-app
```

### With Docker Compose

```bash
docker-compose up -d
```

### With GitHub Actions + Self-hosted Runner

See example workflow in `.github/workflows/deploy.yml` (create as needed)

## Updating from Skeleton

If you need to apply changes from the skeleton to your project:

```bash
# Add skeleton as remote
git remote add skeleton https://github.com/mouzotech/nito-skeleton.git
git fetch skeleton

# Cherry-pick specific commits
git cherry-pick <commit-hash>

# Or manually merge specific files
git checkout skeleton/main -- src/auth/guards/jwt-auth.guard.ts
```
