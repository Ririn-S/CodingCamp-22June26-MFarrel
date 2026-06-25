# Project Structure

```
/
├── index.html          # Single HTML entry point; all markup lives here
├── css/
│   └── style.css       # All styles; uses CSS custom properties for theming
├── js/
│   └── app.js          # All application logic (single file, no modules)
└── README.md           # Minimal project readme
```

## Architecture

The entire app is a single JS file (`app.js`) with no modules. Code is organized into clearly separated sections using banner comments:

| Section | Responsibility |
|---------|---------------|
| **Constants & Config** | `STORAGE_KEY_*`, `DEFAULT_CATEGORIES`, `MAX_AMOUNT` |
| **State** | Single `state` object — transactions, categories, theme, activeMonth, chartInstance |
| **Storage** | `loadState()` / `saveState()` — reads/writes localStorage |
| **Validation** | `validateTransaction()`, `validateCategory()` — pure functions, return `{ ok, data/errors }` |
| **State Mutations** | `addTransaction()`, `deleteTransaction()`, `addCategory()` — mutate `state` then call `saveState()` |
| **Rendering** | `renderBalance()`, `renderList()`, `renderChart()`, `renderMonthSelector()`, `populateCategorySelect()`, `renderAll()` — DOM writes only, no state mutation |
| **Theme** | `applyTheme()`, `toggleTheme()` |
| **Event Listeners** | `initEventListeners()` — all listeners registered once on init |
| **Bootstrap** | `init()` → `document.addEventListener("DOMContentLoaded", init)` |

## Key Conventions

- **No direct DOM writes outside render functions.** Mutations go through state mutation functions; render functions are the only place that touch the DOM.
- **`renderAll()` is the master re-render.** Call it after any state change that should update the UI. It filters by `state.activeMonth` then delegates to individual render functions.
- **Event delegation** is used for the transaction list (one listener on `#transaction-list`, not per-item).
- **Rollback on storage failure.** `addTransaction()` snapshots state before mutation and restores it if `saveState()` shows a storage error banner.
- **CSS theming** is driven entirely by `data-theme="light|dark"` on `<html>`. Never hard-code colours in JS.
