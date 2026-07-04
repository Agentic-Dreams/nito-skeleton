process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'test-secret-minimum-32-characters-long';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';
process.env.PORT = process.env.PORT || '3000';
