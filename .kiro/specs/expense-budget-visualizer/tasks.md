# Implementation Plan: Expense & Budget Visualizer

## Overview

Implement a single-page, client-side web app using plain HTML, CSS, and vanilla JavaScript. The architecture follows a unidirectional data-flow pattern: user action → validate → mutate state → persist to localStorage → re-render. All logic lives in `js/app.js` organised into clearly-labelled sections; styles in `css/style.css`; markup in `index.html`. Bonus features A (Custom Categories), B (Monthly Summary View), and E (Dark/Light Mode Toggle) are included.

---

## Tasks

- [ ] 1. Create project skeleton and HTML shell
  - Create `index.html` with semantic structure: `<header>` (title + theme toggle), `<main>` split into a left column (input form, balance, transaction list) and a right column (chart + month selector)
  - Load Chart.js from CDN (`<script src="https://cdn.jsdelivr.net/npm/chart.js">`) before `js/app.js`
  - Add `<link>` to `css/style.css`
  - Include all required element IDs: `#input-form`, `#item-name`, `#amount`, `#category-select`, `#custom-category`, `#add-category-btn`, `#submit-btn`, `#form-error`, `#category-error`, `#balance-display`, `#transaction-list`, `#chart-canvas`, `#chart-no-data`, `#month-selector`, `#theme-toggle`, `#storage-error`, `#data-warning`
  - Create `css/style.css` as an empty file (styles added in task 2)
  - Create `js/app.js` as an empty file (logic added in tasks 3–9)
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 2. Implement CSS layout, typography, and theme system
  - [ ] 2.1 Write base layout styles and typography
    - CSS custom properties on `:root` for spacing, font sizes, border-radius
    - Two-column grid layout for main content; single-column fallback at ≤ 768px
    - Base font-size ≥ 14px; contrast ratio ≥ 4.5:1 for all text/background pairs
    - Section separators with ≥ 16px whitespace or visible divider between Input_Form, Balance, Transaction_List, and Chart
    - `#transaction-list` container: `overflow-y: auto; max-height: 400px`
    - _Requirements: 7.3, 7.4, 2.2_

  - [ ] 2.2 Add dark/light theme CSS variables and toggle styles
    - Define `[data-theme="light"]` and `[data-theme="dark"]` variable sets covering background, surface, text, border, accent, and chart-label colours
    - Style `#theme-toggle` button with distinct icon/label per mode (☀️ / 🌙 or equivalent)
    - All UI sections (form, balance, list, chart) must visually reflect the active theme
    - _Requirements: Bonus E.1, Bonus E.2_

- [ ] 3. Implement Constants & Config and State sections of `js/app.js`
  - [ ] 3.1 Define constants and initial state object
    - Define storage key constants: `STORAGE_KEY_TRANSACTIONS = "ebv_transactions"`, `STORAGE_KEY_CATEGORIES = "ebv_categories"`, `STORAGE_KEY_THEME = "ebv_theme"`
    - Define `DEFAULT_CATEGORIES = ["Food", "Transport", "Fun"]` and `MAX_AMOUNT = 999_999_999.99`
    - Define the `state` object: `{ transactions: [], categories: [], theme: "light", activeMonth: null, chartInstance: null }`
    - _Requirements: 6.1, 5.1, Bonus E.4_

- [ ] 4. Implement Storage section (`loadState` / `saveState`)
  - [ ] 4.1 Implement `loadState()`
    - Read `ebv_transactions`: parse JSON; on parse failure set `state.transactions = []` and show `#data-warning` banner
    - Read `ebv_categories`: parse JSON array of custom category strings; merge with `DEFAULT_CATEGORIES` (defaults first)
    - Read `ebv_theme`: accept only `"dark"` or `"light"`; default to `"light"` for any other value
    - _Requirements: 5.2, 5.6, Bonus A.5, Bonus E.4_

  - [ ] 4.2 Implement `saveState()`
    - Wrap all `localStorage.setItem()` calls in try/catch
    - On throw: show `#storage-error` banner; do NOT update in-memory state or re-render (rollback)
    - Serialize `state.transactions` to JSON under `ebv_transactions`
    - Serialize custom categories (exclude defaults) to JSON under `ebv_categories`
    - Write `state.theme` (plain string) under `ebv_theme`
    - _Requirements: 5.1, 5.3, 5.5, 1.7_

  - [ ]* 4.3 Write property test for JSON serialization round-trip (single transaction)
    - **Property 1: Transaction JSON serialization round-trip**
    - **Validates: Requirements 5.1, 5.4**
    - Generate arbitrary valid `Transaction` objects with fast-check; assert `JSON.parse(JSON.stringify(tx))` produces identical `id`, `name`, `amount`, `category`, `timestamp`

  - [ ]* 4.4 Write property test for array-level serialization round-trip
    - **Property 2: Array-level serialization round-trip**
    - **Validates: Requirements 5.4**
    - Generate arbitrary arrays of valid `Transaction` objects; assert round-trip preserves length, order, and all field values

  - [ ]* 4.5 Write property test for theme initialization defaults
    - **Property 8: Theme initialization defaults to light mode for invalid values**
    - **Validates: Requirements Bonus E.4**
    - Generate arbitrary strings that are not `"dark"` or `"light"` (including empty, null-like strings); assert `resolveTheme(value)` always returns `"light"`

- [ ] 5. Implement Validation section
  - [ ] 5.1 Implement `validateTransaction(name, amount, category)`
    - Trim `name`; error if empty or length > 100
    - Error if `amount` is empty, non-numeric, ≤ 0, or > `MAX_AMOUNT`
    - Error if `category` is empty/falsy
    - Return `{ ok: true, data: { name, amount, category } }` on success or `{ ok: false, errors: [...] }` on failure
    - _Requirements: 1.4, 1.5_

  - [ ] 5.2 Implement `validateCategory(newName, existingCategories)`
    - Trim `newName`; error if empty
    - Case-insensitive duplicate check against `existingCategories`; error if match found
    - Return `{ ok: true, name: trimmed }` or `{ ok: false, error: "..." }`
    - _Requirements: Bonus A.2, Bonus A.3_

  - [ ]* 5.3 Write property test for validation rejecting invalid amounts
    - **Property 3: Transaction input validation rejects invalid amounts**
    - **Validates: Requirements 1.5**
    - Generate values that are zero, negative, non-numeric strings, or > 999,999,999.99; assert `validateTransaction` always returns `ok: false`

  - [ ]* 5.4 Write property test for validation rejecting empty fields
    - **Property 4: Transaction input validation rejects empty fields**
    - **Validates: Requirements 1.4**
    - Generate form submissions where at least one of name/amount/category is empty or whitespace-only; assert `validateTransaction` always returns `ok: false` with appropriate error messages

  - [ ]* 5.5 Write property test for category deduplication (case-insensitive)
    - **Property 6: Category deduplication is case-insensitive**
    - **Validates: Requirements Bonus A.3**
    - Generate an existing category list and a new name that differs only by case or whitespace; assert `validateCategory` always returns `ok: false` without modifying the list

- [ ] 6. Checkpoint — Validate pure logic before wiring UI
  - Ensure all unit tests for validation and storage pass; ask the user if questions arise.

- [ ] 7. Implement State Mutations section
  - [ ] 7.1 Implement `addTransaction(name, amount, category)`
    - Create a `Transaction` object: `{ id: crypto.randomUUID(), name, amount: parseFloat(amount), category, timestamp: Date.now() }`
    - Prepend to `state.transactions`
    - Call `saveState()`; on storage error abort (do not push to array)
    - _Requirements: 1.3, 1.6, 5.3_

  - [ ] 7.2 Implement `deleteTransaction(id)`
    - Filter `state.transactions` to remove exactly the entry matching `id`
    - Call `saveState()`
    - _Requirements: 2.4_

  - [ ] 7.3 Implement `addCategory(name)`
    - Push trimmed name to `state.categories`
    - Call `saveState()`
    - _Requirements: Bonus A.2, Bonus A.4_

  - [ ]* 7.4 Write property test for delete removing exactly one transaction by ID
    - **Property 9: Delete removes exactly one transaction by ID**
    - **Validates: Requirements 2.4**
    - Generate arrays with arbitrary transactions (including duplicates of name/amount/category) and a valid target ID; assert after `deleteTransaction` exactly one element is removed and all others are unchanged

  - [ ]* 7.5 Write property test for balance calculation correctness
    - **Property 5: Balance calculation correctness**
    - **Validates: Requirements 3.1, 3.2**
    - Generate non-empty arrays of valid transactions; assert `computeBalance(transactions)` equals the arithmetic sum of all `amount` fields, formatted to exactly 2 decimal places

- [ ] 8. Implement Rendering section
  - [ ] 8.1 Implement `renderBalance(transactions)`
    - Sum `amount` fields of the passed transaction array
    - Set `#balance-display` text to the result formatted with `.toFixed(2)`; show `"0.00"` when array is empty
    - _Requirements: 3.1, 3.3, Bonus B.3_

  - [ ] 8.2 Implement `renderList(transactions)`
    - Clear `#transaction-list`
    - If empty: insert `<li class="empty-state">No transactions yet.</li>`
    - Otherwise: for each transaction (already in reverse-chronological order) insert `<li>` with item name, amount (`.toFixed(2)`), category, and a delete `<button data-id="...">`
    - _Requirements: 2.1, 2.3, 2.5, Bonus B.2_

  - [ ] 8.3 Implement `renderChart(transactions)`
    - Compute per-category totals; exclude categories with total === 0
    - If no data: destroy existing chart instance, clear canvas, show `#chart-no-data` text; return
    - If Chart.js unavailable (`typeof Chart === "undefined"`): hide canvas, show CDN-failure message
    - Otherwise: upsert chart via `state.chartInstance` (create on first call, call `.update()` on subsequent calls)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ] 8.4 Implement `renderMonthSelector(transactions)` (Bonus B)
    - Extract distinct `"YYYY-MM"` strings from all transactions' `timestamp` fields
    - Populate `#month-selector` with "All Transactions" as first option, then one option per month in descending order
    - Preserve currently selected month if it still has transactions; otherwise reset to "All Transactions"
    - _Requirements: Bonus B.1_

  - [ ] 8.5 Implement `renderAll()`
    - Derive `filtered = state.activeMonth ? filterByMonth(state.transactions, state.activeMonth) : state.transactions`
    - Call `renderBalance(filtered)`, `renderList(filtered)`, `renderChart(filtered)`, `renderMonthSelector(state.transactions)`
    - _Requirements: 2.3, 3.2, 4.3, Bonus B.3, Bonus B.4_

  - [ ]* 8.6 Write property test for monthly filter scoping
    - **Property 7: Monthly filter scopes all derived values**
    - **Validates: Requirements Bonus B.2, Bonus B.3**
    - Generate arbitrary transaction sets and a target month; assert `filterByMonth(transactions, month)` returns only transactions whose `timestamp` falls within that calendar month, and `computeBalance` over the result equals the sum of only those amounts

  - [ ]* 8.7 Write property test for chart excluding zero-amount categories
    - **Property 10: Chart excludes zero-amount categories**
    - **Validates: Requirements 4.6**
    - Generate transaction sets where some categories have had all their transactions deleted; assert `computeCategoryTotals(transactions)` produces entries only for categories with a sum strictly greater than zero

- [ ] 9. Implement Theme, Event Listeners, and Bootstrap sections
  - [ ] 9.1 Implement `applyTheme()` and `toggleTheme()`
    - `applyTheme()`: set `document.documentElement.dataset.theme = state.theme`; update `#theme-toggle` label/icon
    - `toggleTheme()`: flip `state.theme` between `"light"` and `"dark"`; call `applyTheme()`; call `saveState()`
    - _Requirements: Bonus E.1, Bonus E.2, Bonus E.3_

  - [ ] 9.2 Implement `initEventListeners()`
    - `#input-form` submit → `handleFormSubmit()`: validate → `addTransaction()` → `renderAll()` → reset form; on error write to `#form-error`
    - `#add-category-btn` click → `handleAddCategory()`: validate → `addCategory()` → repopulate `#category-select`; on error write to `#category-error`
    - `#transaction-list` click (delegation) → if `event.target` has `data-id`: `deleteTransaction(id)` → `renderAll()`
    - `#month-selector` change → set `state.activeMonth` to selected value (or `null` for "All") → `renderAll()`
    - `#theme-toggle` click → `toggleTheme()`
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 2.4, Bonus A.2, Bonus B.2, Bonus E.1_

  - [ ] 9.3 Implement `init()` (Bootstrap)
    - Call `loadState()`
    - Call `applyTheme()`
    - Call `renderAll()`
    - Attach event listeners via `initEventListeners()`
    - Call `init()` inside a `DOMContentLoaded` listener
    - _Requirements: 5.2, 7.1, Bonus E.4_

- [ ] 10. Write unit tests (Jest + jsdom)
  - [ ]* 10.1 Write unit tests for form submission scenarios
    - Valid full form → transaction added, form resets, list updated
    - One empty field → `#form-error` populated, no transaction created
    - Amount = 0 and amount > MAX_AMOUNT → rejected; amount = 0.01 and amount = 999,999,999.99 → accepted
    - _Requirements: 1.3, 1.4, 1.5, 1.6_

  - [ ]* 10.2 Write unit tests for delete, empty-state, and list rendering
    - Delete removes correct `<li>` from DOM
    - Deleting last transaction shows empty-state message
    - Transactions rendered in reverse chronological order
    - _Requirements: 2.1, 2.4, 2.5_

  - [ ]* 10.3 Write unit tests for monthly filter UI and theme toggle
    - Month selector only lists months with transactions
    - Clearing month filter restores full list and balance
    - Theme toggle switches `data-theme` attribute on `<html>`; persists to localStorage
    - _Requirements: Bonus B.1, Bonus B.4, Bonus E.1, Bonus E.3_

  - [ ]* 10.4 Write unit tests for error handling paths
    - Chart.js CDN missing: canvas hidden, fallback message shown
    - `localStorage.setItem` throws: `#storage-error` shown, state unchanged
    - Corrupt localStorage on init: `#data-warning` shown, transactions = []
    - _Requirements: 5.5, 5.6, 1.7_

- [ ] 11. Final checkpoint — All tests pass, app works end-to-end
  - Ensure all Jest unit tests and fast-check property tests pass (`npm test`)
  - Verify app opens from `index.html` without build step, no console errors
  - Ask the user if any questions arise before closing out.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP delivery
- Pure functions (`validateTransaction`, `validateCategory`, `computeBalance`, `filterByMonth`, `computeCategoryTotals`, `resolveTheme`) should be exported from a companion `js/helpers.js` module (or via `module.exports` in a test-only context) so Jest can import them without a DOM
- Each property test references the exact property number from the design document for traceability
- Checkpoints in tasks 6 and 11 ensure incremental correctness before final integration
- The dependency graph below uses only leaf sub-tasks (decimal notation); top-level tasks and checkpoints are excluded

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "2.1"] },
    { "id": 1, "tasks": ["2.2", "3.1"] },
    { "id": 2, "tasks": ["4.1", "4.2"] },
    { "id": 3, "tasks": ["4.3", "4.4", "4.5", "5.1", "5.2"] },
    { "id": 4, "tasks": ["5.3", "5.4", "5.5", "7.1", "7.2", "7.3"] },
    { "id": 5, "tasks": ["7.4", "7.5", "8.1", "8.2", "8.3", "8.4"] },
    { "id": 6, "tasks": ["8.5", "8.6", "8.7", "9.1"] },
    { "id": 7, "tasks": ["9.2", "9.3"] },
    { "id": 8, "tasks": ["10.1", "10.2", "10.3", "10.4"] }
  ]
}
```
