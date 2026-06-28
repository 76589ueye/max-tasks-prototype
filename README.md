# MaX Tasks — Personal Productivity Monorepo

Welcome to **MaX Tasks**, a premium personal productivity command center for tasks, scheduling, notes, habits, and plans. Built with a unified design system, featuring an offline-first experience, real-time sync, and multi-lingual RTL/LTR alignments.

## Repository Architecture

The monorepo is organized as follows:

```
max-tasks-monorepo/
├── apps/
│   ├── web/                     # Next.js desktop-first application (TypeScript, CSS modules)
│   └── ios/                     # SwiftUI native iOS application (Models, caching, sync)
├── services/
│   └── api/                     # Node/Express API with Prisma ORM (PostgreSQL database)
├── packages/
│   ├── design-tokens/           # Styling variables (CSS, Swift hex maps)
│   └── shared-types/            # Common TypeScript Interfaces
├── docker-compose.yml           # Database containers (PostgreSQL + PgAdmin)
├── package.json                 # Monorepo workspaces coordinator
└── README.md                    # Setup and execution docs
```

---

## Design System

- **Background (Coal Black)**: `#0B0C0F`
- **Surface**: Warm charcoal grays (`#14161D`, `#1E212A`)
- **Primary accent (Ember)**: Glowing orange-red (`#FF4D2A`)
- **Secondary (Gold)**: Muted honey gold (`#E6AF2E`)
- **Typography**: `Outfit` and `Inter` Google fonts
- **Aesthetic**: Premium fine grid background lines, subtle film grain noise filter, soft HSL shadows, clean sharp rounded borders.

---

## Quick Start Guide

### 1. Provision Database Services
Launch the PostgreSQL and PgAdmin containers locally via Docker Compose:
```bash
docker-compose up -d
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` in the root folder:
```bash
cp .env.example .env
```
Ensure your `DATABASE_URL` matches your local PostgreSQL connection.

### 3. Install Monorepo Dependencies
Run this command from the root workspace directory to install all workspaces dependencies:
```bash
npm install
```

### 4. Database Migrations & Seeding
Prepare your PostgreSQL database tables and load beautiful demo records (projects, planned tasks, habits, and notes):
```bash
# Generate Prisma Client and run migrations
npm run db:migrate

# Seed database with demo records
npm run db:seed
```

### 5. Launch Development Servers
Run the Express backend API and Next.js web application simultaneously:
```bash
# Run Express API (localhost:8080)
npm run dev:api

# Run Next.js Web App (localhost:3000)
npm run dev:web
```

### 6. Run iOS SwiftUI Application
Open Xcode and select the file:
`apps/ios/MaxTasks.xcodeproj` (or build/compile the Swift source files directly). The Swift configuration automatically routes traffic to `http://localhost:8080/api/v1` for local development.

---

## Testing API
Verify routing and authentication logic by running:
```bash
npm run test:api
```

---

## Offline-First & Sync Reconciliation
Both Web and iOS applications use a **Last-Write-Wins (LWW)** offline mutations queuing pattern:
1. When offline, user modifications (Task completion, Note editing, Habit logging) are written instantly to `localStorage` (Web) or `UserDefaults` (iOS) caches.
2. The mutation is saved into a local `sync_queue` database.
3. Once internet connectivity is restored, the `SyncEngine` POSTs the queue to the backend `/api/v1/sync` resolver.
4. The backend reconciles conflicts, commits deletions, updates the global `DeletedLog` table, and returns server updates to bring the client fully up-to-date.
