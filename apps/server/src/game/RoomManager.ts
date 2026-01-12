import type { Room, Player, RoomObject } from '@isometric-social/shared';

type RoomRuntimeState = {
  room: Room;
  players: Map<string, Player>;
  socketIds: Map<string, string>; // playerId -> socketId
};

export class RoomManager {
  private static instance: RoomManager;
  private rooms: Map<string, RoomRuntimeState> = new Map();

  static getInstance(): RoomManager {
    if (!RoomManager.instance) {
      RoomManager.instance = new RoomManager();
    }
    return RoomManager.instance;
  }

  addPlayer(roomSlug: string, player: Player, socketId: string) {
    let roomState = this.rooms.get(roomSlug);
    if (!roomState) {
      throw new Error(`Room ${roomSlug} not initialized`);
    }

    roomState.players.set(player.id, player);
    roomState.socketIds.set(player.id, socketId);
  }

  removePlayer(roomSlug: string, playerId: string) {
    const roomState = this.rooms.get(roomSlug);
    if (!roomState) return;

    roomState.players.delete(playerId);
    roomState.socketIds.delete(playerId);
  }

  getPlayer(roomSlug: string, playerId: string): Player | undefined {
    return this.rooms.get(roomSlug)?.players.get(playerId);
  }

  getRoom(roomSlug: string): Room | undefined {
    return this.rooms.get(roomSlug)?.room;
  }

  getRoomState(roomSlug: string) {
    const roomState = this.rooms.get(roomSlug);
    if (!roomState) {
      throw new Error(`Room ${roomSlug} not found`);
    }

    return {
      room: roomState.room,
      players: Array.from(roomState.players.values()),
      objects: roomState.room.objectsJson.objects,
    };
  }

  updatePlayerPosition(roomSlug: string, playerId: string, x: number, y: number) {
    const player = this.getPlayer(roomSlug, playerId);
    if (player) {
      player.x = x;
      player.y = y;
    }
  }

  updatePlayerState(roomSlug: string, playerId: string, state: Player['state']) {
    const player = this.getPlayer(roomSlug, playerId);
    if (player) {
      player.state = state;
    }
  }

  initializeRoom(room: Room) {
    this.rooms.set(room.slug, {
      room,
      players: new Map(),
      socketIds: new Map(),
    });
  }

  getSpawnPoint(room: Room): { x: number; y: number } {
    // Find first walkable tile (top-left to bottom-right)
    for (let y = 0; y < room.tilemapJson.height; y++) {
      for (let x = 0; x < room.tilemapJson.width; x++) {
        if (!room.tilemapJson.blocked[y]?.[x]) {
          return { x, y };
        }
      }
    }
    // Fallback
    return { x: 0, y: 0 };
  }
}
