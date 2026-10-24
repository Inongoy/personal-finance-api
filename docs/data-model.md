# Financial Data Model

## Tables

There are four main tables: users, accounts, categories, and transactions.

### users

| Column | Type | Notes |
|--------|------|-------|
| id | bigint | Primary key |
| name | string | Required |
| email | string | Required, unique |
| password | string | Stored hashed, never plain text |
| created_at, updated_at | timestamp | Laravel fills these in |

### accounts

A place where money is kept, like a checking account or a wallet.

| Column | Type | Notes |
|--------|------|-------|
| id | bigint | Primary key |
| user_id | bigint | Foreign key to users, required |
| name | string | Required |
| type | string | One of: checking, savings, credit_card, cash |
| starting_balance_cents | bigint | Balance when the account was added. Can be negative. Defaults to 0 |
| created_at, updated_at | timestamp | |

### categories

Labels like Groceries, Rent, or Salary.

| Column | Type | Notes |
|--------|------|-------|
| id | bigint | Primary key |
| user_id | bigint | Foreign key to users, required |
| name | string | Required, unique per user |
| created_at, updated_at | timestamp | |

### transactions

| Column | Type | Notes |
|--------|------|-------|
| id | bigint | Primary key |
| user_id | bigint | Foreign key to users, required |
| account_id | bigint | Foreign key to accounts, required |
| category_id | bigint | Foreign key to categories, optional |
| type | string | `income` or `expense` |
| amount_cents | bigint | Always positive. The type says which direction the money moves |
| date | date | The day the transaction happened |
| description | string | Optional |
| created_at, updated_at | timestamp | |

## Relationships

- A user has many accounts, categories, and transactions.
- An account belongs to one user and has many transactions.
- A category belongs to one user and has many transactions.
- A transaction belongs to one user, one account, and optionally one category.

```
users 1 ---- * accounts 1 ---- * transactions * ---- 0..1 categories
  |                                   |                      |
  +-----------------------------------+----------------------+
        (users also own transactions and categories directly)
```

## How money is stored

Money is stored as whole cents in integer columns. $12.34 is saved as `1234`.

We do this because floating point numbers cannot store decimals exactly. For
example, `0.1 + 0.2` gives `0.30000000000000004` in most languages. Integers do
not have this problem. The API and the database always use cents, and the
frontend only converts to dollars when it shows a number on screen.

The amount is always positive, and the `type` column says if it is income or
expense. That is easier to validate than mixing positive and negative numbers.

## How balances are worked out

We do not store the current balance, because a stored number can get out of
sync with the transactions. We calculate it each time:

```
balance = starting_balance_cents + total income - total expenses
```

## Constraints that protect the data

- Foreign keys on every `*_id` column. Deleting a user deletes their data.
- Deleting an account deletes its transactions.
- Deleting a category does not delete transactions. Their `category_id` is set
  to null instead.
- `amount_cents` must be greater than 0 (check constraint).
- `type` must be `income` or `expense` (check constraint).
- `email` is unique on users, and `name` is unique per user on categories.
- A transaction's account and category must belong to the same user as the
  transaction. The database cannot easily check this, so the API validates it
  (issue #11).

## Not included yet

Budgets are in the project stack, but they are not part of the MVP scope, so
there is no budgets table for now.
