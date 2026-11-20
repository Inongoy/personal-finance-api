import assert from 'node:assert/strict'
import { test } from 'node:test'
import { deleteGuest, emptyGuest, guestView, saveGuest } from './guest.ts'

function form(values: Record<string, string>) {
  const result = new FormData()
  for (const [key, value] of Object.entries(values)) result.set(key, value)
  return result
}

test('guest starts empty and calculates balances, monthly summaries and budgets', () => {
  let data = emptyGuest()
  assert.equal(guestView(data, '2026-11').summary.expense_cents, 0)
  data = saveGuest(data, 'account', form({ name: 'Cash', type: 'cash', amount: '100.00' }), '2026-11')
  data = saveGuest(data, 'category', form({ name: 'Food' }), '2026-11')
  data = saveGuest(data, 'budget', form({ category_id: '2', amount: '50.00' }), '2026-11')
  data = saveGuest(data, 'transaction', form({ account_id: '1', category_id: '2', type: 'expense', amount: '12.34', date: '2026-11-02' }), '2026-11')
  data = saveGuest(data, 'transaction', form({ account_id: '1', type: 'income', amount: '10.00', date: '2026-10-31' }), '2026-11')
  const view = guestView(data, '2026-11')
  assert.equal(view.accounts[0].balance_cents, 9766)
  assert.equal(view.summary.expense_cents, 1234)
  assert.equal(view.summary.net_cents, -1234)
  assert.equal(view.budgets[0].spent_cents, 1234)
  assert.deepEqual(view.summary.categories, [{ id: 2, name: 'Food', total_cents: 1234 }])
  assert.equal(guestView(data, '2026-10').summary.income_cents, 1000)
})

test('guest edits and deletes transactions and updates a category budget', () => {
  let data = saveGuest(emptyGuest(), 'account', form({ name: 'Cash', type: 'cash', amount: '0' }), '2026-11')
  data = saveGuest(data, 'category', form({ name: 'Food' }), '2026-11')
  data = saveGuest(data, 'budget', form({ category_id: '2', amount: '10' }), '2026-11')
  data = saveGuest(data, 'budget', form({ category_id: '2', amount: '20' }), '2026-11')
  data = saveGuest(data, 'transaction', form({ account_id: '1', type: 'expense', amount: '5', date: '2026-11-01' }), '2026-11')
  const id = data.transactions[0].id
  data = saveGuest(data, 'transaction', form({ account_id: '1', category_id: '2', type: 'income', amount: '8', date: '2026-11-03' }), '2026-11', id)
  assert.equal(guestView(data, '2026-11').accounts[0].balance_cents, 800)
  assert.equal(data.budgets.length, 1)
  assert.equal(data.budgets[0].amount_cents, 2000)
  data = deleteGuest(data, `/transactions/${id}`)
  data = deleteGuest(data, `/budgets/${data.budgets[0].id}`)
  assert.equal(guestView(data, '2026-11').accounts[0].balance_cents, 0)
  assert.equal(data.budgets.length, 0)
  assert.throws(() => deleteGuest(data, `/transactions/${id}`), /not found/)
})

test('guest rejects invalid values without changing saved data', () => {
  const data = saveGuest(emptyGuest(), 'account', form({ name: 'Cash', type: 'cash', amount: '0' }), '2026-11')
  const transaction = { account_id: '1', type: 'expense', amount: '1', date: '2026-11-01' }
  assert.throws(() => saveGuest(data, 'transaction', form({ ...transaction, amount: '0' }), '2026-11'), /greater than zero/)
  assert.throws(() => saveGuest(data, 'transaction', form({ ...transaction, date: '2026-02-30' }), '2026-11'), /valid date/)
  assert.throws(() => saveGuest(data, 'transaction', form({ ...transaction, category_id: '99' }), '2026-11'), /valid category/)
  assert.throws(() => saveGuest(data, 'transaction', form({ ...transaction, account_id: '99' }), '2026-11'), /valid account/)
  assert.equal(data.transactions.length, 0)
})
