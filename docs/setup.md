# Development Setup

This guide gets the project running on a new machine. The README has the
complete setup and API examples.

## Prerequisites

| Tool | Version | Used for |
|------|---------|----------|
| Git | any recent version | Version control |
| PHP | 8.3 or newer | Running Laravel |
| Composer | 2.x | Installing PHP packages |
| Node.js | 20.19+ or 22.12+ | Running the React app |
| npm | comes with Node | Installing JavaScript packages |
| Supabase account | free tier | Hosted PostgreSQL database |

The PHP extensions include `pdo_pgsql`, `pdo_sqlite`, `sqlite3`, `mbstring`,
`openssl`, `curl`, `zip`, `tokenizer`, `xml`, `ctype` and `fileinfo`.
`pdo_pgsql` connects to PostgreSQL; SQLite is used by tests.

### Check what you have installed

```
git --version
php -v
composer --version
node -v
npm -v
```

## Project layout

```
personal-finance-api/
  backend/    Laravel REST API
  frontend/   React + TypeScript app
  docs/       Project documentation
```

## Get the code

```
git clone https://github.com/Inongoy/personal-finance-api.git
cd personal-finance-api
```

## Database (Supabase)

1. Create a project at https://supabase.com.
2. Open the Connect panel and copy the session pooler or direct connection
   details (host, port, database name and user).
3. Keep these private. They go in `backend/.env`, which is ignored by git.

## Backend setup

```powershell
cd backend
composer install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
php artisan key:generate
```

If `.env` already exists, don't overwrite it. Fill in the `DB_*` values in
`.env` with your Supabase details, review the target database, and run:

```
php artisan migrate
php artisan serve
```

The API runs at http://localhost:8000.

## Frontend setup

```
cd frontend
npm install
npm run dev
```

The app runs at http://localhost:5173.

## Environment files

- `.env` files hold secrets like database passwords. Never commit them.
- Each project has a `.env.example` with fake values that is committed, so
  other people know which settings they need.
