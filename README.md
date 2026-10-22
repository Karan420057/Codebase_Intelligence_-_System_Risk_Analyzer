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

   GitHub repository lookup works with public repositories without additional configuration. To access private repositories or increase the GitHub API rate limit, set `GITHUB_TOKEN` in `backend/.env` to a GitHub token with read-only repository contents access. The token stays on the backend and is never sent to the browser.

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

## GitHub repository workspace

Signed-in users can connect a GitHub repository URL to open a dedicated page at `/repositories/{owner}/{repo}`. Repository metadata is saved in MongoDB per user and listed in the **Repositories** section across browser sessions. Each repository page shows its metadata, source LOC (physical lines in source files, including blank lines and comments, excluding documentation, generated/build/vendor directories, and binary files), file listing, and latest commit history. LOC is unavailable when GitHub truncates the file tree or source files cannot be fetched. Select a file to load its text preview; commit history can be paginated with **Load more commits**. Very large file trees may be shortened by GitHub, and binary files are not previewed.
