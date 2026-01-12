'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useSocketStore } from '@/stores/socketStore';
import { useGameStore } from '@/stores/gameStore';
import { IsometricRenderer } from '@/components/IsometricRenderer';
import { ChatPanel } from '@/components/ChatPanel';
import { Button } from '@/components/ui/button';
import { CLIENT_EVENTS, SERVER_EVENTS } from '@isometric-social/shared';
import type {
  RoomStatePayload,
  PlayerJoinPayload,
  PlayerLeavePayload,
  PlayerMovePayload,
  PlayerUpdatePayload,
  ChatBroadcastPayload,
} from '@isometric-social/shared';

export function GamePage() {
  const { user, currentRoom, setCurrentRoom, logout } = useAuthStore();
  const { socket } = useSocketStore();
  const { roomState, setRoomState, addPlayer, removePlayer, updatePlayer, addChatMessage } = useGameStore();
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (!socket) {
      console.log('GamePage: No socket available');
      return;
    }

    console.log('GamePage: Setting up socket listeners, socket connected:', socket.connected);

    const handleRoomState = (data: RoomStatePayload) => {
      console.log('GamePage: Received ROOM_STATE:', data);
      setRoomState(data);
    };

    const handlePlayerJoin = (data: PlayerJoinPayload) => {
      addPlayer(data.player);
    };

    const handlePlayerLeave = (data: PlayerLeavePayload) => {
      removePlayer(data.playerId);
    };

    const handlePlayerMove = (data: PlayerMovePayload) => {
      updatePlayer(data.playerId, { path: data.path });
    };

    const handlePlayerUpdate = (data: PlayerUpdatePayload) => {
      updatePlayer(data.playerId, {
        state: data.state,
        x: data.x,
        y: data.y,
        facing: data.facing,
      });
    };

    const handleChatBroadcast = (data: ChatBroadcastPayload) => {
      addChatMessage({
        playerId: data.playerId,
        text: data.text,
        timestamp: data.ts,
      });
    };

    socket.on(SERVER_EVENTS.ROOM_STATE, handleRoomState);
    socket.on(SERVER_EVENTS.PLAYER_JOIN, handlePlayerJoin);
    socket.on(SERVER_EVENTS.PLAYER_LEAVE, handlePlayerLeave);
    socket.on(SERVER_EVENTS.PLAYER_MOVE, handlePlayerMove);
    socket.on(SERVER_EVENTS.PLAYER_UPDATE, handlePlayerUpdate);
    socket.on(SERVER_EVENTS.CHAT_BROADCAST, handleChatBroadcast);
    socket.on(SERVER_EVENTS.ERROR, (data: { message: string }) => {
      console.error('GamePage: Socket error:', data.message);
    });

    // If socket is already connected and we have a currentRoom, try to join
    if (socket.connected && currentRoom) {
      console.log('GamePage: Socket already connected, joining room:', currentRoom);
      socket.emit(CLIENT_EVENTS.JOIN_ROOM, { roomSlug: currentRoom });
    }

    return () => {
      socket.off(SERVER_EVENTS.ROOM_STATE, handleRoomState);
      socket.off(SERVER_EVENTS.PLAYER_JOIN, handlePlayerJoin);
      socket.off(SERVER_EVENTS.PLAYER_LEAVE, handlePlayerLeave);
      socket.off(SERVER_EVENTS.PLAYER_MOVE, handlePlayerMove);
      socket.off(SERVER_EVENTS.PLAYER_UPDATE, handlePlayerUpdate);
      socket.off(SERVER_EVENTS.CHAT_BROADCAST, handleChatBroadcast);
    };
  }, [socket, setRoomState, addPlayer, removePlayer, updatePlayer, addChatMessage]);

  const handleLeaveRoom = () => {
    if (!socket || isLeaving) return;
    setIsLeaving(true);
    socket.emit(CLIENT_EVENTS.LEAVE_ROOM);
    setCurrentRoom(null);
  };

  if (!roomState) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading room...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-700 bg-gray-800 p-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">{roomState.room.name}</h1>
            <p className="text-sm text-gray-400">{roomState.players.length} players</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-300">{user?.profile.displayName}</span>
            <Button variant="outline" onClick={handleLeaveRoom} disabled={isLeaving}>
              Leave Room
            </Button>
            <Button variant="outline" onClick={logout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Game Canvas */}
      <div className="relative flex-1 overflow-hidden">
        <IsometricRenderer />
      </div>

      {/* Chat Panel */}
      <ChatPanel />
    </div>
  );
}
