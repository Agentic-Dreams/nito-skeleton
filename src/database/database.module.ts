import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { DatabaseService } from './database.service';
import * as schema from './schema';

export const DRIZZLE_PROVIDER = 'DRIZZLE_PROVIDER';

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE_PROVIDER,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const connectionString = configService.getOrThrow('DATABASE_URL');
        const pool = new Pool({
          connectionString,
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        });
        
        return drizzle(pool, { schema });
      },
    },
    DatabaseService,
  ],
  exports: [DRIZZLE_PROVIDER, DatabaseService],
})
export class DatabaseModule {}
