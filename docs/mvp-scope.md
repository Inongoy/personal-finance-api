# MVP Scope and Requirements

## Goal

A personal finance application where a user can securely manage their accounts
and transactions and understand their spending.

## User stories and acceptance criteria

| # | As a user, I can... | Acceptance criteria |
|---|---------------------|---------------------|
| 1 | Register, log in, and log out | Registration creates a user; valid credentials return a token; logging out invalidates that token |
| 2 | Create and view my financial accounts | An account has a name, type, and starting balance; I can list and view only my accounts |
| 3 | Record, view, update, and delete transactions | Each transaction has an account, amount, date, and description; all four operations work |
| 4 | Categorize transactions and filter them | A transaction can have a category; the list can be filtered by date range and by category |
| 5 | See account balances and a monthly spending summary | Balance is calculated from transactions; the summary totals spending per month and per category |
| 6 | Access only my own financial data | Requests for another user's records are rejected |
| 7 | Get consistent validation errors | Every invalid request returns the same error JSON shape with HTTP 422 |
| 8 | Set monthly category budgets | I can set a limit and see expenses against it for a selected month |

## Non-functional requirements

- Money is stored as integer minor units (cents), never as floats.
- The REST API is documented with request and response examples.
- Database constraints (foreign keys, NOT NULL, checks) protect data integrity.
- Automated tests cover core behavior, authorization, and calculations.
- The README contains setup instructions.

## Out of scope for the MVP

- Real bank integrations
- Investment trading
- Payment processing
- AI financial advice
- Production-grade deployment
