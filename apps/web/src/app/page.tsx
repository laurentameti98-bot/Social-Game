'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { LoginPage } from '@/components/LoginPage';
import { LobbyPage } from '@/components/LobbyPage';
import { GamePage } from '@/components/GamePage';

export default function Home() {
  const { user, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const { currentRoom } = useAuthStore.getState();
  if (currentRoom) {
    return <GamePage />;
  }

  return <LobbyPage />;
}
