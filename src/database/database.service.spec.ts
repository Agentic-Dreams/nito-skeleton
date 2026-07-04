import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from './database.service';
import { DRIZZLE_PROVIDER } from './database.constants';

describe('DatabaseService', () => {
  let service: DatabaseService;
  const mockDb = { query: {}, insert: jest.fn() };
  const mockPool = { end: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseService,
        {
          provide: DRIZZLE_PROVIDER,
          useValue: {
            ...mockDb,
            session: { client: mockPool },
          },
        },
      ],
    }).compile();

    service = module.get<DatabaseService>(DatabaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDatabase', () => {
    it('should return database instance', () => {
      const db = service.getDatabase();
      expect(db).toBeDefined();
    });
  });

  describe('onModuleDestroy', () => {
    it('should close pool connection', async () => {
      await service.onModuleDestroy();
      expect(mockPool.end).toHaveBeenCalled();
    });
  });
});
