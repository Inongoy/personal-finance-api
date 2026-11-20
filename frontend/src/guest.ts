export type Account = { id: number; name: string; type: string; balance_cents: number; starting_balance_cents: number }
export type Category = { id: number; name: string }
type GuestTransaction = { id: number; account_id: number; category_id: number | null; type: 'income' | 'expense'; amount_cents: number; date: string; description: string | null }
export type Transaction = GuestTransaction & { account: Account; category: Category | null }
type GuestBudget = { id: number; category_id: number; month: string; amount_cents: number }
export type Budget = GuestBudget & { category: Category; spent_cents: number }
export type Summary = { income_cents: number; expense_cents: number; net_cents: number; categories: { id: number | null; name: string | null; total_cents: number }[] }
export type GuestData = { accounts: Account[]; categories: Category[]; transactions: GuestTransaction[]; budgets: GuestBudget[]; nextId: number }
export type GuestKind = 'account' | 'category' | 'transaction' | 'budget'

export const guestKey = 'northstar-guest-session'
export const emptyGuest = (): GuestData => ({ accounts: [], categories: [], transactions: [], budgets: [], nextId: 1 })

export function toCents(value: string) {
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(value)) throw new Error('Enter a valid amount with up to two decimal places.')
  const [whole, fraction = ''] = value.split('.')
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  if (cents > 2000000000) throw new Error('Amount is too large.')
  return cents
}

export function saveGuest(data: GuestData, kind: GuestKind, form: FormData, month: string, editingId?: number): GuestData {
  const next = structuredClone(data)
  const field = (name: string) => String(form.get(name) || '').trim()
  const positiveAmount = () => {
    const amount = toCents(field('amount'))
    if (amount === 0) throw new Error('Amount must be greater than zero.')
    return amount
  }
  if (kind === 'account' || kind === 'category') {
    const name = field('name')
    if (!name || name.length > 255) throw new Error('Enter a name of up to 255 characters.')
    if (kind === 'account') {
      const type = field('type')
      if (!['checking', 'savings', 'credit_card', 'cash'].includes(type)) throw new Error('Select a valid account type.')
      const starting_balance_cents = toCents(field('amount')) * (form.has('negative') ? -1 : 1)
      next.accounts.push({ id: next.nextId++, name, type, starting_balance_cents, balance_cents: starting_balance_cents })
    } else {
      if (next.categories.some((category) => category.name === name)) throw new Error('This category already exists.')
      next.categories.push({ id: next.nextId++, name })
    }
  } else if (kind === 'budget') {
    const category_id = Number(field('category_id'))
    if (!next.categories.some((category) => category.id === category_id)) throw new Error('Select a valid category.')
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Select a valid month.')
    const amount_cents = positiveAmount()
    const existing = next.budgets.find((budget) => budget.category_id === category_id && budget.month === month)
    if (existing) existing.amount_cents = amount_cents
    else next.budgets.push({ id: next.nextId++, category_id, month, amount_cents })
  } else {
    const account_id = Number(field('account_id'))
    const category_id = field('category_id') ? Number(field('category_id')) : null
    const type = field('type')
    const date = field('date')
    const description = field('description')
    if (!next.accounts.some((account) => account.id === account_id)) throw new Error('Select a valid account.')
    if (category_id !== null && !next.categories.some((category) => category.id === category_id)) throw new Error('Select a valid category.')
    if (type !== 'income' && type !== 'expense') throw new Error('Select a valid transaction type.')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) throw new Error('Enter a valid date.')
    if (description.length > 255) throw new Error('Description must be at most 255 characters.')
    const amount_cents = positiveAmount()
    const transaction: GuestTransaction = { id: editingId ?? next.nextId++, account_id, category_id, type, date, description: description || null, amount_cents }
    if (editingId !== undefined) {
      const index = next.transactions.findIndex((item) => item.id === editingId)
      if (index < 0) throw new Error('Transaction not found.')
      next.transactions[index] = transaction
    } else next.transactions.push(transaction)
  }
  return next
}

export function deleteGuest(data: GuestData, path: string): GuestData {
  const match = /^\/(transactions|budgets)\/(\d+)$/.exec(path)
  if (!match) throw new Error('Cannot delete this item.')
  const next = structuredClone(data)
  const id = Number(match[2])
  const list = match[1] === 'transactions' ? next.transactions : next.budgets
  const index = list.findIndex((item) => item.id === id)
  if (index < 0) throw new Error('Item not found.')
  list.splice(index, 1)
  return next
}

export function guestView(data: GuestData, month: string) {
  const accounts = data.accounts.map((account) => ({
    ...account,
    balance_cents: account.starting_balance_cents + data.transactions.filter((item) => item.account_id === account.id)
      .reduce((total, item) => total + (item.type === 'income' ? item.amount_cents : -item.amount_cents), 0),
  })).sort((a, b) => a.name.localeCompare(b.name))
  const transactions: Transaction[] = data.transactions.map((item) => {
    const account = accounts.find((value) => value.id === item.account_id)
    if (!account) throw new Error('A guest transaction references a missing account.')
    const category = data.categories.find((value) => value.id === item.category_id) ?? null
    if (item.category_id !== null && !category) throw new Error('A guest transaction references a missing category.')
    return { ...item, account, category }
  }).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
  const monthly = transactions.filter((item) => item.date.startsWith(`${month}-`))
  const income_cents = monthly.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount_cents, 0)
  const expenses = monthly.filter((item) => item.type === 'expense')
  const expense_cents = expenses.reduce((sum, item) => sum + item.amount_cents, 0)
  const categories: Summary['categories'] = []
  for (const item of expenses) {
    let group = categories.find((category) => category.id === item.category_id)
    if (!group) {
      group = { id: item.category_id, name: item.category?.name ?? null, total_cents: 0 }
      categories.push(group)
    }
    group.total_cents += item.amount_cents
  }
  const budgets: Budget[] = data.budgets.filter((budget) => budget.month === month).map((budget) => {
    const category = data.categories.find((item) => item.id === budget.category_id)
    if (!category) throw new Error('A guest budget references a missing category.')
    return { ...budget, category, spent_cents: expenses.filter((item) => item.category_id === category.id).reduce((sum, item) => sum + item.amount_cents, 0) }
  })
  return { accounts, categories: [...data.categories].sort((a, b) => a.name.localeCompare(b.name)), transactions, budgets, summary: { income_cents, expense_cents, net_cents: income_cents - expense_cents, categories } }
}
