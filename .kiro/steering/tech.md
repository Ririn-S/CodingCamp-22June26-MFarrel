# Tech Stack

## Core
- **Vanilla HTML5 / CSS3 / JavaScript (ES2020+)** — no build tools, no bundler, no framework
- **Chart.js** — loaded via CDN (`cdn.jsdelivr.net/npm/chart.js`), used for the pie chart
- **localStorage** — sole persistence layer; no backend or database

## Browser APIs Used
- `localStorage` for state persistence
- `crypto.randomUUID()` for transaction IDs
- `DOMContentLoaded` for app bootstrap

## No Build System
There is no `package.json`, bundler, or transpiler. Files are served directly as static assets. Open `index.html` in a browser to run the app — no install step required.

## Common Commands
| Task | Command |
|------|---------|
| Run app | Open `index.html` directly in a browser |
| No build step | N/A |
| No test runner | N/A |

## Code Style
- ES2020+ syntax (arrow functions, `const`/`let`, template literals, optional chaining)
- No semicolon omission — semicolons are used consistently
- `crypto.randomUUID()` for generating unique IDs
- All functions are documented with JSDoc comments including `@param`, `@returns`, and a `Requirements:` reference tag
- Constants use `SCREAMING_SNAKE_CASE`; state object uses a single `state` module-level object
- CSS uses custom properties (`--var-name`) for all design tokens; no inline styles in JS

## Accessibility
- WCAG contrast ratios ≥ 4.5:1 enforced via CSS custom properties for both light and dark themes
- `aria-label` and `aria-live` attributes used on interactive and dynamic elements
- Semantic HTML (`<header>`, `<main>`, `<section>`, `<form>`, `<label>`)
