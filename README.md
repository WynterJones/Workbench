# Workbench

A local-first visual library of every project you've ever built.

Point it at `~/Code`, `~/Projects`, an external drive — whatever. Hit Scan. Workbench
walks the filesystem, identifies each project's framework, reads its git state, runs the
ones you trust, screenshots them, and turns a decade of scattered folders into a browsable
catalog with real thumbnails.

Then it tells you which ones are closest to shippable.

**Scan → Identify → Run → Screenshot → Browse → Decide → Act**

## Status

Under construction. See [PLAN.md](./PLAN.md) for phases, [CLAUDE.md](./CLAUDE.md) for conventions.

## Running it

```bash
npm install
npm run tauri dev
```

Requires Rust, Node 20+, and Google Chrome (used headless for screenshots).
`tmux` is required only for AI sessions.

## Where things live

```
src/                    React frontend
  components/ui/        shadcn, unmodified
  components/           app shell
  features/             intro, library, project, settings
  hooks/                data access
  lib/                  types, api, store, format
src-tauri/src/
  db.rs models.rs       SQLite persistence
  scan/                 walker, framework detection, git, metadata
  run/                  process manager, screenshot capture
  ai.rs                 Claude Code / Codex tmux sessions
  score.rs              ship score
```

Data lives in `~/.workbench/` — `workbench.db`, `shots/`, `prompts/`. Nothing leaves your machine.
