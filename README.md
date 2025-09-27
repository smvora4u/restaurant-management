# Restaurant Management Monorepo

This monorepo contains three applications:

- Backend: Node.js GraphQL API with MongoDB
- Web: React (Vite) app using Apollo Client
- Mobile: React Native (Expo) app using Apollo Client

## Prerequisites

- Node.js 18+ and npm 8+
- MongoDB instance (local or cloud, e.g., MongoDB Atlas)
- For mobile: Expo CLI (`npm i -g expo`)

## Getting Started

Install all dependencies:

```bash
npm install
```

## Run with Docker (recommended)

```bash
docker compose up --build
```

Services:
- MongoDB: `mongodb://localhost:27017/restaurant`
- Backend: `http://localhost:4000/graphql`
- Web: `http://localhost:5173`

Env overrides:
- Backend uses `MONGO_URL` (defaults to `mongodb://mongo:27017/restaurant` in compose)
- Web uses `VITE_GRAPHQL_URI` (defaults to `http://backend:4000/graphql` in compose)

### Backend (GraphQL + MongoDB)

1. Copy env example and set `MONGO_URL`:
   ```bash
   cp apps/backend/.env.example apps/backend/.env
   ```
2. Start the server:
   ```bash
   npm run dev -w @restaurant/backend
   ```
3. GraphQL endpoint: `http://localhost:4000/graphql`

### Web (React + Vite)

1. Start the dev server:
   ```bash
   npm run dev -w @restaurant/web
   ```
2. Open the URL from the terminal (usually `http://localhost:5173`).

### Mobile (Expo + React Native)

1. Start Expo:
   ```bash
   npm run start -w @restaurant/mobile
   ```
2. Use the Expo Go app or an emulator to run the app.

## Workspace Scripts

- Root install: `npm install`
- Run a workspace: `npm run <script> -w <workspaceName>`

Workspace names:

- `@restaurant/backend`
- `@restaurant/web`
- `@restaurant/mobile`

## Project Structure

```
apps/
  backend/   # Node.js GraphQL API (MongoDB)
  web/       # React (Vite) web app
  mobile/    # Expo React Native app
```

## Notes

- Web and Mobile are configured to call the backend at `http://localhost:4000/graphql`. Update the URIs if you deploy or use a different port.
- For mobile on a device, replace `localhost` with your machine IP (e.g., `http://192.168.1.10:4000/graphql`).