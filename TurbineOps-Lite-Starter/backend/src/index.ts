import { env } from './config/env.js';
import { connectMongo } from './db/mongo.js';
import { createApp } from './app.js';

const startServer = async () => {
  await connectMongo();
  const app = await createApp();
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => console.log(`Backend on http://localhost:${PORT}`));
}

startServer();