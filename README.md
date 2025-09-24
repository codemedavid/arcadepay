# ArcadeManager

A web-based arcade management platform built with React, Express, and SQLite.

## Features

- 🎮 User authentication and management
- 🪙 Coin and point system
- 🎁 Promotional campaigns
- 📊 Admin dashboard with analytics
- 💳 Payment system (currently disabled - contact admin for purchases)

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Radix UI
- **Backend**: Express.js, TypeScript
- **Database**: SQLite (local development)
- **ORM**: Drizzle ORM
- **Authentication**: Passport.js with local strategy

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create database tables:
```bash
npm run db:push
```

3. Start the development server:
```bash
npm run dev
```

Or use the convenience script:
```bash
./start-dev.sh
```

4. Open your browser and visit: http://localhost:5000

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run check` - Type check with TypeScript
- `npm run db:push` - Push database schema changes

## Environment Variables

The application uses these environment variables:

- `DATABASE_URL` - SQLite database path (default: `./dev.db`)
- `SESSION_SECRET` - Secret for session encryption
- `PORT` - Server port (default: 5000)

## Database

The application uses SQLite for local development. The database file (`dev.db`) will be created automatically when you run the migrations.

## Payment System

The Stripe payment integration has been removed. Users are directed to contact administrators for coin purchases.

## Project Structure

```
├── client/          # React frontend
├── server/          # Express backend
├── shared/          # Shared types and schemas
├── dev.db          # SQLite database (created on first run)
└── start-dev.sh    # Development startup script
```

## Development

The application runs in development mode with hot reloading for both frontend and backend changes.

## Production

For production deployment, you'll want to:

1. Set up a proper PostgreSQL database
2. Update the database configuration in `server/storage.ts`
3. Set secure environment variables
4. Build the application with `npm run build`
5. Start with `npm start`
# arcadepay
