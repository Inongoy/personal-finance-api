# Development Setup

This guide gets the project running on a new machine. The Laravel API and the
React app are not created yet, so the later sections describe the plan. They
will be updated as each part is built.

## Prerequisites

| Tool | Version | Used for |
|------|---------|----------|
| Git | any recent version | Version control |
| PHP | 8.2 or newer | Running Laravel |
| Composer | 2.x | Installing PHP packages |
| Node.js | 20 or newer | Running the React app |
| npm | comes with Node | Installing JavaScript packages |
| Supabase account | free tier | Hosted PostgreSQL database |

The PHP extensions Laravel needs are `pdo_pgsql`, `pgsql`, `mbstring`,
`openssl`, `tokenizer`, `xml`, `ctype` and `fileinfo`. `pdo_pgsql` is the one
that lets PHP talk to PostgreSQL, so make sure it is turned on.

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
2. Open Project Settings, then Database, and copy the connection details
   (host, port, database name, user, password).
3. Keep these private. They go in `backend/.env`, which is ignored by git.

## Backend setup

These commands will work once the Laravel project exists (issue #5).

```
cd backend
composer install
cp .env.example .env
php artisan key:generate
```

Then fill in the `DB_*` values in `.env` with your Supabase details and run:

```
php artisan migrate
php artisan serve
```

The API runs at http://localhost:8000.

## Frontend setup

These commands will work once the React project exists (issue #14).

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
