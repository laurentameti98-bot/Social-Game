import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from './authStore';
import { CLIENT_EVENTS, SERVER_EVENTS } from '@isometric-social/shared';
import type {
  RoomStatePayload,
  PlayerJoinPayload,
  PlayerLeavePayload,
  PlayerMovePayload,
  PlayerUpdatePayload,
  ChatBroadcastPayload,
} from '@isometric-social/shared';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

type SocketState = {
  socket: Socket | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
};

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,

  connect: () => {
    const { user } = useAuthStore.getState();
    const existingSocket = get().socket;
    
    // If socket exists and is connected, don't create a new one
    if (existingSocket?.connected) {
      console.log('Socket already connected');
      return;
    }
    
    // If socket exists but not connected, disconnect it first
    if (existingSocket) {
      existingSocket.disconnect();
    }

    // Socket.IO will send cookies automatically with withCredentials: true
    // The server will read the token from cookies
    const socket = io(SOCKET_URL, {
      auth: {
        // Token will be read from cookies by the server
      },
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      set({ isConnected: true });

      // Send auth event - server will use token from cookie if available
      socket.emit(CLIENT_EVENTS.AUTH, { guest: !user });

      // Join room if already selected
      const { currentRoom } = useAuthStore.getState();
      if (currentRoom) {
        console.log('Auto-joining room:', currentRoom);
        socket.emit(CLIENT_EVENTS.JOIN_ROOM, { roomSlug: currentRoom });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      set({ isConnected: false });
      
      // Only clear socket if it was intentionally disconnected
      if (reason === 'io client disconnect') {
        // Client intentionally disconnected, keep socket reference but mark as disconnected
        // Don't clear socket here, let disconnect() method handle it
      }
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    socket.on(SERVER_EVENTS.AUTH_OK, (data) => {
      console.log('Auth OK:', data);
    });

    socket.on(SERVER_EVENTS.ROOM_STATE, (data: RoomStatePayload) => {
      // Handle room state update - this will be handled by GamePage component
      console.log('Room state received:', data);
    });

    socket.on(SERVER_EVENTS.PLAYER_JOIN, (data: PlayerJoinPayload) => {
      console.log('Player joined:', data);
    });

    socket.on(SERVER_EVENTS.PLAYER_LEAVE, (data: PlayerLeavePayload) => {
      console.log('Player left:', data);
    });

    socket.on(SERVER_EVENTS.PLAYER_MOVE, (data: PlayerMovePayload) => {
      console.log('Player moved:', data);
    });

    socket.on(SERVER_EVENTS.PLAYER_UPDATE, (data: PlayerUpdatePayload) => {
      console.log('Player updated:', data);
    });

    socket.on(SERVER_EVENTS.CHAT_BROADCAST, (data: ChatBroadcastPayload) => {
      console.log('Chat:', data);
    });

    socket.on(SERVER_EVENTS.ERROR, (data: { message: string }) => {
      console.error('Socket error:', data.message);
    });

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },
}));
