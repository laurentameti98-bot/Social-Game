'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { useSocketStore } from '@/stores/socketStore';
import { CLIENT_EVENTS } from '@isometric-social/shared';

type Room = {
  slug: string;
  name: string;
  playerCount: number;
};

export function LobbyPage() {
  const { user, logout, setCurrentRoom } = useAuthStore();
  const { socket, connect, disconnect } = useSocketStore();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Connect socket and fetch rooms
    connect();

    // Fetch rooms list (TODO: implement API endpoint)
    // For now, we'll use a default room
    setRooms([
      {
        slug: 'lobby',
        name: 'Lobby',
        playerCount: 0,
      },
    ]);
    setIsLoading(false);

    // Don't disconnect when leaving lobby - keep socket connected for GamePage
    // return () => {
    //   disconnect();
    // };
  }, [connect]);

  const handleJoinRoom = (roomSlug: string) => {
    if (socket && socket.connected) {
      socket.emit(CLIENT_EVENTS.JOIN_ROOM, { roomSlug });
      setCurrentRoom(roomSlug);
    } else {
      console.error('Socket not connected');
    }
  };

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="border-b bg-white p-4 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <h1 className="text-2xl font-bold">Isometric Social Rooms</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.profile.displayName}</span>
            <Button variant="outline" onClick={logout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-2xl">
          <h2 className="mb-6 text-2xl font-semibold">Available Rooms</h2>

          {isLoading ? (
            <div className="text-center">Loading rooms...</div>
          ) : (
            <div className="space-y-4">
              {rooms.map((room) => (
                <div
                  key={room.slug}
                  className="flex items-center justify-between rounded-lg border bg-white p-4 shadow-sm"
                >
                  <div>
                    <h3 className="font-semibold">{room.name}</h3>
                    <p className="text-sm text-gray-500">{room.playerCount} players</p>
                  </div>
                  <Button onClick={() => handleJoinRoom(room.slug)}>Join</Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
