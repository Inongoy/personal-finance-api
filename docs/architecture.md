# Architecture and Technology Decisions

## The big picture

The app has three layers. Each one only talks to the layer next to it.

```
React + TypeScript   (what the user sees and clicks)
        |
        |  HTTP requests with JSON
        v
Laravel REST API     (checks the request and does the work)
        |
        |  SQL queries
        v
Supabase PostgreSQL  (stores the data)
```

The browser never talks to the database directly. Every request goes through
the API, so the API is the one place where we check who the user is and what
they are allowed to see.

## How a request flows

Example: a user adds a transaction.

1. The user fills in a form in React and clicks save.
2. React sends a `POST /api/transactions` request with the login token.
3. Laravel checks the token, validates the data, and makes sure the account
   belongs to that user.
4. Laravel saves the transaction in PostgreSQL.
5. Laravel sends back JSON, and React updates the screen.

## Why each technology

| Technology | What it does here | Why we picked it |
|------------|-------------------|------------------|
| React + TypeScript | Dashboard, forms, transaction history, budget views | React makes it easy to build pages from small components. TypeScript catches mistakes like a wrong field name before the app runs. |
| Tailwind CSS | Styling | Styles go right in the markup, so we can build a responsive layout fast without writing lots of CSS files. |
| Laravel + PHP | REST API, validation, authentication, money logic | Laravel already includes routing, validation, migrations, testing, and authentication, so we write less code ourselves. |
| Supabase PostgreSQL | Database | PostgreSQL is reliable and supports foreign keys and constraints, which protect our data. Supabase hosts it for us so we do not have to install a server. |

## Key decisions

- **Laravel owns the database.** Supabase is only used as a hosted PostgreSQL
  database. Laravel migrations create the tables, not the Supabase dashboard.
  That way the schema is saved in git.
- **Token authentication.** The API is separate from the frontend, so we use
  tokens instead of server sessions. We will use Laravel Sanctum (decided in
  issue #7).
- **Money is stored as whole cents** in integer columns. No floats.
- **One error format.** Every failed request returns the same JSON shape so the
  React app only needs one way to show errors.
- **Users only see their own data.** Every query is filtered by the logged in
  user.
