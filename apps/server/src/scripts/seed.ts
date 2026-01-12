import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create default lobby room
  const lobby = await prisma.room.upsert({
    where: { slug: 'lobby' },
    update: {},
    create: {
      slug: 'lobby',
      name: 'Lobby',
      tilemapJson: {
        width: 12,
        height: 12,
        tiles: Array(12)
          .fill(0)
          .map(() => Array(12).fill(1)), // Simple floor tiles
        blocked: Array(12)
          .fill(false)
          .map(() => Array(12).fill(false)), // All walkable
      },
      objectsJson: {
        objects: [
          {
            id: 'chair-1',
            type: 'chair',
            x: 5,
            y: 5,
            rotation: 0,
          },
          {
            id: 'chair-2',
            type: 'chair',
            x: 7,
            y: 5,
            rotation: 0,
          },
          {
            id: 'chair-3',
            type: 'chair',
            x: 5,
            y: 7,
            rotation: 0,
          },
        ],
      },
    },
  });

  console.log(`✅ Created room: ${lobby.name} (${lobby.slug})`);
  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
