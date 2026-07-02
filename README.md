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

**Reference other blocks** — use a block's name as an identifier in any other block's expression. If a block named `prices` holds `[10, 20, 30]`, writing `prices.map(p => p * 1.1)` in another block evaluates against it live. When `prices` changes, every block that depends on it updates automatically. Type `@` while editing to pick a block name from a completion dropdown.

**Spot broken dependencies** — when a block errors it gets a red outline; every block downstream of it is dimmed and marked "blocked — upstream error," so you can see at a glance which results are still trustworthy and which are affected by the failure.

**Rename freely** — double-click a block name to rename it. All references in other blocks rewrite to match.

**Extract a sub-expression** — select any part of an expression and press `⌘⇧X` (Mac) / `Ctrl+Shift+X` (Windows/Linux) to pull it out into its own block, replacing the selection with the new block's name.

**Undo / redo** — `⌘Z` / `⌘⇧Z` (or the topbar buttons) step through your edits — block create/delete/move/rename, code changes, notes, and more. Each sheet keeps its own history.

**Add notes** — right-click empty canvas to drop a sticky note; drag it by its header and give it an optional title to annotate the sheet.

**Visualizations** — by default, arrays render as a scrollable list and other values as text. Click the chart icon on a block to switch to HTML (rendered in a sandboxed iframe), JSON (pretty-printed), text diff (line-level diff against another block), data table (arrays of objects or arrays rendered as a scrollable table), or a custom JS component authored in the sidebar.

**Work across sheets** — a workbook holds many sheets. Use the left sidebar to create, rename, and delete them, or the tab strip to switch between the ones you have open. Each sheet has its own canvas, blocks, and history.

**Persistence** — sheets auto-save to browser storage. Use the *Export* icon next to a sheet in the left sidebar to download a single `.flowsheet.json`, or *Export workbook* in the sidebar footer to save every sheet as one `.flowbundle.json`. *Import* at the top of the sidebar loads either format (a bundle prompts per-sheet on how to merge).

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
