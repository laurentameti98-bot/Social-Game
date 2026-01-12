'use client';

import { useState, useRef, useEffect } from 'react';
import { useSocketStore } from '@/stores/socketStore';
import { useGameStore } from '@/stores/gameStore';
import { useAuthStore } from '@/stores/authStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CLIENT_EVENTS } from '@isometric-social/shared';

export function ChatPanel() {
  const { socket } = useSocketStore();
  const { chatMessages } = useGameStore();
  const { user } = useAuthStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSend = () => {
    if (!socket || !input.trim()) return;

    socket.emit(CLIENT_EVENTS.CHAT_SEND, { text: input.trim() });
    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getPlayerName = (playerId: string) => {
    const { roomState } = useGameStore.getState();
    return roomState?.players.find((p) => p.id === playerId)?.displayName || 'Unknown';
  };

  return (
    <div className="border-t border-gray-700 bg-gray-800">
      {/* Chat Log */}
      <div className="h-32 overflow-y-auto p-2">
        {chatMessages.map((msg, idx) => {
          const isOwn = msg.playerId === user?.id;
          return (
            <div key={idx} className={`mb-1 text-sm ${isOwn ? 'text-blue-300' : 'text-gray-300'}`}>
              <span className="font-semibold">{getPlayerName(msg.playerId)}:</span> {msg.text}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="flex gap-2 border-t border-gray-700 p-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          maxLength={120}
          className="flex-1 bg-gray-700 text-white placeholder:text-gray-400"
        />
        <Button onClick={handleSend} disabled={!input.trim()}>
          Send
        </Button>
      </div>
    </div>
  );
}
