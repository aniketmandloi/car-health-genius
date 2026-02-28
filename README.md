# car-health-genius

## Features

- **TypeScript** - For type safety and improved developer experience
- **Next.js** - Full-stack React framework
- **React Native** - Build mobile apps using React
- **Expo** - Tools for React Native development
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **shadcn/ui** - Reusable UI components
- **Fastify** - Fast, low-overhead web framework
- **tRPC** - End-to-end type-safe APIs
- **Node.js** - Runtime environment
- **Drizzle** - TypeScript-first ORM
- **PostgreSQL** - Database engine
- **Authentication** - Better-Auth
- **Turborepo** - Optimized monorepo build system

## Getting Started

First, install the dependencies:

```bash
pnpm install
```

## Database Setup

This project uses PostgreSQL with Drizzle ORM.

1. Make sure you have a PostgreSQL database set up.
2. Update your `apps/server/.env` file with your PostgreSQL connection details.

3. Apply migrations to your database:

```bash
pnpm run db:migrate
```

If you previously used `db:push` on this database, the schema may exist without
Drizzle migration history in `drizzle.__drizzle_migrations`. In that case,
baseline the migration ledger first (see `docs` or project runbook), then run
`pnpm run db:migrate`.

Sprint 6 seed data (recommended after migrations):

```bash
pnpm run seed:dtc-knowledge
pnpm run seed:diy-guides
pnpm run seed:partners-sprint6
```

Then, run the development server:

```bash
pnpm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the web application.
Use the Expo Go app to run the mobile application.
The API is running at [http://localhost:3000](http://localhost:3000).

## Project Structure

```
car-health-genius/
├── apps/
│   ├── web/         # Frontend application (Next.js)
│   ├── native/      # Mobile application (React Native, Expo)
│   └── server/      # Backend API (Fastify, TRPC)
├── packages/
│   ├── api/         # API layer / business logic
│   ├── auth/        # Authentication configuration & logic
│   └── db/          # Database schema & queries
```

## Available Scripts

- `pnpm run dev`: Start all applications in development mode
- `pnpm run build`: Build all applications
- `pnpm run dev:web`: Start only the web application
- `pnpm run dev:server`: Start only the server
- `pnpm run check-types`: Check TypeScript types across all apps
- `pnpm run dev:native`: Start the React Native/Expo development server
- `pnpm run db:push`: Push schema directly (dev-only; can desync migration history)
- `pnpm run db:generate`: Generate database client/types
- `pnpm run db:migrate`: Run database migrations
- `pnpm run db:baseline`: Repair migration ledger baseline for pre-existing schema
- `pnpm run db:studio`: Open database studio UI
- `pnpm run seed:diy-guides`: Seed approved DIY guide rows
- `pnpm run seed:partners-sprint6`: Seed launch-metro vetted partner rows
- `pnpm run security:ci`: Run critical dependency audit gate
- `pnpm run test:perf:smoke`: Execute k6 smoke profile (requires perf env vars)
- `pnpm run test:perf:full`: Execute k6 full profile (requires perf env vars)
