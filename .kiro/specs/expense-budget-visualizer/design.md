# Design Document: Expense & Budget Visualizer

## Overview

The Expense & Budget Visualizer is a single-page, client-side web application built with pure HTML, CSS, and vanilla JavaScript. It lets users record personal expense transactions, review and delete them, see a live running balance, and understand spending patterns through a category-based pie chart powered by Chart.js.

All data is persisted in the browser's `localStorage`. There is no backend, no build step, and no framework. The application can be opened directly as a local HTML file or served from any static host.

### Selected Feature Set

**MVP Features:**
- Transaction input form with validation
- Transaction list with deletion
- Live total balance display
- Category pie chart (Chart.js via CDN)
- Data persistence via LocalStorage

**Bonus Features (A, B, E):**
- **Bonus A** – Custom Categories: user-defined category names, persisted in LocalStorage
- **Bonus B** – Monthly Summary View: month/year filter that scopes list, balance, and chart
- **Bonus E** – Dark/Light Mode Toggle: theme switch persisted in LocalStorage

---

## Architecture

The application follows a **unidirectional data-flow** pattern without a framework:

```
User Action
    │
    ▼
Input Handler (validate input)
    │
    ▼
State Mutation (update in-memory state object)
    │
    ▼
LocalStorage Write (persist state before UI update)
    │
    ▼
Render Pass (re-render all affected UI components)
```

Every add/delete/filter action goes through this pipeline. The **in-memory state** is the single source of truth at runtime; LocalStorage is the persistent mirror.

### File Structure

```
expense-budget-visualizer/
├── index.html          # App shell, loads CSS + Chart.js CDN + JS
├── css/
│   └── style.css       # All styles, including dark/light theme variables
└── js/
    └── app.js          # All application logic
```

### Module Organisation (within app.js)

Because the project is constrained to a single JS file, app.js is organised into clearly-separated logical sections using block comments:

| Section | Responsibility |
|---|---|
| **Constants & Config** | Storage keys, default categories, amount limits |
| **State** | Single `state` object holding all runtime data |
| **Storage** | `loadState()`, `saveState()` — serialise/deserialise |
| **Validation** | `validateTransaction()`, `validateCategory()` |
| **State Mutations** | `addTransaction()`, `deleteTransaction()`, `addCategory()` |
| **Rendering** | `renderAll()`, `renderList()`, `renderBalance()`, `renderChart()`, `renderMonthSelector()` |
| **Theme** | `applyTheme()`, `toggleTheme()` |
| **Event Listeners** | `initEventListeners()` — attached once on DOMContentLoaded |
| **Bootstrap** | `init()` — loads state, applies theme, runs first render |

---

## Components and Interfaces

### 1. Input Form (`#input-form`)

Handles transaction entry and custom category creation.

**Fields:**
- `#item-name` — `<input type="text" maxlength="100">`
- `#amount` — `<input type="number" min="0.01" max="999999999.99" step="0.01">`
- `#category-select` — `<select>` populated from state
- `#custom-category` — `<input type="text">` for Bonus A
- `#add-category-btn` — `<button>` for Bonus A
- `#submit-btn` — `<button type="submit">`
- `#form-error` — `<p>` element for validation messages

**Interactions:**
- Submit → `handleFormSubmit()` → validates → `addTransaction()` → `saveState()` → `renderAll()`
- Add Category → `handleAddCategory()` → validates → `addCategory()` → `saveState()` → update select

### 2. Balance Display (`#balance-display`)

A single `<span>` updated by `renderBalance()`.

- Shows sum of filtered (or all) transactions formatted to 2 decimal places.
- Always visible; shows `"0.00"` when no transactions match.

### 3. Transaction List (`#transaction-list`)

A `<ul>` element re-rendered by `renderList()`.

- Each `<li>` contains: item name, amount (2dp), category, delete button.
- Rendered in reverse chronological order (newest first).
- When empty: renders a single `<li class="empty-state">` message.
- List container has `overflow-y: auto` and a fixed `max-height` for scrollability.

**Delete interaction:**
- Delete button carries a `data-id` attribute matching the transaction's unique ID.
- Click → `handleDelete(id)` → `deleteTransaction(id)` → `saveState()` → `renderAll()`

### 4. Category Pie Chart (`#chart-canvas`)

A `<canvas>` element managed by a single Chart.js `Pie` instance stored as `state.chartInstance`.

**Render logic in `renderChart()`:**
- Compute per-category totals from filtered transactions.
- Exclude categories with total === 0.
- If no data: destroy/clear chart and show `#chart-no-data` label.
- If data exists: upsert chart via `state.chartInstance.data = …; state.chartInstance.update()` to avoid flickering.

### 5. Month Selector (`#month-selector`) — Bonus B

A `<select>` populated with `"YYYY-MM"` values for months that have at least one transaction. Includes a "All Transactions" default option.

- Change → `handleMonthFilter()` → sets `state.activeMonth` → `renderAll()`
- When active month has no transactions: list shows empty state, balance = `"0.00"`, chart shows no-data.

### 6. Theme Toggle (`#theme-toggle`) — Bonus E

A `<button>` with an icon/label that reflects current theme.

- Click → `toggleTheme()` → flips `state.theme` between `"light"` and `"dark"` → `applyTheme()` → `saveState()`
- `applyTheme()` sets `data-theme` attribute on `<html>` element; CSS variables handle the rest.

---

## Data Models

### Transaction

```javascript
{
  id: string,         // crypto.randomUUID() — unique per transaction
  name: string,       // item name, 1–100 characters, trimmed
  amount: number,     // positive float, > 0, ≤ 999,999,999.99
  category: string,   // one of the available category names
  timestamp: number   // Date.now() at creation time (Unix ms)
}
```

### State Object (runtime)

```javascript
const state = {
  transactions: [],     // Transaction[]  — all loaded transactions
  categories: [],       // string[]       — all category names (default + custom)
  theme: "light",       // "light" | "dark"
  activeMonth: null,    // "YYYY-MM" string | null (null = show all)
  chartInstance: null   // Chart.js instance | null
};
```

### LocalStorage Schema

| Key | Type | Content |
|---|---|---|
| `ebv_transactions` | JSON string | `Transaction[]` — serialized transaction array |
| `ebv_categories` | JSON string | `string[]` — custom category names only |
| `ebv_theme` | plain string | `"light"` or `"dark"` |

Default categories (Food, Transport, Fun) are never stored in LocalStorage — they are always injected at init time and prepended to any loaded custom categories.

### Serialization Contract

The `Transaction` data model is designed for lossless JSON round-trips:
- `id` is a string — survives JSON serialization unchanged.
- `amount` is a JavaScript `number` (IEEE 754 double); the maximum value `999,999,999.99` is well within safe integer range, so no precision is lost.
- `timestamp` is an integer (Unix ms) — no precision loss.
- `name` and `category` are strings — no transformation needed.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Transaction JSON serialization round-trip

*For any* valid `Transaction` object (with a string id, non-empty name ≤ 100 chars, positive numeric amount ≤ 999,999,999.99, valid category string, and integer timestamp), serializing it to JSON and then deserializing it back SHALL produce an object with identical `id`, `name`, `amount`, `category`, and `timestamp` fields.

**Validates: Requirements 5.1, 5.4**

---

### Property 2: Array-level serialization round-trip

*For any* array of valid `Transaction` objects, serializing the array to JSON and then deserializing it SHALL produce an array with the same length, the same insertion order, and identical field values for every element.

**Validates: Requirements 5.4**

---

### Property 3: Transaction input validation rejects invalid amounts

*For any* amount value that is zero, negative, non-numeric, or greater than 999,999,999.99, the validation function SHALL return an error result and SHALL NOT produce a transaction object.

**Validates: Requirements 1.5**

---

### Property 4: Transaction input validation rejects empty fields

*For any* form submission where at least one of Item Name, Amount, or Category is empty or whitespace-only after trimming, the validation function SHALL return an error result identifying the missing field(s) and SHALL NOT produce a transaction object.

**Validates: Requirements 1.4**

---

### Property 5: Balance calculation correctness

*For any* non-empty array of Transaction objects, the computed balance SHALL equal the arithmetic sum of all `amount` fields, formatted to exactly 2 decimal places.

**Validates: Requirements 3.1, 3.2**

---

### Property 6: Category deduplication is case-insensitive

*For any* existing list of category names and any new category string, if the new string (after trimming) is equal to any existing name under case-insensitive comparison, the add-category operation SHALL reject it and SHALL NOT modify the category list.

**Validates: Requirements Bonus A.3**

---

### Property 7: Monthly filter scopes all derived values

*For any* set of transactions and any selected month "YYYY-MM", the filtered transaction list SHALL contain only transactions whose `timestamp` falls within that calendar month, and the balance computed over that filtered list SHALL equal the sum of only those transactions' amounts.

**Validates: Requirements Bonus B.2, Bonus B.3**

---

### Property 8: Theme initialization defaults to light mode for invalid values

*For any* LocalStorage `ebv_theme` value that is not the string `"dark"` or `"light"` (including absent, null, empty string, or arbitrary string), the App's initialized theme SHALL be `"light"`.

**Validates: Requirements Bonus E.4**

---

### Property 9: Delete removes exactly one transaction by ID

*For any* array of transactions (including transactions with identical name, amount, and category fields) and a valid transaction ID present in that array, the delete operation SHALL remove exactly the transaction with that ID and leave all other transactions unchanged.

**Validates: Requirements 2.4**

---

### Property 10: Chart excludes zero-amount categories

*For any* set of transactions where some categories have been fully deleted (all their transactions removed), the set of chart slices rendered SHALL contain only categories whose summed transaction amount is strictly greater than zero.

**Validates: Requirements 4.6**

---

## Error Handling

### LocalStorage Write Failure

**Trigger:** `localStorage.setItem()` throws (e.g., quota exceeded, private browsing restriction).

**Handling:**
1. Catch the exception in `saveState()`.
2. Display a non-dismissible error banner (`#storage-error`) with message: *"Could not save data. Storage may be full."*
3. Do **not** update the in-memory `state` object or re-render the UI — the transaction/change is rolled back.

### Corrupt LocalStorage Data

**Trigger:** `JSON.parse()` throws when reading `ebv_transactions` on startup.

**Handling:**
1. Catch the exception in `loadState()`.
2. Discard the corrupt value: initialize `state.transactions = []`.
3. Show a non-blocking dismissible warning banner (`#data-warning`): *"Previous data could not be loaded and has been cleared."*
4. Continue with normal startup rendering.

### Form Validation Errors

**Trigger:** User submits with missing/invalid fields.

**Handling:**
- Inline error messages in `#form-error` element (not an alert/toast — always visible in form).
- Errors are cleared on the next successful submission or when the form is reset.

### Custom Category Validation Errors

**Trigger:** User adds empty, whitespace-only, or duplicate category.

**Handling:**
- Inline error in `#category-error` element adjacent to the custom category input.

### Chart.js CDN Failure

**Trigger:** `Chart` global is not defined (CDN load failed, no internet for local file).

**Handling:**
- Check `typeof Chart !== "undefined"` before initializing.
- If unavailable: hide the chart canvas and display a static message: *"Chart unavailable — unable to load Chart.js."*
- All other features (form, list, balance) continue to function.

---

## Testing Strategy

### PBT Applicability Assessment

This feature contains several pure functions (validation, serialization, balance calculation, filtering) that are well-suited for property-based testing. PBT is appropriate because:

- Input space is large (arbitrary strings, numeric amounts, timestamps, category names).
- Universal properties exist: round-trips, invariants, and filter correctness.
- The functions are pure/in-memory (no I/O cost per iteration).

PBT library: **[fast-check](https://github.com/dubzzz/fast-check)** (JavaScript, works in Node.js for unit tests against the pure functions extracted from app.js).

### Dual Testing Approach

**Unit / Example Tests** (Jest + jsdom):
- Specific form submit scenarios (all fields valid, one field empty, boundary amounts).
- Delete removes correct item from list DOM.
- Month filter UI shows/hides selector correctly.
- Theme toggle switches class on `<html>` element.
- Chart.js CDN-missing fallback message appears.

**Property-Based Tests** (fast-check, minimum 100 iterations each):

| Test | Property | Tag |
|---|---|---|
| JSON round-trip (single) | Property 1 | `Feature: expense-budget-visualizer, Property 1` |
| JSON round-trip (array) | Property 2 | `Feature: expense-budget-visualizer, Property 2` |
| Validation rejects bad amounts | Property 3 | `Feature: expense-budget-visualizer, Property 3` |
| Validation rejects empty fields | Property 4 | `Feature: expense-budget-visualizer, Property 4` |
| Balance calculation | Property 5 | `Feature: expense-budget-visualizer, Property 5` |
| Category deduplication | Property 6 | `Feature: expense-budget-visualizer, Property 6` |
| Monthly filter scoping | Property 7 | `Feature: expense-budget-visualizer, Property 7` |
| Theme default fallback | Property 8 | `Feature: expense-budget-visualizer, Property 8` |
| Delete by ID | Property 9 | `Feature: expense-budget-visualizer, Property 9` |
| Chart excludes zero categories | Property 10 | `Feature: expense-budget-visualizer, Property 10` |

**Integration / Smoke Tests** (manual or Playwright):
- App loads from `file://` protocol without console errors in each target browser.
- All four main UI sections are visible on load.
- Add a transaction → appears in list, balance updates, chart slice appears.
- Delete the only transaction → list shows empty state, balance = "0.00", chart shows no-data label.
- Reload page → previously added transactions are restored from LocalStorage.

### Test Configuration

Property-based tests run with `numRuns: 100` minimum per property. The pure functions targeted by property tests should be extractable from `app.js` as named exports (or the test file can import a parallel helper module that the `app.js` logic delegates to).
