# Codebase Intelligence - System Risk Analyzer

The application consists of a React/Vite frontend and a Node.js/Express API backed by MongoDB.

## Authentication and authorization

- Public registration creates regular user accounts only.
- The first administrator is created from `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` when the API starts. These values are never sent to the browser.
- Passwords are stored as bcrypt hashes. Sign-in uses an HTTP-only session cookie, with session data stored in MongoDB.
- The API checks the current user's role on protected requests. For example, `GET /api/admin/users` is restricted to administrators; hiding admin UI in the browser is not the access-control boundary.

## Run locally

Requirements: Node.js 20 or newer and a reachable MongoDB instance (local MongoDB or MongoDB Atlas).

1. In `backend`, copy `.env.example` to `.env` and replace its placeholder values. The server defaults to the local MongoDB URI `mongodb://localhost:27017/` if `MONGODB_URI` is omitted. Set a unique `SESSION_SECRET` of at least 32 characters and the bootstrap admin email and password. The bootstrap password must be at least 12 characters and no more than 72 UTF-8 bytes. Generate a session secret with:

   ```powershell
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

2. Start the API in a terminal:

   ```powershell
   cd backend
   npm install
   npm run dev
   ```

3. Start the frontend in a second terminal:

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

4. Open the Vite URL shown in the frontend terminal. Create a regular user account at `/signup`, or sign in at `/login` using the bootstrap administrator credentials.

The frontend proxies `/api` requests to the API on port 4000. In production, serve both through the same HTTPS origin (or configure a trusted reverse proxy); production session cookies are marked secure.
