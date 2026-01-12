import type { Room } from '@isometric-social/shared';

type Node = {
  x: number;
  y: number;
  g: number; // cost from start
  h: number; // heuristic to goal
  f: number; // g + h
  parent: Node | null;
};

export class Pathfinder {
  private width: number;
  private height: number;
  private blocked: boolean[][];

  constructor(tilemap: Room['tilemapJson']) {
    this.width = tilemap.width;
    this.height = tilemap.height;
    this.blocked = tilemap.blocked;
  }

  findPath(startX: number, startY: number, endX: number, endY: number): Array<{ x: number; y: number }> {
    // If start == end, return empty path
    if (startX === endX && startY === endY) {
      return [{ x: endX, y: endY }];
    }

    const openSet: Node[] = [];
    const closedSet = new Set<string>();

    const startNode: Node = {
      x: startX,
      y: startY,
      g: 0,
      h: this.heuristic(startX, startY, endX, endY),
      f: 0,
      parent: null,
    };
    startNode.f = startNode.g + startNode.h;
    openSet.push(startNode);

    while (openSet.length > 0) {
      // Find node with lowest f
      let currentIndex = 0;
      for (let i = 1; i < openSet.length; i++) {
        if (openSet[i].f < openSet[currentIndex].f) {
          currentIndex = i;
        }
      }

      const current = openSet.splice(currentIndex, 1)[0];
      const currentKey = `${current.x},${current.y}`;
      closedSet.add(currentKey);

      // Check if we reached the goal
      if (current.x === endX && current.y === endY) {
        return this.reconstructPath(current);
      }

      // Check neighbors (4-directional)
      const neighbors = [
        { x: current.x, y: current.y - 1 }, // north
        { x: current.x, y: current.y + 1 }, // south
        { x: current.x - 1, y: current.y }, // west
        { x: current.x + 1, y: current.y }, // east
      ];

      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.x},${neighbor.y}`;

        // Skip if out of bounds
        if (neighbor.x < 0 || neighbor.x >= this.width || neighbor.y < 0 || neighbor.y >= this.height) {
          continue;
        }

        // Skip if blocked
        if (this.blocked[neighbor.y]?.[neighbor.x]) {
          continue;
        }

        // Skip if already evaluated
        if (closedSet.has(neighborKey)) {
          continue;
        }

        const g = current.g + 1; // Each step costs 1

        // Check if already in open set
        const existingOpen = openSet.find((n) => n.x === neighbor.x && n.y === neighbor.y);
        if (existingOpen) {
          if (g < existingOpen.g) {
            existingOpen.g = g;
            existingOpen.f = existingOpen.g + existingOpen.h;
            existingOpen.parent = current;
          }
        } else {
          const neighborNode: Node = {
            x: neighbor.x,
            y: neighbor.y,
            g,
            h: this.heuristic(neighbor.x, neighbor.y, endX, endY),
            f: 0,
            parent: current,
          };
          neighborNode.f = neighborNode.g + neighborNode.h;
          openSet.push(neighborNode);
        }
      }
    }

    // No path found
    return [];
  }

  private heuristic(x1: number, y1: number, x2: number, y2: number): number {
    // Manhattan distance
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
  }

  private reconstructPath(node: Node): Array<{ x: number; y: number }> {
    const path: Array<{ x: number; y: number }> = [];
    let current: Node | null = node;

    while (current) {
      path.unshift({ x: current.x, y: current.y });
      current = current.parent;
    }

    return path;
  }
}
