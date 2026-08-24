# One-Day Notes App

A clean, fast personal notes application built with:
* **React** + **Vite** + **TypeScript**
* **Hono** on **Cloudflare Workers**
* **Turso (libSQL)** + **Drizzle ORM**
* Direct **GitHub OAuth** (HttpOnly sessions, no JWTs)

---

## Setup & Running

### 1. Configure Environment Variables
Copy `.env.example` to `.env` and `.dev.vars`:

```bash
# In .env and .dev.vars:
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
TURSO_DATABASE_URL=libsql://your-database-name-user.turso.io
TURSO_AUTH_TOKEN=your_turso_auth_token
SESSION_SECRET=a_random_32_character_secret_key
```

> **Note for GitHub OAuth**: Set Authorization callback URL to:
> `http://localhost:5173/auth/github/callback` (or your production worker URL).

### 2. Push Database Schema to Turso
```bash
npm run db:push
```

### 3. Start Local Development
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 4. Build / Deploy
```bash
npm run build
npm run deploy
```
