import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import { Server } from 'socket.io';
import { setupRoutes } from './routes/index.js';
import { setupSocketIO } from './socket/index.js';

const PORT = parseInt(process.env.PORT || '3001', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

const fastify = Fastify({
  logger: true,
});

// Register plugins
await fastify.register(cors, {
  origin: CORS_ORIGIN,
  credentials: true,
});
await fastify.register(cookie, {
  secret: process.env.COOKIE_SECRET || 'change-me-in-production',
});

// Setup routes
await setupRoutes(fastify);

// Setup Socket.IO (before listening)
const io = new Server(fastify.server, {
  cors: {
    origin: CORS_ORIGIN,
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

await setupSocketIO(io);

// Start server
await fastify.listen({ port: PORT, host: '0.0.0.0' });

console.log(`🚀 Server running on http://localhost:${PORT}`);
console.log(`📡 Socket.IO ready`);
