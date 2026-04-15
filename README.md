# Flowsheets v2

A research prototype programming environment where you write expressions in named blocks and see their output update live. Blocks can reference each other by name, making it easy to build up computations incrementally while staying close to the data. See the **[10 minute demo video](https://www.youtube.com/watch?v=y1Ca5czOY7Q)** for details.

This is a Vue 3 rewrite of the original Flowsheets v2.

## Install

```bash
docker compose up --build
```

Visit http://localhost:5173.

## Getting Started

**Create a block** — double-click anywhere on the canvas. Each block gets a unique auto-generated name and a JavaScript expression editor. The output appears immediately below as you type.

**Reference other blocks** — use a block's name as an identifier in any other block's expression. If a block named `prices` holds `[10, 20, 30]`, writing `prices.map(p => p * 1.1)` in another block evaluates against it live. When `prices` changes, every block that depends on it updates automatically.

**Rename freely** — double-click a block name to rename it. All references in other blocks rewrite to match.

**Extract a sub-expression** — select any part of an expression and press `⌘⇧X` (Mac) / `Ctrl+Shift+X` (Windows/Linux) to pull it out into its own block, replacing the selection with the new block's name.

**Visualizations** — by default, arrays render as a scrollable list and other values as text. Click the chart icon on a block to switch to HTML (rendered in a sandboxed iframe), JSON (pretty-printed), text diff (line-level diff against another block), or a custom JS component authored in the sidebar.

**Persistence** — the sheet auto-saves to browser storage. Use *Save As* in the top bar to export a `.flowsheet.json` file, and *Open* to import one.

## Development

```bash
# Start (after initial build)
docker compose up

# Run unit/integration tests
docker exec flowsheets npx vitest run

# Run E2E tests (from the host, not Docker — needs a browser)
npx playwright test

# Install packages
docker exec flowsheets npm install <package>
```

> **Note:** Playwright runs on the host against the container's exposed port (5173). The container's Alpine image has no browser environment. Run `npx playwright install` on the host if browser binaries are missing.
