/* ============================================================
   Constants & Config
   ============================================================ */
const STORAGE_KEY_TRANSACTIONS = "ebv_transactions";
const STORAGE_KEY_CATEGORIES   = "ebv_categories";
const STORAGE_KEY_THEME        = "ebv_theme";

const DEFAULT_CATEGORIES = ["Food", "Transport", "Fun"];
const MAX_AMOUNT         = 999_999_999.99;

/* ============================================================
   State
   ============================================================ */
const state = {
  transactions:  [],      // Transaction[]  — all loaded transactions
  categories:    [],      // string[]       — all category names (default + custom)
  theme:         "light", // "light" | "dark"
  activeMonth:   null,    // "YYYY-MM" string | null  (null = show all)
  chartInstance: null,    // Chart.js instance | null
};

/* ============================================================
   Storage
   ============================================================ */

/**
 * loadState()
 * Reads persisted data from localStorage into the in-memory state object.
 * - ebv_transactions : JSON array of Transaction objects; on parse failure
 *   state.transactions is set to [] and #data-warning banner is shown.
 * - ebv_categories   : JSON array of custom category strings; merged with
 *   DEFAULT_CATEGORIES (defaults first) and assigned to state.categories.
 * - ebv_theme        : plain string; only "dark" or "light" are accepted;
 *   any other value (including absent/null/empty) defaults to "light".
 *
 * Requirements: 5.2, 5.6, Bonus A.5, Bonus E.4
 */
function loadState() {
  // --- Transactions ---
  const rawTransactions = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
  if (rawTransactions !== null) {
    try {
      const parsed = JSON.parse(rawTransactions);
      state.transactions = Array.isArray(parsed) ? parsed : [];
      if (!Array.isArray(parsed)) {
        // Value parsed but isn't an array — treat as corrupt
        const banner = document.getElementById("data-warning");
        if (banner) banner.hidden = false;
      }
    } catch (_err) {
      state.transactions = [];
      const banner = document.getElementById("data-warning");
      if (banner) banner.hidden = false;
    }
  } else {
    // First launch — no key present; start with empty array (no warning)
    state.transactions = [];
  }

  // --- Categories ---
  const rawCategories = localStorage.getItem(STORAGE_KEY_CATEGORIES);
  let customCategories = [];
  if (rawCategories !== null) {
    try {
      const parsed = JSON.parse(rawCategories);
      if (Array.isArray(parsed)) {
        // Keep only non-empty strings
        customCategories = parsed.filter(
          (c) => typeof c === "string" && c.trim().length > 0
        );
      }
    } catch (_err) {
      // Ignore corrupt categories; fall back to defaults only
      customCategories = [];
    }
  }
  // Defaults first, then custom (deduplicate in case of overlap)
  const defaultSet = new Set(DEFAULT_CATEGORIES.map((c) => c.toLowerCase()));
  const uniqueCustom = customCategories.filter(
    (c) => !defaultSet.has(c.toLowerCase())
  );
  state.categories = [...DEFAULT_CATEGORIES, ...uniqueCustom];

  // --- Theme ---
  const rawTheme = localStorage.getItem(STORAGE_KEY_THEME);
  state.theme = rawTheme === "dark" || rawTheme === "light" ? rawTheme : "light";
}

/**
 * saveState()
 * Persists the current in-memory state to localStorage.
 * All setItem calls are wrapped in a single try/catch; on any failure
 * the #storage-error banner is shown and no in-memory state is mutated
 * (the caller is responsible for not mutating state before calling saveState).
 *
 * - ebv_transactions : full state.transactions array, serialized to JSON.
 * - ebv_categories   : only custom categories (DEFAULT_CATEGORIES filtered out).
 * - ebv_theme        : state.theme as a plain string.
 *
 * Requirements: 5.1, 5.3, 5.5, 1.7
 */
function saveState() {
  try {
    // Serialize transactions
    localStorage.setItem(
      STORAGE_KEY_TRANSACTIONS,
      JSON.stringify(state.transactions)
    );

    // Serialize custom categories only (filter out defaults)
    const defaultSet = new Set(DEFAULT_CATEGORIES.map((c) => c.toLowerCase()));
    const customCategories = state.categories.filter(
      (c) => !defaultSet.has(c.toLowerCase())
    );
    localStorage.setItem(
      STORAGE_KEY_CATEGORIES,
      JSON.stringify(customCategories)
    );

    // Persist theme as plain string
    localStorage.setItem(STORAGE_KEY_THEME, state.theme);
  } catch (_err) {
    // Show storage error banner; do NOT mutate state or re-render
    const banner = document.getElementById("storage-error");
    if (banner) banner.hidden = false;
  }
}

/* ============================================================
   Validation
   ============================================================ */

/**
 * validateTransaction(name, amount, category)
 * Validates raw form inputs for a new transaction.
 *
 * Rules:
 *   - name   : trimmed; must be non-empty and at most 100 characters.
 *   - amount : must not be an empty string, must be numeric, must be > 0
 *              and ≤ MAX_AMOUNT (999,999,999.99).
 *   - category: must be truthy (non-empty string).
 *
 * Returns:
 *   { ok: true,  data: { name: trimmedName, amount: parsedAmount, category } }
 *   { ok: false, errors: string[] }  — errors lists every failing field.
 *
 * Requirements: 1.4, 1.5
 *
 * @param {string} name
 * @param {string} amount
 * @param {string} category
 * @returns {{ ok: boolean, data?: object, errors?: string[] }}
 */
function validateTransaction(name, amount, category) {
  const errors = [];

  // --- Name ---
  const trimmedName = typeof name === "string" ? name.trim() : "";
  if (trimmedName.length === 0) {
    errors.push("Item name is required.");
  } else if (trimmedName.length > 100) {
    errors.push("Item name must be 100 characters or fewer.");
  }

  // --- Amount ---
  let parsedAmount = NaN;
  if (amount === "" || amount === null || amount === undefined) {
    errors.push("Amount is required.");
  } else {
    parsedAmount = Number(amount);
    if (isNaN(parsedAmount)) {
      errors.push("Amount must be a valid number.");
    } else if (parsedAmount <= 0) {
      errors.push("Amount must be greater than 0.");
    } else if (parsedAmount > MAX_AMOUNT) {
      errors.push(`Amount must not exceed ${MAX_AMOUNT.toLocaleString()}.`);
    }
  }

  // --- Category ---
  if (!category) {
    errors.push("Category is required.");
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: { name: trimmedName, amount: parsedAmount, category },
  };
}

/**
 * validateCategory(newName, existingCategories)
 * Validates a new custom category name before adding it.
 *
 * Rules:
 *   - newName : trimmed; must be non-empty after trimming.
 *   - newName : must not match any entry in existingCategories
 *               under case-insensitive comparison.
 *
 * Returns:
 *   { ok: true,  name: trimmedName }
 *   { ok: false, error: string }
 *
 * Requirements: Bonus A.2, Bonus A.3
 *
 * @param {string} newName
 * @param {string[]} existingCategories
 * @returns {{ ok: boolean, name?: string, error?: string }}
 */
function validateCategory(newName, existingCategories) {
  const trimmedName = typeof newName === "string" ? newName.trim() : "";

  if (trimmedName.length === 0) {
    return { ok: false, error: "Category name cannot be empty." };
  }

  const lowerNew = trimmedName.toLowerCase();
  const isDuplicate = existingCategories.some(
    (c) => c.toLowerCase() === lowerNew
  );

  if (isDuplicate) {
    return { ok: false, error: `Category "${trimmedName}" already exists.` };
  }

  return { ok: true, name: trimmedName };
}

/* ============================================================
   State Mutations
   ============================================================ */

/**
 * addTransaction(name, amount, category)
 * Creates a new Transaction object and prepends it to state.transactions,
 * then persists the updated state to localStorage.
 *
 * If saveState() fails (storage error banner becomes visible), the mutation
 * is rolled back by restoring the previous transactions snapshot so in-memory
 * state stays consistent with what is actually persisted.
 *
 * `name` and `amount` are already validated/cleaned values coming from
 * validateTransaction().data — name is trimmed, amount is a parsed number.
 *
 * Requirements: 1.3, 1.6, 5.3
 *
 * @param {string} name      - Trimmed item name
 * @param {number} amount    - Positive parsed numeric amount
 * @param {string} category  - Category string
 */
function addTransaction(name, amount, category) {
  const tx = {
    id:        crypto.randomUUID(),
    name,
    amount:    typeof amount === "number" ? amount : parseFloat(amount),
    category,
    timestamp: Date.now(),
  };

  // Snapshot before mutation so we can roll back on save failure
  const snapshot = state.transactions.slice();

  state.transactions.unshift(tx);
  saveState();

  // If the storage-error banner is now visible, saveState() threw internally —
  // roll back the in-memory mutation so state stays consistent with storage.
  const errorBanner = document.getElementById("storage-error");
  if (errorBanner && !errorBanner.hidden) {
    state.transactions = snapshot;
  }
}

/**
 * deleteTransaction(id)
 * Removes the transaction with the given id from state.transactions and
 * persists the updated state to localStorage.
 *
 * Requirements: 2.4
 *
 * @param {string} id - The UUID of the transaction to remove
 */
function deleteTransaction(id) {
  state.transactions = state.transactions.filter((tx) => tx.id !== id);
  saveState();
}

/**
 * addCategory(name)
 * Appends a new (already-validated, trimmed) category name to state.categories
 * and persists the updated state to localStorage.
 *
 * Requirements: Bonus A.2, Bonus A.4
 *
 * @param {string} name - Trimmed, validated category name
 */
function addCategory(name) {
  state.categories.push(name);
  saveState();
}

/* ============================================================
   Rendering
   ============================================================ */

/**
 * renderBalance(transactions)
 * Sums the amount fields of the passed transactions array and updates
 * the #balance-display element to show the result formatted to 2 dp.
 * Shows "0.00" when the array is empty.
 *
 * Requirements: 3.1, 3.3, Bonus B.3
 *
 * @param {Array} transactions - Array of Transaction objects to sum
 */
function renderBalance(transactions) {
  const total = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const display = document.getElementById("balance-display");
  if (display) {
    display.textContent = total.toFixed(2);
  }
}

/**
 * renderList(transactions)
 * Clears #transaction-list and re-renders it from the provided array.
 * Transactions are assumed to already be in reverse-chronological order.
 * Shows an empty-state message when the array is empty.
 *
 * Requirements: 2.1, 2.3, 2.5, Bonus B.2
 *
 * @param {Array} transactions - Array of Transaction objects to render
 */
function renderList(transactions) {
  const list = document.getElementById("transaction-list");
  if (!list) return;

  list.innerHTML = "";

  if (transactions.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "empty-state";
    emptyItem.textContent = "No transactions yet.";
    list.appendChild(emptyItem);
    return;
  }

  transactions.forEach((tx) => {
    const li = document.createElement("li");

    // .transaction-info div
    const infoDiv = document.createElement("div");
    infoDiv.className = "transaction-info";

    const nameSpan = document.createElement("span");
    nameSpan.className = "transaction-name";
    nameSpan.textContent = tx.name;

    const metaSpan = document.createElement("span");
    metaSpan.className = "transaction-meta";
    metaSpan.textContent = tx.category;

    infoDiv.appendChild(nameSpan);
    infoDiv.appendChild(metaSpan);

    // .transaction-amount span
    const amountSpan = document.createElement("span");
    amountSpan.className = "transaction-amount";
    amountSpan.textContent = tx.amount.toFixed(2);

    // delete button
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.dataset.id = tx.id;
    deleteBtn.setAttribute("aria-label", `Delete ${tx.name}`);
    deleteBtn.textContent = "Delete";

    li.appendChild(infoDiv);
    li.appendChild(amountSpan);
    li.appendChild(deleteBtn);

    list.appendChild(li);
  });
}

/**
 * renderChart(transactions)
 * Computes per-category totals and updates (or creates) the Chart.js pie
 * chart stored in state.chartInstance. Handles the no-data and
 * Chart.js-unavailable cases gracefully.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 *
 * @param {Array} transactions - Array of Transaction objects to chart
 */
function renderChart(transactions) {
  const canvas = document.getElementById("chart-canvas");
  const noDataEl = document.getElementById("chart-no-data");

  // Compute per-category totals, excluding zero-sum categories
  const totalsMap = {};
  transactions.forEach((tx) => {
    totalsMap[tx.category] = (totalsMap[tx.category] || 0) + tx.amount;
  });
  const labels = Object.keys(totalsMap).filter((cat) => totalsMap[cat] !== 0);
  const data = labels.map((cat) => totalsMap[cat]);

  // No data case
  if (labels.length === 0) {
    if (state.chartInstance) {
      state.chartInstance.destroy();
      state.chartInstance = null;
    }
    if (noDataEl) noDataEl.hidden = false;
    if (canvas) canvas.style.display = "none";
    return;
  }

  // Chart.js unavailable
  if (typeof Chart === "undefined") {
    if (canvas) canvas.style.display = "none";
    if (noDataEl) {
      noDataEl.hidden = false;
      noDataEl.textContent = "Chart unavailable — unable to load Chart.js.";
    }
    return;
  }

  // Data exists and Chart.js is available
  if (noDataEl) noDataEl.hidden = true;
  if (canvas) canvas.style.display = "";

  const palette = [
    "#FF6384",
    "#36A2EB",
    "#FFCE56",
    "#4BC0C0",
    "#9966FF",
    "#FF9F40",
    "#C9CBCF",
  ];
  const backgroundColors = labels.map((_, i) => palette[i % palette.length]);

  if (state.chartInstance === null) {
    // Create new chart instance
    state.chartInstance = new Chart(canvas, {
      type: "pie",
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: backgroundColors,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "bottom",
          },
        },
      },
    });
  } else {
    // Update existing chart instance to avoid flicker
    state.chartInstance.data.labels = labels;
    state.chartInstance.data.datasets[0].data = data;
    state.chartInstance.data.datasets[0].backgroundColor = backgroundColors;
    state.chartInstance.update();
  }
}

/**
 * renderMonthSelector(transactions)
 * Populates #month-selector with distinct "YYYY-MM" months derived from
 * all transactions' timestamps, sorted in descending order.
 * Preserves the previously selected month if it is still in the list.
 *
 * Requirements: Bonus B.1
 *
 * @param {Array} transactions - Full (unfiltered) array of Transaction objects
 */
function renderMonthSelector(transactions) {
  const selector = document.getElementById("month-selector");
  if (!selector) return;

  // Remember previously selected value
  const previousValue = selector.value;

  // Extract distinct "YYYY-MM" strings
  const monthSet = new Set();
  transactions.forEach((tx) => {
    const d = new Date(tx.timestamp);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthSet.add(ym);
  });

  // Sort descending (most recent first)
  const months = Array.from(monthSet).sort((a, b) => (a > b ? -1 : 1));

  // Clear and rebuild options
  selector.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = "All Transactions";
  selector.appendChild(allOption);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  months.forEach((ym) => {
    const [year, month] = ym.split("-");
    const displayText = `${monthNames[parseInt(month, 10) - 1]} ${year}`;
    const option = document.createElement("option");
    option.value = ym;
    option.textContent = displayText;
    selector.appendChild(option);
  });

  // Restore previous selection if still available, otherwise reset to "All"
  if (previousValue && months.includes(previousValue)) {
    selector.value = previousValue;
  } else {
    selector.value = "";
  }
}

/**
 * populateCategorySelect()
 * Clears #category-select and repopulates it from state.categories.
 * Called from event handlers (after adding a category) and on init.
 */
function populateCategorySelect() {
  const select = document.getElementById("category-select");
  if (!select) return;

  select.innerHTML = "";

  state.categories.forEach((cat) => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    select.appendChild(option);
  });
}

/**
 * renderAll()
 * Master render function. Filters transactions by state.activeMonth (if set),
 * then re-renders balance, list, chart, and month selector.
 *
 * Requirements: 2.3, 3.2, 4.3, Bonus B.3, Bonus B.4
 */
function renderAll() {
  const filtered = state.activeMonth
    ? state.transactions.filter((tx) => {
        const d = new Date(tx.timestamp);
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        return ym === state.activeMonth;
      })
    : state.transactions;

  renderBalance(filtered);
  renderList(filtered);
  renderChart(filtered);
  renderMonthSelector(state.transactions); // always pass full list to selector
}

/* ============================================================
   Theme
   ============================================================ */

/**
 * applyTheme()
 * Reads state.theme and applies it to the document by setting the
 * data-theme attribute on <html>. Also updates the #theme-toggle
 * button text to reflect the opposite action the user can take.
 *
 * Requirements: Bonus E.1, Bonus E.2, Bonus E.3
 */
function applyTheme() {
  document.documentElement.dataset.theme = state.theme;

  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    themeToggle.textContent =
      state.theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode";
  }
}

/**
 * toggleTheme()
 * Flips state.theme between "light" and "dark", then applies and
 * persists the new theme.
 *
 * Requirements: Bonus E.1, Bonus E.2, Bonus E.3
 */
function toggleTheme() {
  state.theme = state.theme === "light" ? "dark" : "light";
  applyTheme();
  saveState();
}

/* ============================================================
   Event Listeners
   ============================================================ */

/**
 * initEventListeners()
 * Attaches all DOM event listeners exactly once. Called during init().
 *
 * Requirements: 1.3, 1.4, 1.5, 1.6, 2.4, Bonus A.2, Bonus A.3,
 *               Bonus B.2, Bonus B.4, Bonus E.1
 */
function initEventListeners() {
  // 1. Transaction form submit
  document.getElementById("input-form").addEventListener("submit", function handleFormSubmit(e) {
    e.preventDefault();

    const name     = document.getElementById("item-name").value;
    const amount   = document.getElementById("amount").value;
    const category = document.getElementById("category-select").value;

    const result = validateTransaction(name, amount, category);

    if (!result.ok) {
      document.getElementById("form-error").textContent = result.errors.join(" ");
      return;
    }

    // Valid — clear error, add transaction, re-render, reset form
    document.getElementById("form-error").textContent = "";
    addTransaction(result.data.name, result.data.amount, result.data.category);
    renderAll();
    document.getElementById("input-form").reset();
    // Restore category options after reset clears the select
    populateCategorySelect();
  });

  // 2. Add custom category
  document.getElementById("add-category-btn").addEventListener("click", function handleAddCategory() {
    const newName = document.getElementById("custom-category").value;
    const result  = validateCategory(newName, state.categories);

    if (!result.ok) {
      document.getElementById("category-error").textContent = result.error;
      return;
    }

    document.getElementById("category-error").textContent = "";
    addCategory(result.name);
    populateCategorySelect();
    document.getElementById("custom-category").value = "";
  });

  // 3. Transaction list — delete via event delegation
  document.getElementById("transaction-list").addEventListener("click", function (event) {
    const id = event.target.dataset.id;
    if (id) {
      deleteTransaction(id);
      renderAll();
    }
  });

  // 4. Month selector change
  document.getElementById("month-selector").addEventListener("change", function (event) {
    state.activeMonth = event.target.value || null;
    renderAll();
  });

  // 5. Theme toggle
  document.getElementById("theme-toggle").addEventListener("click", function () {
    toggleTheme();
  });
}

/* ============================================================
   Bootstrap
   ============================================================ */

/**
 * init()
 * Application entry point. Loads persisted state, applies theme,
 * populates UI controls, and renders the initial view.
 *
 * Requirements: 5.2, 7.1, Bonus E.4
 */
function init() {
  loadState();
  applyTheme();
  populateCategorySelect();
  renderAll();
  initEventListeners();
}

document.addEventListener("DOMContentLoaded", init);
