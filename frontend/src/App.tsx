import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowDownLeft, ArrowUpRight, BarChart3, CalendarDays, CircleDollarSign, CreditCard, LayoutDashboard, LogOut, Moon, Plus, ReceiptText, Sun, Target, Wallet, X } from 'lucide-react'
import { ApiError, readApiResponse } from './api'

type User = { id: number; name: string; email: string }
type Account = { id: number; name: string; type: string; balance_cents: number; starting_balance_cents: number }
type Category = { id: number; name: string }
type Transaction = { id: number; account_id: number; category_id: number | null; type: 'income' | 'expense'; amount_cents: number; date: string; description: string | null; account: Account; category: Category | null }
type Budget = { id: number; category_id: number; category: Category; amount_cents: number; spent_cents: number }
type Summary = { income_cents: number; expense_cents: number; net_cents: number; categories: { id: number | null; name: string | null; total_cents: number }[] }
type AuthResponse = { user: User; token: string }
type Page = 'overview' | 'transactions' | 'accounts' | 'budgets'

const currentMonth = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function money(cents: number) {
  const value = Math.abs(cents)
  return `${cents < 0 ? '-' : ''}$${Math.floor(value / 100).toLocaleString('en-US')}.${String(value % 100).padStart(2, '0')}`
}

function toCents(value: string) {
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(value)) throw new Error('Enter a valid amount with up to two decimal places.')
  const [whole, fraction = ''] = value.split('.')
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  if (cents > 2000000000) throw new Error('Amount is too large.')
  return cents
}

function chartBackground(summary: Summary | null) {
  if (!summary?.expense_cents) return '#344457'
  const colors = ['#93dbc5', '#e6b987', '#8a88c8', '#cc8d8a']
  let total = 0
  const segments = summary.categories.map((category, index) => {
    const start = total
    total += category.total_cents / summary.expense_cents * 100
    return `${colors[index % colors.length]} ${start}% ${total}%`
  })
  return `conic-gradient(${segments.join(', ')})`
}

async function api<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
    })
  } catch (error) {
    if (!(error instanceof TypeError)) throw error
    throw new Error('Could not connect to the API. Check your connection and make sure the Laravel server is running.')
  }
  return readApiResponse<T>(response)
}

const request = (method: string, data?: object): RequestInit => ({ method, ...(data ? { body: JSON.stringify(data) } : {}) })

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('finance-token') || '')
  const [theme, setTheme] = useState<'light' | 'dark'>(() => localStorage.getItem('finance-theme') === 'light' ? 'light' : 'dark')
  const [user, setUser] = useState<User | null>(null)
  const [page, setPage] = useState<Page>('overview')
  const [month, setMonth] = useState(currentMonth)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(Boolean(token))
  const [modal, setModal] = useState<'transaction' | 'account' | 'category' | 'budget' | null>(null)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [register, setRegister] = useState(false)
  const [today] = useState(() => new Date().toLocaleDateString('en-CA'))
  const requestId = useRef(0)

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('finance-theme', next)
  }

  const clearData = useCallback(() => {
    setAccounts([])
    setCategories([])
    setTransactions([])
    setBudgets([])
    setSummary(null)
  }, [])

  const refresh = useCallback(async () => {
    if (!token) return
    const currentRequest = ++requestId.current
    try {
      const [me, accountData, categoryData, transactionData, summaryData, budgetData] = await Promise.all([
        api<User>('/user', token), api<Account[]>('/accounts', token), api<Category[]>('/categories', token),
        api<Transaction[]>('/transactions', token), api<Summary>(`/summary?month=${month}`, token),
        api<Budget[]>(`/budgets?month=${month}`, token),
      ])
      if (currentRequest !== requestId.current) return
      setUser(me); setAccounts(accountData); setCategories(categoryData)
      setTransactions(transactionData); setSummary(summaryData); setBudgets(budgetData)
    } catch (problem) {
      if (currentRequest !== requestId.current) return
      if (problem instanceof ApiError && problem.status === 401) {
        localStorage.removeItem('finance-token')
        setToken('')
        setUser(null)
        clearData()
        setRegister(false)
        setError('Your session has expired. Please sign in again.')
      } else {
        setError(problem instanceof Error ? problem.message : 'Could not load your finances.')
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false)
    }
  }, [token, month, clearData])

  useEffect(() => { void refresh() }, [refresh])

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setError('')
    try {
      const data = await api<AuthResponse>(register ? '/register' : '/login', '', request('POST', Object.fromEntries(form)))
      requestId.current++
      clearData()
      setLoading(true)
      localStorage.setItem('finance-token', data.token)
      setUser(data.user); setToken(data.token)
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Authentication failed.') }
  }

  async function logout() {
    try {
      await api('/logout', token, request('POST'))
      requestId.current++
      clearData()
      setLoading(false)
      localStorage.removeItem('finance-token'); setToken(''); setUser(null); setRegister(false); setError('')
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Could not log out.') }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setError('')
    try {
      if (modal === 'account') {
        const sign = form.get('negative') ? -1 : 1
        await api('/accounts', token, request('POST', { name: form.get('name'), type: form.get('type'), starting_balance_cents: sign * toCents(String(form.get('amount'))) }))
      } else if (modal === 'category') {
        await api('/categories', token, request('POST', { name: form.get('name') }))
      } else if (modal === 'budget') {
        await api('/budgets', token, request('POST', { category_id: Number(form.get('category_id')), month, amount_cents: toCents(String(form.get('amount'))) }))
      } else if (modal === 'transaction') {
        await api(editing ? `/transactions/${editing.id}` : '/transactions', token, request(editing ? 'PUT' : 'POST', {
          account_id: Number(form.get('account_id')), category_id: form.get('category_id') ? Number(form.get('category_id')) : null,
          type: form.get('type'), amount_cents: toCents(String(form.get('amount'))), date: form.get('date'), description: form.get('description'),
        }))
      }
      setModal(null); setEditing(null); setNotice('Saved successfully.'); setLoading(true)
      await refresh()
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Could not save your changes.') }
  }

  async function remove(path: string) {
    if (!window.confirm('Are you sure you want to delete this?')) return
    try { await api(path, token, request('DELETE')); setNotice('Deleted successfully.'); setLoading(true); await refresh() }
    catch (problem) { setError(problem instanceof Error ? problem.message : 'Could not delete this item.') }
  }

  const filtered = transactions.filter((item) =>
    (!categoryFilter || item.category_id === Number(categoryFilter)) && (!from || item.date >= from) && (!to || item.date <= to))
  const totalBalance = accounts.reduce((total, account) => total + Number(account.balance_cents), 0)
  const nav = [
    { id: 'overview' as const, label: 'Overview', icon: LayoutDashboard },
    { id: 'transactions' as const, label: 'Transactions', icon: ReceiptText },
    { id: 'accounts' as const, label: 'Accounts', icon: Wallet },
    { id: 'budgets' as const, label: 'Budgets', icon: Target },
  ]

  if (!token) return (
    <main className="auth-page" data-theme={theme}>
      <div className="auth-intro"><div className="brand-mark"><CircleDollarSign size={25} /></div><p className="eyebrow">YOUR MONEY, MADE CLEAR</p><h1>A little clarity goes a long way.</h1><p>Keep track of your accounts, understand your spending, and make room for what matters.</p></div>
      <div className="auth-card">
        <div className="auth-header"><div className="brand"><span className="brand-mark"><CircleDollarSign size={19} /></span> northstar <span>finance</span></div><ThemeToggle theme={theme} onToggle={toggleTheme} /></div>
        <p className="eyebrow">WELCOME {register ? 'ABOARD' : 'BACK'}</p><h2>{register ? 'Create your account' : 'Sign in to your space'}</h2><p className="muted">A simpler way to see the whole picture.</p>
        {error && <div role="alert" className="alert">{error}</div>}
        <form onSubmit={submitAuth} className="form-stack">
          {register && <label>Name<input name="name" required maxLength={255} autoComplete="name" /></label>}
          <label>Email<input name="email" type="email" required autoComplete="email" /></label>
          <label>Password<input name="password" type="password" minLength={8} required autoComplete={register ? 'new-password' : 'current-password'} /></label>
          {register && <label>Confirm password<input name="password_confirmation" type="password" minLength={8} required autoComplete="new-password" /></label>}
          <button className="primary" type="submit">{register ? 'Create account' : 'Sign in'} <ArrowUpRight size={17} /></button>
        </form>
        <p className="auth-switch">{register ? 'Already have an account?' : 'New here?'} <button onClick={() => { setRegister(!register); setError('') }}>{register ? 'Sign in' : 'Create an account'}</button></p>
      </div>
    </main>
  )

  return (
    <div className="app-shell" data-theme={theme}>
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark"><CircleDollarSign size={19} /></span> northstar <span>finance</span></div>
        <p className="side-label">YOUR WORKSPACE</p>
        <nav aria-label="Main navigation">{nav.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setPage(id)} className={page === id ? 'nav-item active' : 'nav-item'}><Icon size={18} />{label}</button>)}</nav>
        <div className="sidebar-theme"><ThemeToggle theme={theme} onToggle={toggleTheme} /></div>
        <div className="side-footer"><div className="avatar">{user?.name?.slice(0, 1).toUpperCase() || 'U'}</div><div className="side-user"><strong>{user?.name || 'Your account'}</strong><span>Personal workspace</span></div><button className="icon-button" aria-label="Log out" onClick={() => void logout()}><LogOut size={18} /></button></div>
      </aside>
      <main className="main">
        <header className="topbar"><div><p className="eyebrow">PERSONAL FINANCE / {page.toUpperCase()}</p><h1>{page === 'overview' ? `Good to see you${user ? `, ${user.name.split(' ')[0]}` : ''}.` : nav.find((item) => item.id === page)?.label}</h1><p className="muted">{page === 'overview' ? 'Here’s what your money is up to.' : 'Keep everything in one clear place.'}</p></div><div className="top-actions"><label className="month-picker"><CalendarDays size={16} /><span className="sr-only">Select month</span><input type="month" value={month} onChange={(event) => { setMonth(event.target.value); setSummary(null); setBudgets([]); setLoading(true); setError('') }} /></label><button className="primary" onClick={() => { setEditing(null); setModal('transaction') }}><Plus size={17} /> Add transaction</button></div></header>
        {error && <div role="alert" className="alert">{error}</div>}
        {notice && <div role="status" className="notice">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss"><X size={15} /></button></div>}
        {loading && <p className="muted">Refreshing your data...</p>}
        {page === 'overview' && <>
          <section className="metrics"><Metric label="TOTAL BALANCE" value={user ? money(totalBalance) : '—'} icon={<Wallet size={18} />} note={`${accounts.length} accounts`} /><Metric label="INCOME THIS MONTH" value={summary ? money(summary.income_cents) : '—'} icon={<ArrowDownLeft size={18} />} note="Money coming in" /><Metric label="SPENT THIS MONTH" value={summary ? money(summary.expense_cents) : '—'} icon={<ArrowUpRight size={18} />} note="Across all categories" /><Metric label="NET THIS MONTH" value={summary ? money(summary.net_cents) : '—'} icon={<BarChart3 size={18} />} note="Income minus spending" /></section>
          <div className="dashboard-grid">
            <section className="panel spending"><div className="panel-head"><div><p className="eyebrow">THE BIG PICTURE</p><h2>Spending breakdown</h2></div><span className="pill">This month</span></div><div className="breakdown"><div className="donut" style={{ background: chartBackground(summary) }}><div><span>SPENT</span><strong>{summary ? money(summary.expense_cents) : '—'}</strong></div></div><div className="legend">{summary?.categories.length ? summary.categories.map((category, i) => <div key={category.id ?? 'none'}><span><i className={`dot dot-${i % 4}`} />{category.name || 'Uncategorized'}</span><strong>{money(category.total_cents)}</strong></div>) : <p className="muted">Your spending categories will show up here.</p>}</div></div></section>
            <section className="panel overview-card"><div className="panel-head"><div><p className="eyebrow">A LITTLE PROGRESS</p><h2>Monthly flow</h2></div><BarChart3 size={19} className="muted" /></div><div className="flow-total">{summary ? money(summary.net_cents) : '—'}</div><p className="muted">Left after expenses this month</p><div className="flow-bars"><div><span>Income</span><div className="bar-track"><i style={{ width: summary && summary.income_cents ? '100%' : '0%' }} /></div><strong>{money(summary?.income_cents ?? 0)}</strong></div><div><span>Expenses</span><div className="bar-track expense"><i style={{ width: summary && summary.income_cents ? `${Math.min(100, Math.round(summary.expense_cents / summary.income_cents * 100))}%` : summary?.expense_cents ? '100%' : '0%' }} /></div><strong>{money(summary?.expense_cents ?? 0)}</strong></div></div></section>
          </div>
          <section className="panel"><div className="panel-head"><div><p className="eyebrow">YOUR ACTIVITY</p><h2>Recent transactions</h2></div><button className="text-button" onClick={() => setPage('transactions')}>View all <ArrowUpRight size={15} /></button></div><TransactionList items={transactions.slice(0, 5)} onEdit={(item) => { setEditing(item); setModal('transaction') }} onDelete={(id) => void remove(`/transactions/${id}`)} /></section>
        </>}
        {page === 'transactions' && <section className="panel"><div className="panel-head"><div><p className="eyebrow">YOUR ACTIVITY</p><h2>Transaction history</h2></div><button className="secondary" onClick={() => setModal('category')}><Plus size={16} /> Category</button></div><div className="filters"><label>From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label><label>To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label><label>Category<select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}><option value="">All categories</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label></div><TransactionList items={filtered} onEdit={(item) => { setEditing(item); setModal('transaction') }} onDelete={(id) => void remove(`/transactions/${id}`)} /></section>}
        {page === 'accounts' && <section className="panel"><div className="panel-head"><div><p className="eyebrow">ALL IN ONE PLACE</p><h2>Your accounts</h2></div><button className="secondary" onClick={() => setModal('account')}><Plus size={16} /> Add account</button></div><div className="account-grid">{accounts.length ? accounts.map((account) => <article className="account-card" key={account.id}><CreditCard size={22} /><p>{account.name}</p><strong>{money(account.balance_cents)}</strong><span>{account.type.replace('_', ' ')}</span></article>) : <p className="empty">Add your first account to start tracking transactions.</p>}</div></section>}
        {page === 'budgets' && <section className="panel"><div className="panel-head"><div><p className="eyebrow">PLAN WITH PURPOSE</p><h2>Monthly budgets</h2><p className="muted">Set a limit for each category and see your progress.</p></div><div className="button-row"><button className="secondary" onClick={() => setModal('category')}><Plus size={16} /> Category</button><button className="primary" onClick={() => setModal('budget')}><Plus size={16} /> Set budget</button></div></div><div className="budget-list">{budgets.length ? budgets.map((budget) => <article className="budget-item" key={budget.id}><div><strong>{budget.category.name}</strong><span>{money(budget.spent_cents)} of {money(budget.amount_cents)}</span></div><div className="bar-track"><i style={{ width: `${Math.min(100, Math.round(budget.spent_cents / budget.amount_cents * 100))}%` }} /></div><button className="text-button danger" onClick={() => void remove(`/budgets/${budget.id}`)}>Delete</button></article>) : <p className="empty">No budgets for this month yet. Create a category, then set a budget.</p>}</div></section>}
      </main>
      {modal && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) { setModal(null); setEditing(null) } }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="panel-head"><div><p className="eyebrow">LET’S MAKE A PLAN</p><h2 id="modal-title">{modal === 'transaction' ? (editing ? 'Edit transaction' : 'Add transaction') : modal === 'account' ? 'Add an account' : modal === 'budget' ? 'Set a budget' : 'Add a category'}</h2></div><button className="icon-button" onClick={() => { setModal(null); setEditing(null) }} aria-label="Close"><X size={20} /></button></div>{error && <div role="alert" className="alert">{error}</div>}<form onSubmit={save} className="form-stack">
        {(modal === 'account' || modal === 'category') && <label>Name<input name="name" required maxLength={255} placeholder={modal === 'account' ? 'Everyday checking' : 'Groceries'} /></label>}
        {modal === 'account' && <><label>Account type<select name="type"><option value="checking">Checking</option><option value="savings">Savings</option><option value="credit_card">Credit card</option><option value="cash">Cash</option></select></label><label>Starting balance<input name="amount" inputMode="decimal" defaultValue="0.00" required /></label><label className="checkbox"><input type="checkbox" name="negative" /> Starting balance is negative</label></>}
        {modal === 'transaction' && <><label>Account<select name="account_id" defaultValue={editing?.account_id || ''} required><option value="">Select an account</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label><label>Type<select name="type" defaultValue={editing?.type || 'expense'}><option value="expense">Expense</option><option value="income">Income</option></select></label></>}
        {(modal === 'transaction' || modal === 'budget') && <><label>Category<select name="category_id" defaultValue={editing?.category_id || ''} required={modal === 'budget'}><option value="">{modal === 'budget' ? 'Select a category' : 'No category'}</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>Amount in dollars<input name="amount" inputMode="decimal" placeholder="0.00" defaultValue={editing ? `${Math.floor(editing.amount_cents / 100)}.${String(editing.amount_cents % 100).padStart(2, '0')}` : ''} required /></label></>}
        {modal === 'transaction' && <><label>Date<input name="date" type="date" defaultValue={editing?.date || today} required /></label><label>Description<input name="description" defaultValue={editing?.description || ''} maxLength={255} placeholder="What was this for?" /></label></>}
        {modal === 'budget' && <p className="muted">This limit is for {month}. Saving again updates the category’s limit.</p>}
        <button className="primary" type="submit">Save {modal}</button>
      </form></section></div>}
    </div>
  )
}

function ThemeToggle({ theme, onToggle }: { theme: 'light' | 'dark'; onToggle: () => void }) {
  return (
    <button type="button" className="theme-toggle" role="switch" aria-label="Dark mode" aria-checked={theme === 'dark'} onClick={onToggle}>
      <span className="theme-label">{theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}<span>{theme === 'dark' ? 'Dark' : 'Light'}</span></span>
      <span className="theme-track" aria-hidden="true"><span className="theme-knob" /></span>
    </button>
  )
}

function Metric({ label, value, icon, note }: { label: string; value: string; icon: React.ReactNode; note: string }) {
  return <article className="metric"><div className="metric-top"><span>{label}</span><span className="metric-icon">{icon}</span></div><strong>{value}</strong><p>{note}</p></article>
}

function TransactionList({ items, onEdit, onDelete }: { items: Transaction[]; onEdit: (item: Transaction) => void; onDelete: (id: number) => void }) {
  if (!items.length) return <p className="empty">No transactions here yet. Add one to get started.</p>
  return <div className="transaction-list">{items.map((item) => <div className="transaction-row" key={item.id}><div className={`transaction-icon ${item.type}`}>{item.type === 'income' ? <ArrowDownLeft size={19} /> : <ArrowUpRight size={19} />}</div><div className="transaction-info"><strong>{item.description || item.category?.name || (item.type === 'income' ? 'Income' : 'Expense')}</strong><span>{item.account?.name} · {item.category?.name || 'Uncategorized'} · {item.date}</span></div><strong className={item.type === 'income' ? 'positive amount' : 'amount'}>{item.type === 'income' ? '+' : '-'}{money(item.amount_cents)}</strong><div className="row-actions"><button onClick={() => onEdit(item)}>Edit</button><button onClick={() => onDelete(item.id)}>Delete</button></div></div>)}</div>
}

export default App
