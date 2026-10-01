import 'dotenv/config';

export const env = {
  port: Number(process.env.PORT || 4000),
  mongoUrl: process.env.MONGO_URL || 'mongodb://localhost:27017',
  mongoDb: process.env.MONGO_DB || 'turbineops',
  jwtSecret: process.env.JWT_SECRET || 'random_123',
};