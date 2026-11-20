<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FinanceTest extends TestCase
{
    use RefreshDatabase;

    public function test_finance_endpoints_require_authentication(): void
    {
        $this->getJson('/api/accounts')->assertUnauthorized();
        $this->getJson('/api/transactions')->assertUnauthorized();
        $this->getJson('/api/summary?month=2026-11')->assertUnauthorized();
        $this->getJson('/api/budgets?month=2026-11')->assertUnauthorized();
    }

    public function test_user_can_manage_transactions_and_see_monthly_totals(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $account = $this->postJson('/api/accounts', [
            'name' => 'Checking', 'type' => 'checking', 'starting_balance_cents' => 10000,
        ])->assertCreated()->json('data.id');
        $category = $this->postJson('/api/categories', ['name' => 'Groceries'])->assertCreated()->json('data.id');

        $this->postJson('/api/transactions', [
            'account_id' => $account, 'category_id' => $category, 'type' => 'income',
            'amount_cents' => 25000, 'date' => '2026-11-02',
        ])->assertCreated();
        $expense = $this->postJson('/api/transactions', [
            'account_id' => $account, 'category_id' => $category, 'type' => 'expense',
            'amount_cents' => 1234, 'date' => '2026-11-03', 'description' => 'Food',
        ])->assertCreated()->json('data.id');

        $this->getJson('/api/accounts/'.$account)->assertOk()->assertJsonPath('data.balance_cents', 33766);
        $this->getJson('/api/summary?month=2026-11')->assertOk()
            ->assertJsonPath('data.income_cents', 25000)
            ->assertJsonPath('data.expense_cents', 1234)
            ->assertJsonPath('data.net_cents', 23766)
            ->assertJsonPath('data.categories.0.total_cents', 1234);
        $this->getJson('/api/transactions?from=2026-11-03&to=2026-11-03&category_id='.$category)
            ->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/transactions?to=2026-11-02')->assertOk()->assertJsonCount(1, 'data');
        $this->putJson('/api/transactions/'.$expense, [
            'account_id' => $account, 'type' => 'expense', 'amount_cents' => 500,
            'date' => '2026-11-03',
        ])->assertOk()->assertJsonPath('data.amount_cents', 500);
        $this->deleteJson('/api/transactions/'.$expense)->assertOk();
        $this->getJson('/api/accounts/'.$account)->assertJsonPath('data.balance_cents', 35000);
    }

    public function test_users_cannot_access_or_reference_other_users_data(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $account = $owner->accounts()->create(['name' => 'Private', 'type' => 'cash', 'starting_balance_cents' => 0]);
        $category = $owner->categories()->create(['name' => 'Private']);
        $transaction = $owner->transactions()->create([
            'account_id' => $account->id, 'category_id' => $category->id, 'type' => 'expense',
            'amount_cents' => 100, 'date' => '2026-11-01',
        ]);
        $this->actingAs($other);
        $this->getJson('/api/accounts/'.$account->id)->assertNotFound();
        $this->getJson('/api/transactions/'.$transaction->id)->assertNotFound();
        $this->putJson('/api/transactions/'.$transaction->id, [
            'account_id' => $account->id, 'type' => 'expense', 'amount_cents' => 100, 'date' => '2026-11-01',
        ])->assertNotFound();
        $this->deleteJson('/api/transactions/'.$transaction->id)->assertNotFound();
        $this->getJson('/api/accounts')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/transactions')->assertOk()->assertJsonCount(0, 'data');
        $this->postJson('/api/transactions', [
            'account_id' => $account->id, 'category_id' => $category->id, 'type' => 'expense',
            'amount_cents' => 100, 'date' => '2026-11-01',
        ])->assertUnprocessable()->assertJsonValidationErrors(['account_id', 'category_id']);
        $this->postJson('/api/budgets', [
            'category_id' => $category->id, 'month' => '2026-11', 'amount_cents' => 100,
        ])->assertUnprocessable()->assertJsonValidationErrors('category_id');
    }

    public function test_validation_and_budget_progress(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);
        $account = $user->accounts()->create(['name' => 'Cash', 'type' => 'cash', 'starting_balance_cents' => 0]);
        $category = $user->categories()->create(['name' => 'Food']);
        $this->postJson('/api/transactions', [
            'account_id' => $account->id, 'type' => 'expense', 'amount_cents' => 0, 'date' => 'bad',
        ])->assertUnprocessable()->assertJsonValidationErrors(['amount_cents', 'date']);
        $this->postJson('/api/budgets', [
            'category_id' => $category->id, 'month' => '2026-11', 'amount_cents' => 10000,
        ])->assertCreated();
        $this->postJson('/api/budgets', [
            'category_id' => $category->id, 'month' => '2026-11', 'amount_cents' => 12000,
        ])->assertOk();
        $this->postJson('/api/transactions', [
            'account_id' => $account->id, 'category_id' => $category->id, 'type' => 'expense',
            'amount_cents' => 2250, 'date' => '2026-11-15',
        ])->assertCreated();
        $this->getJson('/api/budgets?month=2026-11')->assertOk()
            ->assertJsonPath('data.0.amount_cents', 12000)
            ->assertJsonPath('data.0.spent_cents', 2250);
        $this->getJson('/api/summary?month=not-a-month')->assertUnprocessable()
            ->assertJsonValidationErrors('month');
        $this->postJson('/api/categories', ['name' => 'Food'])->assertUnprocessable()
            ->assertJsonValidationErrors('name');
    }
}
