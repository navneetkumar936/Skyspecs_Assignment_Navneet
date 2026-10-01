import { MongoClient } from 'mongodb';
import { env } from '../config/env.js';

let client: MongoClient | null = null;

export async function connectMongo() {
  try {
    client = new MongoClient(env.mongoUrl);
    await client.connect();
    console.log('Mongo connected');
  } catch (e) {
    console.warn('Mongo unavailable yet:', (e as Error).message);
  }
}

export async function logAudit(entry: Record<string, unknown>) {
  try {
    if (!client) return;
    await client
      .db(env.mongoDb)
      .collection('inspection_logs')
      .insertOne({ ...entry, at: new Date() });
  } catch {
  }
}