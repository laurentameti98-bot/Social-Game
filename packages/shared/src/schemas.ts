import { z } from 'zod';

// ==================== Client -> Server Events ====================

export const authSchema = z.object({
  token: z.string().optional(),
  guest: z.boolean().optional(),
});

export const joinRoomSchema = z.object({
  roomSlug: z.string().min(1).max(50),
});

export const leaveRoomSchema = z.object({});

export const moveIntentSchema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
});

export const chatSendSchema = z.object({
  text: z.string().min(1).max(120),
});

export const interactSchema = z.object({
  objectId: z.string(),
  action: z.string(),
});

// ==================== Server -> Client Events ====================

export const playerSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  x: z.number().int(),
  y: z.number().int(),
  facing: z.enum(['north', 'south', 'east', 'west']),
  state: z.enum(['standing', 'sitting', 'walking']).default('standing'),
  avatarJson: z.record(z.unknown()),
});

export const roomObjectSchema = z.object({
  id: z.string(),
  type: z.string(),
  x: z.number().int(),
  y: z.number().int(),
  rotation: z.number().int().default(0),
  state: z.record(z.unknown()).optional(),
});

export const tilemapSchema = z.object({
  width: z.number().int().min(1),
  height: z.number().int().min(1),
  tiles: z.array(z.array(z.number().int())),
  blocked: z.array(z.array(z.boolean())),
});

export const roomSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  tilemapJson: tilemapSchema,
  objectsJson: z.object({
    objects: z.array(roomObjectSchema),
  }),
});

export const authOkSchema = z.object({
  profile: z.object({
    id: z.string(),
    displayName: z.string(),
    avatarJson: z.record(z.unknown()),
  }),
  rooms: z.array(
    z.object({
      slug: z.string(),
      name: z.string(),
      playerCount: z.number().int(),
    })
  ),
});

export const roomStateSchema = z.object({
  room: roomSchema,
  players: z.array(playerSchema),
  objects: z.array(roomObjectSchema),
});

export const playerJoinSchema = z.object({
  player: playerSchema,
});

export const playerLeaveSchema = z.object({
  playerId: z.string(),
});

export const playerMoveSchema = z.object({
  playerId: z.string(),
  path: z.array(
    z.object({
      x: z.number().int(),
      y: z.number().int(),
    })
  ),
});

export const playerUpdateSchema = z.object({
  playerId: z.string(),
  state: z.enum(['standing', 'sitting', 'walking']).optional(),
  x: z.number().int().optional(),
  y: z.number().int().optional(),
  facing: z.enum(['north', 'south', 'east', 'west']).optional(),
});

export const chatBroadcastSchema = z.object({
  playerId: z.string(),
  text: z.string(),
  ts: z.number().int(),
});

// ==================== WebSocket Event Names ====================

export const CLIENT_EVENTS = {
  AUTH: 'auth',
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  MOVE_INTENT: 'move_intent',
  CHAT_SEND: 'chat_send',
  INTERACT: 'interact',
} as const;

export const SERVER_EVENTS = {
  AUTH_OK: 'auth_ok',
  ROOM_STATE: 'room_state',
  PLAYER_JOIN: 'player_join',
  PLAYER_LEAVE: 'player_leave',
  PLAYER_MOVE: 'player_move',
  PLAYER_UPDATE: 'player_update',
  CHAT_BROADCAST: 'chat_broadcast',
  ERROR: 'error',
} as const;
