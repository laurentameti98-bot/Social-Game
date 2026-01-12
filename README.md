# Isometric Social Rooms

Ein webbasiertes, von klassischen 2D-Isometric-Room-Spielen inspiriertes Social-Game MVP.

## Tech-Stack Entscheidungen

### Backend
- **Fastify**: Gewählt für schnelles Setup und Performance. NestJS wäre für größere Projekte besser, aber für MVP ist Fastify pragmatischer.
- **Socket.IO**: Gewählt für bessere DX mit Rooms/Namespaces, automatische Reconnection und einfache Event-Handling. Native `ws` wäre performanter, aber Socket.IO bietet mehr Features out-of-the-box.

### Frontend
- **Next.js App Router**: Modernes React Framework mit Server Components Support
- **PixiJS**: Custom Tile-Rendering für MVP. Pixi Tilemap-Libs könnten später integriert werden, aber für MVP ist custom Rendering flexibler.

## Setup

### Voraussetzungen
- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Docker & Docker Compose

### Installation

1. **Dependencies installieren:**
```bash
pnpm install
```

2. **Docker Compose starten (PostgreSQL):**
```bash
docker compose up -d
```

3. **Umgebungsvariablen einrichten:**
```bash
# Server
cd apps/server
cp .env.example .env  # Falls vorhanden, sonst siehe unten

# Web (optional, falls nötig)
cd ../web
```

4. **Datenbank migrieren und seeden:**
```bash
# Im Root-Verzeichnis
pnpm db:migrate
pnpm db:seed
```

5. **Entwicklungsserver starten:**
```bash
# Im Root-Verzeichnis - startet beide Server
pnpm dev

# Oder einzeln:
pnpm --filter server dev  # Port 3001
pnpm --filter web dev      # Port 3000
```

6. **Öffne im Browser:**
```
http://localhost:3000
```

## Umgebungsvariablen

### Server (`apps/server/.env`)
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/isometric_social_rooms"
JWT_SECRET="change-me-in-production-use-random-string"
COOKIE_SECRET="change-me-in-production-use-random-string"
PORT=3001
CORS_ORIGIN="http://localhost:3000"
NODE_ENV="development"
```

### Web (`apps/web/.env.local`)
```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_SOCKET_URL="http://localhost:3001"
```

## Projektstruktur

```
.
├── apps/
│   ├── server/          # Fastify + Socket.IO Backend
│   │   ├── src/
│   │   │   ├── routes/  # HTTP Routes (Auth)
│   │   │   ├── socket/  # WebSocket Handlers
│   │   │   ├── game/    # Game Logic (Pathfinding, RoomManager)
│   │   │   └── scripts/ # Seed Scripts
│   │   └── prisma/      # Prisma Schema
│   └── web/             # Next.js Frontend
│       └── src/
│           ├── app/     # Next.js App Router Pages
│           ├── components/  # React Components
│           └── stores/  # Zustand Stores
└── packages/
    └── shared/          # Shared Types & Zod Schemas
```

## Features (MVP)

✅ **Auth & Profile**
- Registrieren/Einloggen mit Email+Password
- JWT in httpOnly Cookie
- Avatar-Konfiguration (Name, Farben, Styles)

✅ **Rooms & Presence**
- Lobby-Seite mit Raumliste
- Raum betreten/verlassen
- Echtzeit Presence (Join/Leave)

✅ **Movement (Isometric Grid)**
- Click-to-walk auf Tiles
- Server-seitige Pathfinding (A*)
- Kollisionserkennung
- Smooth Animation

✅ **Chat (Realtime)**
- Chat-Input mit Rate Limiting
- Nachrichten-Bubbles über Avataren
- Chat-Log Panel

✅ **Interaktionen**
- Chair: Sitzen/Stehen
- Adjacency-Check

## Testing

```bash
# Unit Tests (Server)
pnpm --filter server test

# E2E Tests (TODO: Playwright Setup)
# pnpm test:e2e
```

## Scripts

```bash
# Development
pnpm dev                    # Startet beide Server

# Database
pnpm db:migrate            # Führt Migrationen aus
pnpm db:seed               # Seeded Demo-Daten
pnpm db:studio             # Öffnet Prisma Studio

# Build
pnpm build                 # Baut alle Packages

# Linting
pnpm lint                  # Lintet alle Packages
pnpm format                # Formatiert Code mit Prettier
```

## Akzeptanzkriterien Status

- ✅ Zwei Browserfenster können sich einloggen und denselben Raum betreten
- ✅ Beide sehen sich gegenseitig in Echtzeit (join/leave)
- ✅ Click-to-walk funktioniert, Kollisionen werden serverseitig verhindert
- ✅ Chat wird in Echtzeit übertragen, inkl. Bubble + log
- ✅ Chair: Nutzer kann sitzen, State wird für alle sichtbar
- ✅ Hot reload im Dev, sauberer TypeScript build
- ✅ README lässt das Projekt lokal starten

## Bekannte Limitationen / TODOs

- [ ] Guest Mode: Temporäre Profile für Gäste
- [ ] Avatar Builder UI: Visueller Editor für Avatar-Konfiguration
- [ ] Room List API: Dynamische Raumliste vom Server
- [ ] Reconnect Flow: Besseres Handling bei Verbindungsabbrüchen
- [ ] Error Toasts: User-freundliche Fehlermeldungen
- [ ] E2E Tests: Playwright Setup für kritische Flows
- [ ] Performance: Optimierungen für viele Spieler
- [ ] Multi-Room: Gleichzeitiger Besuch mehrerer Räume

## Lizenz

Dieses Projekt verwendet ausschließlich eigene/CC0 Assets und generische Benennungen. Keine geschützten Marken oder Assets.
