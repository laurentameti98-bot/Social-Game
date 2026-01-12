import type {
  authSchema,
  joinRoomSchema,
  leaveRoomSchema,
  moveIntentSchema,
  chatSendSchema,
  interactSchema,
  authOkSchema,
  roomStateSchema,
  playerJoinSchema,
  playerLeaveSchema,
  playerMoveSchema,
  playerUpdateSchema,
  chatBroadcastSchema,
  playerSchema,
  roomObjectSchema,
  roomSchema,
} from './schemas';
import { z } from 'zod';

// Client -> Server
export type AuthPayload = z.infer<typeof authSchema>;
export type JoinRoomPayload = z.infer<typeof joinRoomSchema>;
export type LeaveRoomPayload = z.infer<typeof leaveRoomSchema>;
export type MoveIntentPayload = z.infer<typeof moveIntentSchema>;
export type ChatSendPayload = z.infer<typeof chatSendSchema>;
export type InteractPayload = z.infer<typeof interactSchema>;

// Server -> Client
export type AuthOkPayload = z.infer<typeof authOkSchema>;
export type RoomStatePayload = z.infer<typeof roomStateSchema>;
export type PlayerJoinPayload = z.infer<typeof playerJoinSchema>;
export type PlayerLeavePayload = z.infer<typeof playerLeaveSchema>;
export type PlayerMovePayload = z.infer<typeof playerMoveSchema>;
export type PlayerUpdatePayload = z.infer<typeof playerUpdateSchema>;
export type ChatBroadcastPayload = z.infer<typeof chatBroadcastSchema>;

// Domain types
export type Player = z.infer<typeof playerSchema>;
export type RoomObject = z.infer<typeof roomObjectSchema>;
export type Room = z.infer<typeof roomSchema>;

// Avatar configuration
export type AvatarConfig = {
  name: string;
  skinTone: string;
  hairStyle: string;
  shirtColor: string;
  pantsColor: string;
  accessory?: string;
};

// Facing direction
export type FacingDirection = 'north' | 'south' | 'east' | 'west';

// Player state
export type PlayerState = 'standing' | 'sitting' | 'walking';
