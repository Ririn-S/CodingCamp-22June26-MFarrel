# Requirements Document

## Introduction

The Expense & Budget Visualizer is a client-side web application that allows users to track their personal expenses, categorize spending, and visualize their budget distribution through interactive charts. The app runs entirely in the browser with no backend required — all data is persisted via the browser's Local Storage API. It is designed for simplicity, speed, and clarity, and can be used as a standalone web page or browser extension.

The MVP covers transaction entry, a transaction list with deletion, a live total balance display, and a category-based pie chart. Five bonus interactive features are listed as candidates; three will be selected for implementation.

---

## Glossary

- **App**: The Expense & Budget Visualizer web application.
- **Transaction**: A single expense entry consisting of an item name, a monetary amount, and a category.
- **Category**: A label assigned to a Transaction to group spending. Default categories are Food, Transport, and Fun. Custom categories may be added by the user.
- **Balance**: The sum of all Transaction amounts currently stored.
- **Chart**: The pie chart that visualizes spending distribution by Category.
- **Local_Storage**: The browser's Web Storage API (`window.localStorage`) used to persist Transaction data client-side.
- **Transaction_List**: The scrollable UI component that displays all stored Transactions.
- **Input_Form**: The UI component containing fields for entering a new Transaction.
- **Spending_Limit**: A user-defined monetary threshold per Category, above which spending is highlighted.
- **Monthly_Summary**: An aggregated view of Transactions filtered to a single calendar month.

---

## Requirements

### Requirement 1: Transaction Input

**User Story:** As a user, I want to enter expense details through a form, so that I can record my spending quickly.

#### Acceptance Criteria

1. THE Input_Form SHALL contain three fields: Item Name (text, max 100 characters), Amount (numeric), and Category (select).
2. THE Input_Form SHALL provide the default Category options: Food, Transport, and Fun.
3. WHEN the user submits the Input_Form with all fields filled and a valid positive Amount (greater than 0 and at most 999,999,999.99), THE App SHALL create a new Transaction and add it to Local_Storage.
4. WHEN the user submits the Input_Form with one or more empty fields, THE Input_Form SHALL display a validation error message identifying which fields are missing and SHALL NOT create a Transaction.
5. WHEN the user submits the Input_Form with an Amount that is not a positive number (zero, negative, non-numeric, or exceeds 999,999,999.99), THE Input_Form SHALL display a validation error message and SHALL NOT create a Transaction.
6. WHEN a Transaction is successfully created, THE Input_Form SHALL reset all fields to their default empty/placeholder state (Item Name empty, Amount empty, Category reset to the first default option).
7. IF writing to Local_Storage fails during Transaction creation, THE App SHALL display an error message and SHALL NOT add the Transaction to the Transaction_List.

---

### Requirement 2: Transaction List

**User Story:** As a user, I want to see all my recorded expenses in a list, so that I can review and manage my spending history.

#### Acceptance Criteria

1. THE Transaction_List SHALL display all stored Transactions in reverse chronological order (most recently added first), each showing the Item Name, Amount (formatted to 2 decimal places), and Category.
2. IF the rendered Transaction_List height exceeds its container height, THE Transaction_List SHALL be scrollable.
3. WHEN a Transaction is added or deleted, THE Transaction_List SHALL re-render to display all and only the Transactions currently stored in Local_Storage without requiring a page reload.
4. WHEN the user activates the delete control on a Transaction entry, THE App SHALL remove only that specific Transaction from Local_Storage and from the Transaction_List without affecting any other Transactions, including those with identical field values.
5. WHEN no Transactions are stored, THE Transaction_List SHALL display an empty-state message indicating there are no transactions yet.

---

### Requirement 3: Total Balance

**User Story:** As a user, I want to see my total spending at a glance, so that I always know how much I have tracked.

#### Acceptance Criteria

1. THE App SHALL display the Balance in a dedicated element above the Transaction_List and Chart, calculated as the sum of all Transaction amounts, formatted to 2 decimal places with no currency symbol.
2. WHEN a Transaction is added or deleted, THE App SHALL recalculate and update the displayed Balance within 100 milliseconds.
3. WHEN no Transactions are stored, THE App SHALL display a Balance of "0.00".

---

### Requirement 4: Category Pie Chart

**User Story:** As a user, I want to see a visual breakdown of my spending by category, so that I can understand where my money goes.

#### Acceptance Criteria

1. THE Chart SHALL display a pie chart where each slice represents a Category's share of the total Balance, calculated as (sum of that Category's Transaction amounts) / (sum of all Transaction amounts), expressed as a proportion.
2. THE Chart SHALL use the Chart.js library loaded via CDN for rendering.
3. WHEN a Transaction is added or deleted, THE Chart SHALL update automatically to reflect the current Category distribution within 100 milliseconds.
4. WHEN only one Category has Transactions, THE Chart SHALL display a full circle for that Category.
5. WHEN no Transactions are stored, THE Chart SHALL display the canvas element with a visible text label stating that no data is available, and no pie segments shall be rendered.
6. THE Chart SHALL exclude any Category whose total Transaction amount is zero (i.e., all its Transactions have been deleted) from the pie chart rendering.

---

### Requirement 5: Data Persistence

**User Story:** As a user, I want my transactions to be saved between sessions, so that I do not lose my data when I close or refresh the browser.

#### Acceptance Criteria

1. THE App SHALL store all Transactions in Local_Storage as a serialized JSON array under a defined key.
2. WHEN the App initializes and a valid Transaction array exists in Local_Storage, THE App SHALL read all Transactions from Local_Storage and render them in the Transaction_List, Balance, and Chart. WHEN the App initializes and no Local_Storage key exists (first launch), THE App SHALL treat the Transaction array as empty and render accordingly.
3. WHEN a Transaction is added or deleted, THE App SHALL write the updated Transaction array to Local_Storage before updating the UI.
4. THE App SHALL ensure that for any valid Transaction array, serializing to JSON and then deserializing from JSON produces an array with the same count, same insertion order, and identical field values for every Transaction.
5. IF writing to Local_Storage fails (e.g., storage quota exceeded), THE App SHALL display an error message indicating the save failed and SHALL NOT update the UI to reflect the unsaved change.
6. WHEN the App initializes and Local_Storage contains a value for the Transaction key that cannot be parsed as a valid JSON array, THE App SHALL discard the corrupt data, initialize with an empty Transaction array, and display a non-blocking warning to the user.

---

### Requirement 6: Technical Constraints

**User Story:** As a developer, I want the app to follow a defined technology stack and file structure, so that the codebase remains simple and maintainable.

#### Acceptance Criteria

1. THE App SHALL be implemented using only HTML, CSS, and vanilla JavaScript with no front-end frameworks.
2. THE App SHALL contain exactly one CSS file located at `css/style.css`.
3. THE App SHALL contain exactly one JavaScript file located at `js/app.js`.
4. THE App SHALL require no backend server and SHALL be fully functional when opened as a local HTML file in a browser.
5. THE App SHALL function correctly in the latest stable release of Chrome, Firefox, Edge, and Safari available at the time of testing, such that all features render and operate without JavaScript errors, broken layout, or missing functionality.

---

### Requirement 7: Performance and Visual Design

**User Story:** As a user, I want the app to load quickly and look clean, so that I can use it comfortably without friction.

#### Acceptance Criteria

1. THE App SHALL render its initial state (all four UI components — Input_Form, Balance, Transaction_List, and Chart — fully rendered and interactive) within 2 seconds on a connection of at least 10 Mbps (excluding CDN asset load time).
2. WHEN the user adds or deletes a Transaction, THE App SHALL update all UI components (Balance, Transaction_List, Chart) within 100 milliseconds.
3. THE App SHALL use a clear visual hierarchy with distinct sections for the Input_Form, Balance, Transaction_List, and Chart, separated by at least 16px of whitespace or a visible divider between each section.
4. THE App SHALL use readable typography with a base font size of at least 14px and a contrast ratio of at least 4.5:1 between text and its background color.

---

## Bonus Features (Selected: Custom Categories, Dark/Light Mode Toggle, Monthly Summary View)

> **Note:** Three bonus features have been selected for implementation. Unselected features (Sort Transactions, Spending Limit Highlight) are excluded from design and task phases.

---

### Bonus A: Custom Categories

**User Story:** As a user, I want to create my own spending categories, so that I can tailor the app to my personal budget structure.

#### Acceptance Criteria

1. THE Input_Form SHALL provide a dedicated text input control for the user to add a new Category name.
2. WHEN the user submits a non-empty Category name (after trimming whitespace) that does not already exist (case-insensitive comparison), THE App SHALL add it to the Category list in Local_Storage and make it immediately available in the Category select field.
3. WHEN the user submits an empty Category name or a Category name that already exists (case-insensitive), THE Input_Form SHALL display a validation error and SHALL NOT add the Category.
4. THE App SHALL preserve all custom Category names across browser sessions by storing them in Local_Storage.
5. WHEN the App initializes, THE App SHALL load all custom Category names from Local_Storage and add them to the Category select field alongside the default categories.

---

### Bonus B: Monthly Summary View

**User Story:** As a user, I want to view a summary of my spending for a specific month, so that I can track my budget over time.

#### Acceptance Criteria

1. THE App SHALL provide a month/year selector control populated only with months for which at least one Transaction exists.
2. WHEN the user selects a month and year, THE App SHALL filter the Transaction_List to show only Transactions whose recorded timestamp falls within that calendar month.
3. WHEN the monthly filter is active, THE Balance and Chart SHALL reflect only the filtered Transactions, where Balance equals the sum of the filtered Transaction amounts.
4. WHEN the user clears the monthly filter, THE App SHALL revert the Transaction_List, Balance, and Chart to show all Transactions.
5. WHEN the monthly filter is active and no Transactions exist for the selected month, THE Transaction_List SHALL display an empty-state message, the Balance SHALL display "0.00", and the Chart SHALL display its no-data placeholder state.



### Bonus E: Dark/Light Mode Toggle

**User Story:** As a user, I want to switch between dark and light themes, so that I can use the app comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE App SHALL provide a toggle control to switch between dark mode and light mode, with the control visually indicating the currently active theme (e.g., distinct icon or label per mode).
2. WHEN the user activates the theme toggle, THE App SHALL apply the selected theme to all UI components (Input_Form, Balance, Transaction_List, Chart) within 100 milliseconds.
3. THE App SHALL persist the user's theme preference ("dark" or "light") in Local_Storage.
4. WHEN the App initializes, THE App SHALL apply the theme stored in Local_Storage if its value is "dark" or "light"; otherwise (absent, null, or any other value), THE App SHALL default to light mode.
