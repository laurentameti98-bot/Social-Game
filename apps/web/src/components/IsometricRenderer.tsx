'use client';

import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { useGameStore } from '@/stores/gameStore';
import { useSocketStore } from '@/stores/socketStore';
import { useAuthStore } from '@/stores/authStore';
import { CLIENT_EVENTS, SERVER_EVENTS } from '@isometric-social/shared';

const TILE_WIDTH = 64;
const TILE_HEIGHT = 32;

export function IsometricRenderer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application<HTMLCanvasElement> | null>(null);
  const { roomState } = useGameStore();
  const { socket } = useSocketStore();
  const { user } = useAuthStore();

  useEffect(() => {
    const currentRoomState = roomState;
    const currentSocket = socket;
    const currentUser = user;
    
    if (!containerRef.current || !currentRoomState) return;

    let app: PIXI.Application<HTMLCanvasElement> | null = null;
    const tileSprites: PIXI.Graphics[] = [];
    const objectSprites = new Map<string, PIXI.Graphics>();
    const playerSprites = new Map<string, PIXI.Container>();
    const playerAnimations = new Map<string, { startTime: number; path: Array<{ x: number; y: number }> }>();
    let offsetX = 0;
    let offsetY = 0;

    const initApp = () => {
      app = new PIXI.Application<HTMLCanvasElement>({
        width: containerRef.current!.clientWidth,
        height: containerRef.current!.clientHeight,
        backgroundColor: 0x2a2a2a,
        antialias: true,
        autoStart: true,
      });

      appRef.current = app;

      if (app.view && containerRef.current) {
        containerRef.current.appendChild(app.view);
      }

      const tilemap = currentRoomState.room.tilemapJson;
      const players = currentRoomState.players;
      const objects = currentRoomState.objects;

      // Calculate total map dimensions in screen space for isometric projection
      // screenX = (x - y) * (TILE_WIDTH / 2)
      // screenY = (x + y) * (TILE_HEIGHT / 2)
      
      // Find bounding box of the map
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      
      for (let y = 0; y < tilemap.height; y++) {
        for (let x = 0; x < tilemap.width; x++) {
          const screenX = (x - y) * (TILE_WIDTH / 2);
          const screenY = (x + y) * (TILE_HEIGHT / 2);
          minX = Math.min(minX, screenX);
          maxX = Math.max(maxX, screenX + TILE_WIDTH);
          minY = Math.min(minY, screenY);
          maxY = Math.max(maxY, screenY + TILE_HEIGHT);
        }
      }
      
      const mapWidth = maxX - minX;
      const mapHeight = maxY - minY;
      
      // Calculate offset to center the map
      offsetX = (containerRef.current!.clientWidth - mapWidth) / 2 - minX;
      offsetY = Math.max(50, (containerRef.current!.clientHeight - mapHeight) / 2 - minY);

      // Create tile sprites
      for (let y = 0; y < tilemap.height; y++) {
        for (let x = 0; x < tilemap.width; x++) {
          const screenX = (x - y) * (TILE_WIDTH / 2) + offsetX;
          const screenY = (x + y) * (TILE_HEIGHT / 2) + offsetY;

          const tile = new PIXI.Graphics();
          const isBlocked = tilemap.blocked[y]?.[x];

          // Draw floor tile
          tile.beginFill(isBlocked ? 0x444444 : 0x4a5568);
          tile.drawPolygon([
            { x: 0, y: TILE_HEIGHT / 2 },
            { x: TILE_WIDTH / 2, y: 0 },
            { x: TILE_WIDTH, y: TILE_HEIGHT / 2 },
            { x: TILE_WIDTH / 2, y: TILE_HEIGHT },
          ]);
          tile.endFill();

          // Draw border
          tile.lineStyle(1, 0x2d3748);
          tile.drawPolygon([
            { x: 0, y: TILE_HEIGHT / 2 },
            { x: TILE_WIDTH / 2, y: 0 },
            { x: TILE_WIDTH, y: TILE_HEIGHT / 2 },
            { x: TILE_WIDTH / 2, y: TILE_HEIGHT },
          ]);

          tile.x = screenX;
          tile.y = screenY;
          tile.eventMode = 'static';
          tile.cursor = 'pointer';

          // Click handler
          tile.on('pointerdown', () => {
            if (currentSocket && currentUser) {
              currentSocket.emit(CLIENT_EVENTS.MOVE_INTENT, { x, y });
            }
          });

          app.stage.addChild(tile);
          tileSprites.push(tile);
        }
      }

      // Create object sprites (chairs)
      for (const obj of objects) {
        if (obj.type === 'chair') {
          const screenX = (obj.x - obj.y) * (TILE_WIDTH / 2) + TILE_WIDTH / 2 + offsetX;
          const screenY = (obj.x + obj.y) * (TILE_HEIGHT / 2) + offsetY;

          const chair = new PIXI.Graphics();
          chair.beginFill(0x8b4513);
          chair.drawRect(-8, -8, 16, 16);
          chair.endFill();

          chair.x = screenX;
          chair.y = screenY;
          chair.eventMode = 'static';
          chair.cursor = 'pointer';

          chair.on('pointerdown', () => {
            if (currentSocket) {
              currentSocket.emit(CLIENT_EVENTS.INTERACT, { objectId: obj.id, action: 'sit' });
            }
          });

          app.stage.addChild(chair);
          objectSprites.set(obj.id, chair);
        }
      }

      // Create player sprites
      function createPlayerSprite(player: typeof players[0]): PIXI.Container {
        const container = new PIXI.Container();
        const avatarJson = player.avatarJson as Record<string, unknown>;

        // Simple avatar representation (colored rectangle)
        const body = new PIXI.Graphics();
        const shirtColor = (avatarJson.shirtColor as string) || '#4A90E2';
        const pantsColor = (avatarJson.pantsColor as string) || '#2C3E50';

        // Body (shirt)
        body.beginFill(parseInt(shirtColor.replace('#', ''), 16));
        body.drawRect(-8, -12, 16, 12);
        body.endFill();

        // Pants
        body.beginFill(parseInt(pantsColor.replace('#', ''), 16));
        body.drawRect(-8, 0, 16, 8);
        body.endFill();

        // Head (simple circle)
        body.beginFill(0xffdbac);
        body.drawCircle(0, -16, 6);
        body.endFill();

        container.addChild(body);

        // Name label
        const nameText = new PIXI.Text(player.displayName, {
          fontSize: 10,
          fill: 0xffffff,
          align: 'center',
        });
        nameText.anchor.set(0.5);
        nameText.y = -24;
        container.addChild(nameText);

        return container;
      }

      function updatePlayerSprite(playerId: string, player: typeof players[0]) {
        if (!app) return;
        let sprite = playerSprites.get(playerId);
        if (!sprite) {
          sprite = createPlayerSprite(player);
          app.stage.addChild(sprite);
          playerSprites.set(playerId, sprite);
        }

        const screenX = (player.x - player.y) * (TILE_WIDTH / 2) + TILE_WIDTH / 2 + offsetX;
        const screenY = (player.x + player.y) * (TILE_HEIGHT / 2) + offsetY - (player.state === 'sitting' ? 8 : 0);

        sprite.x = screenX;
        sprite.y = screenY;
      }

      // Initial render
      for (const player of players) {
        updatePlayerSprite(player.id, player);
      }

      // Animation loop
      let lastTime = performance.now();
      function animate(currentTime: number) {
        if (!app) return;
        const delta = currentTime - lastTime;
        lastTime = currentTime;

        // Update player animations
        for (const [playerId, anim] of playerAnimations.entries()) {
          const elapsed = currentTime - anim.startTime;
          const tileDuration = 300; // ms per tile
          const currentTileIndex = Math.floor(elapsed / tileDuration);

          if (currentTileIndex < anim.path.length) {
            const currentTile = anim.path[currentTileIndex];
            const nextTile = anim.path[currentTileIndex + 1];

            if (nextTile) {
              // Interpolate between tiles
              const tileProgress = (elapsed % tileDuration) / tileDuration;
              const x = currentTile.x + (nextTile.x - currentTile.x) * tileProgress;
              const y = currentTile.y + (nextTile.y - currentTile.y) * tileProgress;

              if (currentRoomState) {
                const player = currentRoomState.players.find((p: typeof currentRoomState.players[0]) => p.id === playerId);
                if (player) {
                  const screenX = (x - y) * (TILE_WIDTH / 2) + TILE_WIDTH / 2 + offsetX;
                  const screenY = (x + y) * (TILE_HEIGHT / 2) + offsetY;
                  const sprite = playerSprites.get(playerId);
                  if (sprite) {
                    sprite.x = screenX;
                    sprite.y = screenY;
                  }
                }
              }
            } else {
              // Animation complete
              playerAnimations.delete(playerId);
            }
          } else {
            // Animation complete
            playerAnimations.delete(playerId);
          }
        }

        requestAnimationFrame(animate);
      }
      requestAnimationFrame(animate);

      // Handle player move events
      const handlePlayerMove = (playerId: string, path: Array<{ x: number; y: number }>) => {
        playerAnimations.set(playerId, {
          startTime: performance.now(),
          path,
        });
      };

      // Subscribe to game store updates
      const unsubscribe = useGameStore.subscribe((state: ReturnType<typeof useGameStore.getState>) => {
        if (!app) return;
        // Update player sprites when players change
        const currentPlayers = state.roomState?.players || [];
        for (const player of currentPlayers) {
          updatePlayerSprite(player.id, player);
        }

        // Remove sprites for players that left
        for (const [playerId] of playerSprites) {
          if (!currentPlayers.find((p: typeof currentPlayers[0]) => p.id === playerId)) {
            const sprite = playerSprites.get(playerId);
            if (sprite) {
              app.stage.removeChild(sprite);
              playerSprites.delete(playerId);
              playerAnimations.delete(playerId);
            }
          }
        }
      });

      // Listen for player move events from socket
      if (currentSocket) {
        const handleMove = (data: { playerId: string; path: Array<{ x: number; y: number }> }) => {
          handlePlayerMove(data.playerId, data.path);
        };
        currentSocket.on(SERVER_EVENTS.PLAYER_MOVE, handleMove);

        return () => {
          unsubscribe();
          currentSocket.off(SERVER_EVENTS.PLAYER_MOVE, handleMove);
          if (appRef.current) {
            appRef.current.destroy(true);
            appRef.current = null;
          }
        };
      }

      return () => {
        unsubscribe();
        if (appRef.current) {
          appRef.current.destroy(true);
          appRef.current = null;
        }
      };
    };

    initApp();

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
    };
  }, [roomState, socket, user]);

  return <div ref={containerRef} className="h-full w-full" />;
}
