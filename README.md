# Northstar Finance

I built Northstar Finance to make it easier to see where money is going. It's a
personal finance app with a React dashboard and a Laravel API. You can track
accounts and transactions, organize spending by category, and set monthly
budgets.

**Live demo:** [Northstar Finance](https://personal-finance-api-ewi1.onrender.com)

## Getting started

To run the project locally, you'll need:

- PHP 8.3 or newer with `pdo_pgsql`, `pdo_sqlite`, `sqlite3`, `mbstring`,
  `openssl`, `curl`, `fileinfo`, `xml` and `zip` enabled
- Composer 2
- Node.js 20.19+ or 22.12+ and npm
- A Supabase PostgreSQL database (or another PostgreSQL server)

I use `pdo_sqlite` and `sqlite3` for the automated tests. Supabase provides the
PostgreSQL database, and the browser talks to Laravel rather than connecting
directly to Supabase.

## Run locally

1. Install the backend dependencies. For a new installation, copy the example
   environment file and generate an app key:

   ```powershell
   cd backend
   composer install
   if (-not (Test-Path .env)) {
       Copy-Item .env.example .env
       php artisan key:generate
   }
   ```

   This leaves an existing `.env` and app key alone. Keep passwords in `.env`,
   never in `.env.example` or Git. Don't regenerate an existing app key without
   understanding the impact on encrypted data.

2. In `backend/.env`, enter the PostgreSQL host, port, database name, username
   and password. Supabase's **Connect** panel provides these; use the session
   pooler if direct IPv6 access isn't available. Keep `DB_SSLMODE=require` for
   Supabase. If the database password contains spaces or special characters,
   quote it in `.env`.

3. Review the database you're connecting to, then run migrations and start the API:

   ```powershell
   php artisan migrate
   php artisan serve --host=127.0.0.1 --port=8000
   ```

   Migrations create and change tables. Don't run `migrate:fresh` against a
   database containing data you want to keep.

4. Open another terminal in the project root and start the dashboard:

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

   Open the Vite URL shown in the terminal, usually `http://localhost:5173`.
   I configured Vite to send `/api` requests to `127.0.0.1:8000` during
   development. The deployed container serves the frontend and API from the
   same origin.

I added a theme switch on the sign-in screen and in the dashboard sidebar.
Your light or dark preference is saved in the browser.

I also made it possible to choose **Continue as guest** and start with an empty
workspace, without an account or API connection. Guest accounts, transactions,
categories and budgets stay in the current tab's session storage. They survive
a refresh and are deleted when you leave guest mode. Closing a tab normally
clears its session, but browser session-restore features may restore it;
duplicated tabs can also start with a copy. Guest data isn't transferred to a
registered account, so avoid entering sensitive data on shared devices.

## Render demo deployment

I deployed the demo on Render using the root `Dockerfile` to build React and
serve it alongside Laravel. To set up your own deployment, create a Render
Docker web service from your chosen GitHub branch. Use the repository root as
the build context and `/api/health` as the health check. Set these environment
variables in Render, not in Git:

- `APP_ENV=production`, `APP_DEBUG=false`, and `APP_URL` to the Render HTTPS URL.
- `APP_KEY` to a new key generated privately with `php artisan key:generate --show`
  from the `backend` directory. Keep the same key across deployments.
- `DB_CONNECTION=pgsql`, `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`,
  `DB_PASSWORD`, and `DB_SSLMODE=require` for the intended Supabase database.
  Use the session pooler if needed for IPv4 connectivity.
- `LOG_CHANNEL=stderr`, `CACHE_STORE=database`, `SESSION_DRIVER=database`,
  and `QUEUE_CONNECTION=database`.

I don't run migrations automatically when the service starts. Review the
target database and apply migrations deliberately before deployment; never use
`migrate:fresh` on data you need to keep. Database access restrictions and
Laravel authorization still matter: disabling debug mode doesn't secure a
database. This is a demo deployment, not a production security or backup
strategy.

## Tests

```powershell
cd backend
php artisan test
```

I run the backend tests against an in-memory SQLite database, so they don't
use your Supabase database.

The frontend tests require Node.js 22.12 or newer.

```powershell
cd frontend
npm run build
npm run lint
npm test
```

## API

The base URL is `http://127.0.0.1:8000/api`. Send JSON and
`Accept: application/json`. After registering or signing in, use the returned
token in `Authorization: Bearer <token>` for protected endpoints.

| Method and path | Purpose |
| --- | --- |
| `POST /register` | Register with `name`, `email`, `password`, `password_confirmation` |
| `POST /login` | Sign in with `email` and `password` |
| `POST /logout` | Revoke the current bearer token |
| `GET /user` | Get the signed-in user |
| `GET /accounts`, `POST /accounts`, `GET /accounts/{id}` | List, create and view accounts |
| `GET /categories`, `POST /categories` | List and create categories |
| `GET /transactions`, `POST /transactions` | List and create transactions |
| `GET /transactions/{id}`, `PUT /transactions/{id}`, `DELETE /transactions/{id}` | View, replace or delete a transaction |
| `GET /summary?month=2026-11` | Get income, expenses, net and spending by category |
| `GET /budgets?month=2026-11`, `POST /budgets`, `DELETE /budgets/{id}` | List, set or delete monthly category budgets |

When you register, the API returns HTTP 201 with a user and token:

```json
{"data":{"user":{"id":1,"name":"Alex","email":"alex@example.com"},"token":"example-token"}}
```

For example, create an account with:

```json
{"name":"Checking","type":"checking","starting_balance_cents":10000}
```

Account types are `checking`, `savings`, `credit_card` and `cash`. Starting
balances can be negative. To record a transaction:

```json
{"account_id":1,"category_id":1,"type":"expense","amount_cents":1234,"date":"2026-11-20","description":"Groceries"}
```

`category_id` and `description` are optional; `type` is `income` or `expense`.
`PUT` uses the same fields as creation. Filter the list with `from`, `to`
(both `YYYY-MM-DD`) and/or `category_id`. A budget is set with:

```json
{"category_id":1,"month":"2026-11","amount_cents":20000}
```

I made saving a budget again for the same category and month update its limit.
I represent amounts as integer cents to avoid floating-point arithmetic; for
example, `1234` means $12.34. An account balance is its starting balance plus
income minus expenses. Monthly summaries and budget progress use transaction
dates, and only expenses count as spending.

Successful responses use `{"data": ...}`. Invalid input returns HTTP 422:

```json
{"message":"The given data was invalid.","errors":{"amount_cents":["The amount cents field must be at least 1."]}}
```

Unauthenticated requests return 401. Records owned by another user are not
exposed and return 404 where applicable. Login is rate limited.

## Notes

For this MVP, I store the dashboard's bearer token in browser local storage.
Use a trusted device; a production app needs a fuller security and deployment
review. I haven't included bank integrations, investments, payments or
financial advice. See [the data model](docs/data-model.md) and
[development setup](docs/setup.md) for more detail.

I added a PostgreSQL security migration that enables row-level security and revokes
Supabase `anon` and `authenticated` access to the existing Laravel tables.
Laravel uses its own database role, which must retain the required privileges
and be able to access those tables under the configured RLS rules. Direct
Supabase Data API access to these tables is not supported. When adding tables,
also explicitly restrict their database grants and enable RLS. Review network
access and default privileges separately in Supabase; the migration does not
change project-wide network settings or default grants.
