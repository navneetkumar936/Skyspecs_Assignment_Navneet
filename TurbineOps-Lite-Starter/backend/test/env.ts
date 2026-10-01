process.env.JWT_SECRET = 'test-only-secret-0123456789abcdef0123456789abcdef';
process.env.DATABASE_URL = 'postgresql://x:x@localhost:5432/x'; // never connected to; prisma is mocked
process.env.NODE_ENV = 'test';