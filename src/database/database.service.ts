import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { DRIZZLE_PROVIDER } from './database.module';
import * as schema from './schema/users';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private pool: Pool;

  constructor(
    @Inject(DRIZZLE_PROVIDER)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {
    // Access pool through internal property
    this.pool = (this.db as any).session?.client || (this.db as any).client;
  }

  getDatabase() {
    return this.db;
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
    }
  }
}
