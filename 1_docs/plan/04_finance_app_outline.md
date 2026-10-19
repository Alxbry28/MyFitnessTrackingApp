# 04 — Finance App Outline

Covers **spending**, **savings**, and **debt tracking**, with AI for quick entry and insights.

Parent context: [01_project_plan.md](./01_project_plan.md) · Tech: [02_technology_recommendations.md](./02_technology_recommendations.md)

---

## 1. Module overview

```
Finance
├── Dashboard (net worth snapshot, monthly spend)
├── Transactions
│   ├── Expenses
│   ├── Income
│   └── Transfers (optional)
├── Savings goals
├── Debt
│   ├── Debt accounts
│   └── Payment log
├── Categories & budgets (v1.1)
└── AI Assistant
```

---

## 2. User stories

### Spending & income

| ID | Story | Priority |
|----|-------|----------|
| F1 | As a user, I record an expense with amount, category, and date | Must-have |
| F2 | As a user, I record income | Must-have |
| F3 | As a user, I see total spending for this week/month | Must-have |
| F4 | As a user, I filter transactions by category and date | Should-have |
| F5 | As a user, I set monthly budgets per category | Nice-to-have |
| F6 | As a user, I attach a note or merchant name | Should-have |

### Savings

| ID | Story | Priority |
|----|-------|----------|
| S1 | As a user, I create a savings goal with target amount | Must-have |
| S2 | As a user, I log contributions toward a goal | Must-have |
| S3 | As a user, I see progress % toward each goal | Must-have |
| S4 | As a user, I link a contribution to an income entry | Nice-to-have |

### Debt

| ID | Story | Priority |
|----|-------|----------|
| D1 | As a user, I add a debt account (name, balance, interest rate) | Must-have |
| D2 | As a user, I log a payment and see updated balance | Must-have |
| D3 | As a user, I see total debt across accounts | Must-have |
| D4 | As a user, I see minimum payment due dates | Should-have |
| D5 | As a user, I simulate payoff order (snowball/avalanche) | Nice-to-have |

### AI (Finance)

| ID | Story | Priority |
|----|-------|----------|
| FA1 | As a user, I paste “lunch 180, jeepney 15” and AI creates transactions | Should-have |
| FA2 | As a user, I ask “how much did I spend on food this month?” | Should-have |
| FA3 | As a user, AI summarizes spending trends | Nice-to-have |
| FA4 | As a user, AI suggests debt payoff plan | Nice-to-have |

---

## 3. Screens (wireframe-level)

| Screen | Purpose | v1? |
|--------|---------|-----|
| Finance Home | Monthly spend, savings progress, total debt | Yes |
| Transaction list | Chronological expenses/income | Yes |
| Add transaction | Amount, type, category, date, note | Yes |
| Categories manage | Add/edit categories | Yes |
| Savings goals list | All goals with progress bars | Yes |
| Goal detail | Contributions history | Yes |
| Add contribution | Amount, date, goal | Yes |
| Debt list | All debts with balances | Yes |
| Debt detail | Payment history, interest info | Yes |
| Add / edit debt | Name, balance, APR, min payment | Yes |
| Log debt payment | Amount, date | Yes |
| Monthly report | Category breakdown | v1.1 |
| Budgets | Per-category limits | Later |
| AI chat | Parse and Q&A | v1.1 |

---

## 4. Data entities (conceptual)

### `accounts` (optional v1 — or implicit “Cash”)

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | |
| name | string | e.g. "Cash", "GCash", "Bank" |
| type | enum | cash, bank, ewallet |
| balance | number? | computed or manual |

*For v1 simplicity: single implicit cash wallet; add multi-account in v1.1.*

### `categories`

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | |
| name | string | Food, Transport, Bills, etc. |
| type | enum | expense, income |
| icon | string? | |
| color | string? | |

**Default categories (seed on first launch):** Food, Transport, Bills, Shopping, Health, Entertainment, Salary, Other

### `transactions`

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | |
| type | enum | expense, income |
| amount | number | positive number |
| currency | string | default PHP or user setting |
| category_id | uuid | |
| occurred_at | date | |
| note | string? | merchant / description |
| created_at | timestamp | |

### `savings_goals`

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | |
| name | string | e.g. "Emergency fund" |
| target_amount | number | |
| current_amount | number | updated on contribution |
| target_date | date? | optional |
| created_at | timestamp | |

### `savings_contributions`

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | |
| goal_id | uuid | |
| amount | number | |
| contributed_at | date | |
| note | string? | |

### `debts`

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | |
| name | string | e.g. "Credit Card A" |
| principal_balance | number | current balance |
| interest_rate_apr | number? | annual % |
| minimum_payment | number? | |
| due_day_of_month | int? | 1–31 |
| created_at | timestamp | |

### `debt_payments`

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | |
| debt_id | uuid | |
| amount | number | |
| paid_at | date | |
| note | string? | |

---

## 5. Core flows

### Quick expense entry

```
[+ Expense]
    │
    ▼
Amount (numeric keypad first)
    │
    ▼
Category (grid of icons)
    │
    ▼
Optional note + date (default today)
    │
    ▼
Save → update dashboard totals
```

**Target:** 3 taps from home to saved expense.

### Savings contribution

```
[Goal detail] → [Add contribution] → amount → save
    │
    └─► current_amount += amount
```

### Debt payment

```
[Debt detail] → [Log payment] → amount → save
    │
    └─► principal_balance -= amount (floor at 0)
```

---

## 6. Dashboard widgets (Finance Home)

| Widget | v1 | Later |
|--------|----|-------|
| This month spending total | Yes | |
| vs last month (%) | | Yes |
| Top 3 categories | Should-have | |
| Savings goals progress (mini) | Yes | |
| Total debt | Yes | |
| Net worth (assets − debt) | | Yes |
| Upcoming due dates | Should-have | |

---

## 7. AI integration points

| Feature | Input | AI output | User action |
|---------|-------|-----------|-------------|
| Bulk parse | Text list of spends | `[{ amount, category_guess, note }]` | Confirm each |
| Spending Q&A | Natural language + DB context | Answer with numbers | Read only |
| Monthly summary | Request + month | Narrative + breakdown | Read only |
| Debt advice | Balances, rates, extra payment | Payoff suggestion | Informational only |

**Disclaimer in UI:** AI financial tips are informational, not professional advice.

---

## 8. Reports (v1.1)

| Report | Description |
|--------|-------------|
| Monthly by category | Pie or bar chart |
| Income vs expense | Simple comparison |
| Savings rate | (income − expenses) / income |
| Debt over time | Balance trend line |

---

## 9. v1 scope boundary (recommended)

**In v1**

- Add/list expenses and income  
- Categories (defaults + custom)  
- Monthly spending total on dashboard  
- Savings goals + contributions + progress  
- Debt accounts + payments + total debt  

**Defer to v1.1+**

- Multi-account wallets  
- Budgets and alerts  
- AI parsing and Q&A  
- Charts and comparisons  
- Debt payoff simulator  

---

## 10. Currency and locale

| Decision | Recommendation |
|----------|----------------|
| Primary currency | **PHP** (adjust if needed) — single currency in v1 |
| Date format | Locale-aware |
| Number format | Thousands separators per locale |

---

## 11. Open questions

- [ ] Track **installment purchases** as debt or as recurring expenses?  
- [ ] Separate **emergency fund** from generic savings goals? (same entity is fine)  
- [ ] Recurring bills (rent, subscriptions) — manual vs scheduled (Later)  
- [ ] Export to CSV for tax/personal records? (Should-have early)
