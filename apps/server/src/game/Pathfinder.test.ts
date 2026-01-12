import { describe, it, expect } from 'vitest';
import { Pathfinder } from './Pathfinder';
import type { Room } from '@isometric-social/shared';

describe('Pathfinder', () => {
  const createTilemap = (width: number, height: number, blocked: boolean[][]): Room['tilemapJson'] => ({
    width,
    height,
    tiles: Array(height)
      .fill(0)
      .map(() => Array(width).fill(1)),
    blocked,
  });

  it('should find a simple path', () => {
    const tilemap = createTilemap(5, 5, [
      [false, false, false, false, false],
      [false, false, false, false, false],
      [false, false, false, false, false],
      [false, false, false, false, false],
      [false, false, false, false, false],
    ]);

    const pathfinder = new Pathfinder(tilemap);
    const path = pathfinder.findPath(0, 0, 4, 4);

    expect(path.length).toBeGreaterThan(0);
    expect(path[0]).toEqual({ x: 0, y: 0 });
    expect(path[path.length - 1]).toEqual({ x: 4, y: 4 });
  });

  it('should return empty path when blocked', () => {
    const tilemap = createTilemap(3, 3, [
      [false, true, false],
      [true, true, true],
      [false, true, false],
    ]);

    const pathfinder = new Pathfinder(tilemap);
    const path = pathfinder.findPath(0, 0, 2, 2);

    expect(path.length).toBe(0);
  });

  it('should return single tile when start equals end', () => {
    const tilemap = createTilemap(3, 3, [
      [false, false, false],
      [false, false, false],
      [false, false, false],
    ]);

    const pathfinder = new Pathfinder(tilemap);
    const path = pathfinder.findPath(1, 1, 1, 1);

    expect(path).toEqual([{ x: 1, y: 1 }]);
  });

  it('should find path around obstacles', () => {
    const tilemap = createTilemap(5, 5, [
      [false, false, false, false, false],
      [false, true, true, true, false],
      [false, false, false, false, false],
      [false, true, true, true, false],
      [false, false, false, false, false],
    ]);

    const pathfinder = new Pathfinder(tilemap);
    const path = pathfinder.findPath(0, 0, 4, 4);

    expect(path.length).toBeGreaterThan(0);
    expect(path[0]).toEqual({ x: 0, y: 0 });
    expect(path[path.length - 1]).toEqual({ x: 4, y: 4 });
  });
});
