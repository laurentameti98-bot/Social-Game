import type { FastifyInstance } from 'fastify';
import { authRoutes } from './auth.js';

export async function setupRoutes(fastify: FastifyInstance) {
  await fastify.register(authRoutes, { prefix: '/api' });
}
