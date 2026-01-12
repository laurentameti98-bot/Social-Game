import { create } from 'zustand';
import type { RoomStatePayload, Player, RoomObject } from '@isometric-social/shared';

type ChatMessage = {
  playerId: string;
  text: string;
  timestamp: number;
};

type GameState = {
  roomState: RoomStatePayload | null;
  chatMessages: ChatMessage[];
  setRoomState: (state: RoomStatePayload) => void;
  addPlayer: (player: Player) => void;
  removePlayer: (playerId: string) => void;
  updatePlayer: (
    playerId: string,
    updates: Partial<Player & { path?: Array<{ x: number; y: number }> }>
  ) => void;
  addChatMessage: (message: ChatMessage) => void;
};

export const useGameStore = create<GameState>((set) => ({
  roomState: null,
  chatMessages: [],

  setRoomState: (state) => {
    set({ roomState: state });
  },

  addPlayer: (player) => {
    set((state) => {
      if (!state.roomState) return state;
      const existingIndex = state.roomState.players.findIndex((p) => p.id === player.id);
      if (existingIndex >= 0) {
        const updated = [...state.roomState.players];
        updated[existingIndex] = player;
        return { roomState: { ...state.roomState, players: updated } };
      }
      return { roomState: { ...state.roomState, players: [...state.roomState.players, player] } };
    });
  },

  removePlayer: (playerId) => {
    set((state) => {
      if (!state.roomState) return state;
      return {
        roomState: {
          ...state.roomState,
          players: state.roomState.players.filter((p) => p.id !== playerId),
        },
      };
    });
  },

  updatePlayer: (playerId, updates) => {
    set((state) => {
      if (!state.roomState) return state;
      const players = state.roomState.players.map((p) => {
        if (p.id === playerId) {
          return { ...p, ...updates };
        }
        return p;
      });
      return { roomState: { ...state.roomState, players } };
    });
  },

  addChatMessage: (message) => {
    set((state) => ({
      chatMessages: [...state.chatMessages.slice(-49), message], // Keep last 50 messages
    }));
  },
}));
