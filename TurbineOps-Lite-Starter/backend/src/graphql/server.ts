import { readFileSync } from 'fs';
import path from 'path';
import { ApolloServer } from 'apollo-server-express';
import type { Express } from 'express';
import { resolvers } from './resolvers/index.js';
import { buildContext } from './context.js';

export async function mountGraphql(app: Express) {
  const typeDefs = readFileSync(path.join(process.cwd(), 'src/graphql/schema.graphql'), 'utf8');
  const server = new ApolloServer({ typeDefs, resolvers, context: buildContext });
  await server.start();
  server.applyMiddleware({ app, path: '/graphql' });
}