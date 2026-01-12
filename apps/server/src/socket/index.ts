import type { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { setupRoomHandlers } from './roomHandlers.js';
import { CLIENT_EVENTS, SERVER_EVENTS } from '@isometric-social/shared';
import { RoomManager } from '../game/RoomManager.js';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

export async function setupSocketIO(io: Server) {
  // Initialize rooms from DB
  const roomManager = RoomManager.getInstance();
  const rooms = await prisma.room.findMany();
  for (const roomData of rooms) {
    roomManager.initializeRoom({
      id: roomData.id,
      slug: roomData.slug,
      name: roomData.name,
      tilemapJson: roomData.tilemapJson as Room['tilemapJson'],
      objectsJson: roomData.objectsJson as Room['objectsJson'],
    });
  }
  console.log(`📦 Initialized ${rooms.length} room(s)`);
  // Authentication middleware
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      // Guest mode
      socket.data.isGuest = true;
      socket.data.userId = `guest-${socket.id}`;
      socket.data.displayName = `Guest-${socket.id.slice(0, 6)}`;
      socket.data.avatarJson = {
        skinTone: 'default',
        hairStyle: 'default',
        shirtColor: '#4A90E2',
        pantsColor: '#2C3E50',
      };
      return next();
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: { profile: true },
      });

      if (!user || !user.profile) {
        return next(new Error('User not found'));
      }

      socket.data.isGuest = false;
      socket.data.userId = user.id;
      socket.data.displayName = user.profile.displayName;
      socket.data.avatarJson = user.profile.avatarJson as Record<string, unknown>;
      next();
    } catch (error) {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`Client connected: ${socket.id} (${socket.data.displayName})`);

    // Handle auth event (client sends auth after connection)
    socket.on(CLIENT_EVENTS.AUTH, async (payload: { token?: string; guest?: boolean }) => {
      // If token provided, verify it
      if (payload.token && !socket.data.isGuest) {
        try {
          const decoded = jwt.verify(payload.token, JWT_SECRET) as { userId: string };
          const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            include: { profile: true },
          });

          if (user && user.profile) {
            socket.data.isGuest = false;
            socket.data.userId = user.id;
            socket.data.displayName = user.profile.displayName;
            socket.data.avatarJson = user.profile.avatarJson as Record<string, unknown>;
          }
        } catch (error) {
          console.error('Token verification failed:', error);
        }
      }

      // Send auth confirmation
      socket.emit(SERVER_EVENTS.AUTH_OK, {
        profile: {
          id: socket.data.userId,
          displayName: socket.data.displayName,
          avatarJson: socket.data.avatarJson,
        },
        rooms: [], // TODO: fetch from DB
      });
    });

    // Setup room handlers
    setupRoomHandlers(io, socket);

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
}
