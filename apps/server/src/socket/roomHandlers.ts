import type { Server, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { CLIENT_EVENTS, SERVER_EVENTS, joinRoomSchema, moveIntentSchema, chatSendSchema, interactSchema } from '@isometric-social/shared';
import type { Room, Player, RoomObject } from '@isometric-social/shared';
import { RoomManager } from '../game/RoomManager.js';
import { Pathfinder } from '../game/Pathfinder.js';

const prisma = new PrismaClient();
const roomManager = RoomManager.getInstance();

export function setupRoomHandlers(io: Server, socket: Socket) {
  const roomManager = RoomManager.getInstance();

  // Join room
  socket.on(CLIENT_EVENTS.JOIN_ROOM, async (payload: unknown) => {
    try {
      const { roomSlug } = joinRoomSchema.parse(payload);

      // Leave current room if any
      if (socket.data.currentRoom) {
        await handleLeaveRoom(io, socket, roomManager);
      }

      // Load room from DB
      const roomData = await prisma.room.findUnique({
        where: { slug: roomSlug },
      });

      if (!roomData) {
        socket.emit(SERVER_EVENTS.ERROR, { message: 'Room not found' });
        return;
      }

      const room: Room = {
        id: roomData.id,
        slug: roomData.slug,
        name: roomData.name,
        tilemapJson: roomData.tilemapJson as Room['tilemapJson'],
        objectsJson: roomData.objectsJson as Room['objectsJson'],
      };

      // Initialize room if not already initialized
      if (!roomManager.getRoom(roomSlug)) {
        roomManager.initializeRoom(room);
      }

      // Join room
      socket.join(`room:${roomSlug}`);
      socket.data.currentRoom = roomSlug;

      // Add player to room runtime state
      const spawnPoint = roomManager.getSpawnPoint(room);
      const player: Player = {
        id: socket.data.userId,
        displayName: socket.data.displayName,
        x: spawnPoint.x,
        y: spawnPoint.y,
        facing: 'south',
        state: 'standing',
        avatarJson: socket.data.avatarJson,
      };

      roomManager.addPlayer(roomSlug, player, socket.id);

      // Send room state to joining player
      const roomState = roomManager.getRoomState(roomSlug);
      socket.emit(SERVER_EVENTS.ROOM_STATE, roomState);

      // Broadcast player join to others
      socket.to(`room:${roomSlug}`).emit(SERVER_EVENTS.PLAYER_JOIN, { player });

      console.log(`Player ${socket.data.displayName} joined room ${roomSlug}`);
    } catch (error) {
      console.error('Join room error:', error);
      socket.emit(SERVER_EVENTS.ERROR, { message: 'Failed to join room' });
    }
  });

  // Leave room
  socket.on(CLIENT_EVENTS.LEAVE_ROOM, async () => {
    await handleLeaveRoom(io, socket, roomManager);
  });

  // Move intent
  socket.on(CLIENT_EVENTS.MOVE_INTENT, (payload: unknown) => {
    try {
      const { x, y } = moveIntentSchema.parse(payload);
      const roomSlug = socket.data.currentRoom;

      if (!roomSlug) {
        socket.emit(SERVER_EVENTS.ERROR, { message: 'Not in a room' });
        return;
      }

      const room = roomManager.getRoom(roomSlug);
      if (!room) {
        socket.emit(SERVER_EVENTS.ERROR, { message: 'Room not found' });
        return;
      }

      const player = roomManager.getPlayer(roomSlug, socket.data.userId);
      if (!player) {
        socket.emit(SERVER_EVENTS.ERROR, { message: 'Player not found' });
        return;
      }

      // Don't allow movement while sitting
      if (player.state === 'sitting') {
        socket.emit(SERVER_EVENTS.ERROR, { message: 'Stand up first' });
        return;
      }

      // Validate bounds
      if (x < 0 || y < 0 || x >= room.tilemapJson.width || y >= room.tilemapJson.height) {
        socket.emit(SERVER_EVENTS.ERROR, { message: 'Out of bounds' });
        return;
      }

      // Validate walkable
      if (room.tilemapJson.blocked[y]?.[x]) {
        socket.emit(SERVER_EVENTS.ERROR, { message: 'Tile is blocked' });
        return;
      }

      // Calculate path
      const pathfinder = new Pathfinder(room.tilemapJson);
      const path = pathfinder.findPath(player.x, player.y, x, y);

      if (path.length === 0) {
        socket.emit(SERVER_EVENTS.ERROR, { message: 'No path found' });
        return;
      }

      // Update player state
      roomManager.updatePlayerPosition(roomSlug, socket.data.userId, path[path.length - 1].x, path[path.length - 1].y);
      roomManager.updatePlayerState(roomSlug, socket.data.userId, 'walking');

      // Broadcast to room
      io.to(`room:${roomSlug}`).emit(SERVER_EVENTS.PLAYER_MOVE, {
        playerId: socket.data.userId,
        path,
      });

      // Update to standing after movement completes (simplified: client will handle)
      setTimeout(() => {
        roomManager.updatePlayerState(roomSlug, socket.data.userId, 'standing');
        io.to(`room:${roomSlug}`).emit(SERVER_EVENTS.PLAYER_UPDATE, {
          playerId: socket.data.userId,
          state: 'standing',
        });
      }, path.length * 300); // 300ms per tile
    } catch (error) {
      console.error('Move intent error:', error);
      socket.emit(SERVER_EVENTS.ERROR, { message: 'Invalid move' });
    }
  });

  // Chat send
  const chatRateLimit = new Map<string, number>();
  socket.on(CLIENT_EVENTS.CHAT_SEND, (payload: unknown) => {
    try {
      const { text } = chatSendSchema.parse(payload);
      const roomSlug = socket.data.currentRoom;

      if (!roomSlug) {
        socket.emit(SERVER_EVENTS.ERROR, { message: 'Not in a room' });
        return;
      }

      // Rate limit: 1 message per 800ms
      const lastMessage = chatRateLimit.get(socket.id) || 0;
      const now = Date.now();
      if (now - lastMessage < 800) {
        socket.emit(SERVER_EVENTS.ERROR, { message: 'Rate limit exceeded' });
        return;
      }
      chatRateLimit.set(socket.id, now);

      // Sanitize (basic HTML escape)
      const sanitized = text.replace(/[<>&"']/g, (char) => {
        const map: Record<string, string> = {
          '<': '&lt;',
          '>': '&gt;',
          '&': '&amp;',
          '"': '&quot;',
          "'": '&#39;',
        };
        return map[char] || char;
      });

      // Broadcast to room
      io.to(`room:${roomSlug}`).emit(SERVER_EVENTS.CHAT_BROADCAST, {
        playerId: socket.data.userId,
        text: sanitized,
        ts: now,
      });
    } catch (error) {
      console.error('Chat send error:', error);
      socket.emit(SERVER_EVENTS.ERROR, { message: 'Invalid chat message' });
    }
  });

  // Interact
  socket.on(CLIENT_EVENTS.INTERACT, (payload: unknown) => {
    try {
      const { objectId, action } = interactSchema.parse(payload);
      const roomSlug = socket.data.currentRoom;

      if (!roomSlug) {
        socket.emit(SERVER_EVENTS.ERROR, { message: 'Not in a room' });
        return;
      }

      const room = roomManager.getRoom(roomSlug);
      if (!room) {
        socket.emit(SERVER_EVENTS.ERROR, { message: 'Room not found' });
        return;
      }

      const player = roomManager.getPlayer(roomSlug, socket.data.userId);
      if (!player) {
        socket.emit(SERVER_EVENTS.ERROR, { message: 'Player not found' });
        return;
      }

      // Find object
      const obj = room.objectsJson.objects.find((o) => o.id === objectId);
      if (!obj) {
        socket.emit(SERVER_EVENTS.ERROR, { message: 'Object not found' });
        return;
      }

      // Handle chair sit
      if (obj.type === 'chair' && action === 'sit') {
        // Check adjacency (within 1 tile)
        const dx = Math.abs(player.x - obj.x);
        const dy = Math.abs(player.y - obj.y);
        if (dx > 1 || dy > 1) {
          socket.emit(SERVER_EVENTS.ERROR, { message: 'Too far from chair' });
          return;
        }

        // Update player state
        roomManager.updatePlayerPosition(roomSlug, socket.data.userId, obj.x, obj.y);
        roomManager.updatePlayerState(roomSlug, socket.data.userId, 'sitting');

        // Broadcast
        io.to(`room:${roomSlug}`).emit(SERVER_EVENTS.PLAYER_UPDATE, {
          playerId: socket.data.userId,
          state: 'sitting',
          x: obj.x,
          y: obj.y,
        });
      } else if (action === 'stand') {
        // Stand up
        roomManager.updatePlayerState(roomSlug, socket.data.userId, 'standing');
        io.to(`room:${roomSlug}`).emit(SERVER_EVENTS.PLAYER_UPDATE, {
          playerId: socket.data.userId,
          state: 'standing',
        });
      }
    } catch (error) {
      console.error('Interact error:', error);
      socket.emit(SERVER_EVENTS.ERROR, { message: 'Invalid interaction' });
    }
  });
}

async function handleLeaveRoom(io: Server, socket: Socket, roomManager: ReturnType<typeof RoomManager.getInstance>) {
  const roomSlug = socket.data.currentRoom;
  if (!roomSlug) return;

  socket.leave(`room:${roomSlug}`);
  roomManager.removePlayer(roomSlug, socket.data.userId);

  io.to(`room:${roomSlug}`).emit(SERVER_EVENTS.PLAYER_LEAVE, {
    playerId: socket.data.userId,
  });

  socket.data.currentRoom = null;
  console.log(`Player ${socket.data.displayName} left room ${roomSlug}`);
}
