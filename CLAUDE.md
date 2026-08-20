# Workbench

Local-first prototype library + launcher. Tauri v2 desktop app that scans folders,
detects projects, runs them, screenshots them, and turns a messy filesystem into a
visual catalog. See `PLAN.md` for phases and scope.

## Stack

- **Shell:** Tauri v2 (Rust backend, `src-tauri/`)
- **Frontend:** React 19 + TypeScript + Vite (`src/`)
- **UI:** shadcn/ui + Tailwind v4 — **dark mode only**
- **DB:** SQLite via `rusqlite` at `~/.workbench/workbench.db`
- **Data fetching:** TanStack Query wrapping typed `invoke` calls
- **Package manager:** npm

## Rules

### No code comments

Write code that does not need them. No inline comments, no block comments, no JSDoc,
no section dividers, no `// TODO` left behind. Names and structure carry the meaning.

Two exceptions only:
- A `ponytail:` comment marking a deliberate shortcut with a known ceiling
- A one-line note where the code is non-obvious *because the outside world is weird*
  (a Chrome CLI flag that must come first, a macOS path quirk)

If you feel the urge to explain a block, extract it into a named function instead.

### Everything is a component

- One component per file, named the same as the file (`ProjectCard.tsx` → `ProjectCard`).
- A file over ~150 lines is a smell — split it.
- No inline sub-components defined inside another component's file.
- Page files compose components; they contain no layout primitives, no `map` bodies
  with 30 lines of JSX, no business logic.
- Data lives in hooks (`useProjects`, `useScan`), never fetched inside a presentational
  component. Presentational components take props and render.
- Shared bits go in `src/components/ui` (shadcn, untouched) or `src/components/` (ours).

### Tests: core only

Test the logic that would silently ruin the catalog if it broke. Do not test glue.

**Test these:**
- Framework detection (given a file set → correct framework)
- Run-command and port inference
- Ship score computation
- SQLite migrations and upsert-on-rescan (existing project updated, not duplicated)
- Path/ignore rules in the walker
- Process cleanup (spawned children actually die)

**Do not test:**
- React components, rendering, or props
- Tauri command wiring
- shadcn/ui
- Anything that is one call to a library

Rust: `#[cfg(test)]` inline in the module under test.
TS: `*.test.ts` next to the file, Vitest, no mocks-of-mocks, no fixtures directory.

### Style

- Dark only. No light tokens, no theme toggle, no `dark:` prefixes — the dark values
  ARE the values.
- Palette, radius, motion rules: see `PLAN.md` → Design system. Do not invent colors;
  use the CSS vars.
- shadcn components come from the CLI unmodified. Restyle by composition, not by
  editing `components/ui/*`.
- Tailwind classes only. No CSS modules, no styled-components, no inline `style`
  except for genuinely dynamic values (a progress width).

### Backend

- Every Tauri command returns `Result<T, String>`; errors surface as toasts, never panic
  the app.
- Discovery never executes project code. Execution requires an explicit trust flag.
- Long operations stream progress via Tauri events, not polling.
- Keep Rust modules small and single-purpose: `db`, `scan/walker`, `scan/detect`,
  `scan/git`, `run/process`, `run/capture`.

## Commands

```bash
npm run dev          # Vite only
npm run tauri dev    # full app
npm run tauri build  # release binary
npm test             # vitest
cargo test           # in src-tauri/
```
