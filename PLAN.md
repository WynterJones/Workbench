# Workbench

Local-first prototype library + launcher. Point it at folders, hit Scan, get a visual
catalog of everything you've ever built — with screenshots, run status, and one-click actions.

**Core loop:** Scan → Identify → Run → Screenshot → Browse → Decide → Act

**v1 success test:** open the app and visually browse 100+ things you previously built
without remembering a single folder name.

---

## Stack (decided)

| Layer | Choice | Why |
|---|---|---|
| Shell | Tauri v2 | Native FS + process spawning, small binary, Rust backend |
| Frontend | React + TypeScript + Vite | shadcn's native habitat |
| UI | shadcn/ui + Tailwind v4 | Dark-only, no theme toggle |
| DB | SQLite via `rusqlite` in Rust | Single file at `~/.workbench/workbench.db` |
| Walker | `ignore` crate (ripgrep's) | Respects .gitignore, parallel, fast |
| Git | `git2` crate | No shelling out for status/log |
| Screenshots | Headless Chrome CLI | `--headless --screenshot` — zero deps, Chrome is installed |
| State | TanStack Query + Zustand | Query for Tauri commands, Zustand for UI state |

> **Screenshot note:** skipping Playwright entirely in v1. `chrome --headless
> --window-size=1440,900 --screenshot=out.png URL` covers 95% of cases with no Node
> sidecar, no browser download, no bundle bloat. Add Playwright only when a real project
> fails to capture (needs login, needs interaction).

---

## Design system

Dark mode only. No light theme, no toggle. Professional, dense, not a toy.

```
Background      zinc-950   #09090b     app shell
Surface         zinc-900   #18181b     cards, panels
Border          zinc-800   #27272a     hairlines only, 1px
Text primary    zinc-50    #fafafa
Text muted      zinc-400   #a1a1aa
Accent          emerald-500            "runs successfully", ship score fill
Warning         amber-500              needs attention
Danger          red-500                won't run / dead
```

Rules:
- Screenshots are the hero. Cards are 16:10 image + a thin metadata strip underneath.
- Font: Inter (UI), JetBrains Mono (paths, commands, ports).
- No shadows. Separation comes from `border-zinc-800` and surface elevation.
- Radius `0.5rem` globally. No rounded-full anything except status dots.
- Motion: 150ms ease-out on hover/focus only. No page transitions.
- Every destructive/expensive action (Run, Archive) needs an explicit confirm or a trust flag.

shadcn components in play: `card`, `badge`, `button`, `input`, `command`, `dialog`,
`dropdown-menu`, `tabs`, `progress`, `scroll-area`, `skeleton`, `sonner`, `tooltip`,
`context-menu`, `separator`, `switch`.

---

## Data model

```sql
projects      id, path, name, framework, language, last_modified, git_branch,
              git_remote, git_dirty, loc, readme_summary, run_cmd, run_url,
              port, status, trusted, archived, ship_score, first_seen, last_scanned
scan_roots    id, path, enabled, last_scanned
screenshots   id, project_id, variant(desktop|mobile), file_path, captured_at
tags          id, project_id, label            -- prototype/shipped/abandoned/useful/needs-work
activity      id, project_id, kind, occurred_at, detail   -- powers the timeline
run_log       id, project_id, started_at, exit_code, stdout_tail, outcome
```

`status` enum: `unknown | runnable | running | broken | dead | shipped`

Screenshots live at `~/.workbench/shots/{project_id}-{variant}.png`, not in the DB.

---

# Phase 0 — Foundation

*Goal: an empty dark shell that opens, reads SQLite, and looks like the finished product.*

- [ ] `pnpm create tauri-app` — React + TS + Vite, name `workbench`
- [ ] Tailwind v4 + shadcn init, dark-only (`<html class="dark">`, delete light tokens)
- [ ] Drop in the palette above as CSS vars in `globals.css`
- [ ] App shell: fixed sidebar (shelves) + top bar (search, Scan button) + content area
- [ ] `rusqlite` + migrations module; DB created at `~/.workbench/workbench.db` on boot
- [ ] Tauri command boilerplate + typed TS wrapper (`src/lib/api.ts`) so every `invoke` is typed
- [ ] TanStack Query provider + `sonner` toaster mounted
- [ ] **Intro screen** — first launch only (`settings.introSeen`), 3 steps, no video, no tour:
      wordmark draw-in → one line of what this does → "pick your folders" with a folder
      picker → Scan. Animation is CSS only: staggered fade+rise, a slow scanning-line
      sweep, count-up numerals. Skippable, replayable from Settings.

**Done when:** app launches, intro plays once, dark shell renders with empty states, DB file exists on disk.

---

# Phase 1 — Scan & Detect

*Goal: point at folders, get rows in the DB. No running anything. Read-only, safe.*

- [ ] Settings screen: add/remove scan roots (`~/Code`, `~/Projects`, `/Volumes/...`)
- [ ] Walker with `ignore` crate — skip `node_modules`, `.git`, `target`, `dist`, `vendor`,
      `.next`, `Pods`, `venv`. Max depth 6. Stop descending once a project is identified.
- [ ] **Framework detector** — file-signature matching, first match wins:

  | Signal | Detected as |
  |---|---|
  | `next.config.*` | Next.js |
  | `vite.config.*` | Vite (+ React/Vue/Svelte from deps) |
  | `src-tauri/tauri.conf.json` | Tauri |
  | `Gemfile` + `config/application.rb` | Rails |
  | `manifest.json` with `manifest_version` | Chrome extension |
  | `project.godot` | Godot |
  | `go.mod` | Go |
  | `Cargo.toml` | Rust |
  | `requirements.txt` / `pyproject.toml` | Python |
  | `composer.json` / `style.css` w/ plugin header | WordPress |
  | `package.json` (fallback) | Node |
  | `index.html` (fallback) | Static |

- [ ] **Metadata extractor:** package manager (lockfile), scripts, deps-installed?, LOC
      (count by extension, skip ignored dirs), README first paragraph, `.env.example` present
- [ ] **Git detector** via `git2`: branch, remote URL, dirty flag, last commit date
- [ ] **Run inference:** `run_cmd` + likely `port` from framework defaults + scripts
      (next→3000, vite→5173, rails→3000, static→serve on ephemeral)
- [ ] Scan progress: streamed Tauri events → progress bar + live count in the top bar
- [ ] Re-scan is incremental — match on path, update in place, mark missing paths `dead`

**Done when:** one Scan turns your whole drive into rows, and re-scanning is fast.

---

# Phase 2 — Library UI

*Goal: the visual catalog. This is the phase that already changes your workflow.*

- [ ] Project card: screenshot (or framework-glyph placeholder), name, framework badge,
      relative last-modified, status dot, git-dirty indicator
- [ ] Responsive grid, `scroll-area`, virtualized past ~200 cards
- [ ] **Shelves** (sidebar sections, each a saved query):
      - Continue Building — modified < 14d
      - Forgotten Gems — has screenshot, untouched 30d+, not archived
      - Recently Discovered — `first_seen` < 7d
      - Shipped · Experiments · Needs Attention · Dead / Won't Run · All Projects
- [ ] Search: `cmd` palette style, fuzzy over name + path + framework + README
- [ ] Filters: framework, status, has-screenshot, has-git, tag
- [ ] Sort: last modified / name / ship score / recently discovered
- [ ] Context menu on card: Open in Finder, Terminal, VS Code, Cursor, Copy Path,
      Open GitHub, Archive
- [ ] Tag editor (multi-select badges, free-form)
- [ ] Empty + skeleton + error states for every list
- [ ] **Insights bar** — the numbers that make the mess legible: total projects, total LOC,
      runnable count, frameworks ranked, oldest project, "37 projects untouched for a year"
- [ ] Keyboard-first UX: `/` search, `⌘K` palette, `j/k` move, `⏎` open, `r` run, `⌘\` sidebar

**Done when:** you can browse 100+ projects and find any of them in under 5 seconds.

---

# Phase 3 — Run & Capture

*Goal: real screenshots. The killer feature. Also the dangerous one — trust model first.*

- [ ] **Trust model before any execution:**
      - Discovery never executes anything, ever
      - A project must be explicitly marked trusted (per-project, or trust a whole root)
      - First Run on an untrusted project shows a dialog with the exact command
- [ ] Process manager: spawn `run_cmd` in project cwd, capture stdout/stderr tail,
      own the process group so kill actually kills children
- [ ] Port allocation: find a free port, inject via `PORT` env; detect the real port by
      scraping the server's stdout for a URL
- [ ] Health wait: poll the URL until 200 or 45s timeout
- [ ] Failure classification → `broken` with a reason: deps not installed, missing `.env`,
      port in use, crashed on boot, timed out, no run command
- [ ] **Capture:** headless Chrome, desktop `1440x900` + mobile `390x844`, save PNGs,
      write `screenshots` rows
- [ ] Kill process, always, including on app quit (Drop impl / cleanup on exit)
- [ ] **Batch: "Scan & Refresh Library"** — queue every trusted project, 2 at a time,
      live progress, cancellable, per-project failures never abort the run
- [ ] Manual override: per-project `run_cmd` / `url` / `wait_path` fields in the UI,
      only asked for when inference failed

**Done when:** you press one button, walk away, come back to a wall of real screenshots.

---

# Phase 4 — Project Detail

*Goal: enough context to decide "do I pick this back up?" in 10 seconds.*

- [ ] Big screenshot hero, desktop/mobile toggle, click to view full size
- [ ] Header: name, stack line, days since modified, LOC, run status, GitHub link
- [ ] **Timeline** from `activity`: created → git commits → last code change → screenshot → scanned
- [ ] README render (first section only, `prose-invert`)
- [ ] Detected TODOs (grep `TODO|FIXME|HACK`, capped at 20, with file:line)
- [ ] Run log tail from the last attempt — the actual error when status is `broken`
- [ ] Action bar: `RUN` · `OPEN CODE` · `OPEN BROWSER` · `FINDER` · `TERMINAL` · `ARCHIVE`
- [ ] Editable fields: name override, tags, status, notes

**Done when:** the detail page answers "what is this and is it worth reviving?" without opening the folder.

---

# Phase 5 — Ship Score

*Goal: turn the catalog into a ranked list of what's closest to being real.*

- [ ] Signal checks, all cheap and file-based:
      runs ✓ · has README ✓ · has UI (screenshot not blank) ✓ · has auth (grep deps) ·
      has payments (stripe/paddle in deps) · has deployment (vercel.json, Dockerfile, fly.toml) ·
      has domain (CNAME, config) · recently maintained · has tests
- [ ] Weighted score 0–100, stored on the project, recomputed each scan
- [ ] `progress` bar + checklist on the detail page, score badge on the card
- [ ] "WHAT SHOULD I WORK ON?" home row — top 3 by ship score among non-shipped
- [ ] Effort estimate string from the score band ("probably one focused session from publishable")

**Done when:** the dashboard tells you what to work on and you agree with it.

---

# Phase 6 — AI Layer

*Deliberately last. The database of everything you've built is the moat, not the AI.*

- [ ] **AI provider picker** — Settings choice between **Claude Code** and **Codex**,
      per-project override. Detect which CLIs are installed, disable what isn't.
- [ ] **tmux session runner** — every AI session gets a detached tmux session named
      `wb-{project-slug}`, launched in the project cwd with the chosen CLI and a generated
      context prompt (README + recent git log + TODOs + screenshot path + detected state).
      Sessions survive Workbench quitting.
- [ ] Session list in the UI: which projects have a live tmux session, attach command
      copyable, one-click "open in terminal, attached"
- [ ] Kill / restart session from the detail page
- [ ] Embed project summaries (README + stack + file tree digest) into a local vector table
- [ ] Semantic search: "every prototype involving lead generation", "what did I build
      that I never shipped", "find code I already wrote for Stripe"
- [ ] Overlap detection — cluster similar projects, surface duplicates worth merging
- [ ] Auto-tagging + auto-summary on scan for projects with weak READMEs

**Done when:** Workbench answers questions about your own career that you can't answer yourself.

---

# Phase 7 — Files: a workspace browser for vibe coders

*Goal: not a Finder clone. Finder is a hierarchy browser that assumes you know where
things are — the wrong model for someone with 200 projects they've forgotten. Keep the
two things Finder genuinely got right, throw out the rest, and build around what you
actually do all day: find code, assemble context, start projects, hand work to an AI.*

**Library decision: build the UI, borrow the plumbing.** Evaluated SVAR React File Manager
(MIT, no drag-drop, own CSS), chonky2 (MIT, React 19 — but peer-deps MUI 6 + emotion +
styled-components), @cubone/react-file-manager (MIT, REST-shaped, own styling). Each ships
a second design system and none solve the hard part, which is native FS access. Taking
`@tauri-apps/plugin-fs` + Rust for the backend and `react-arborist` (MIT, virtualized tree)
for tree rendering. The chrome is ours, in shadcn.

## Kept from Finder

- **Column view.** The best keyboard-driven navigation model ever shipped. This is the
  default and only primary view.
- **Space for preview.** Instant, no-click inspection.
- **Type-ahead selection**, `⌘↑` parent, `⏎` rename, `⌘⌫` trash.

## Thrown out

Icon view · gallery view · tags · iCloud · sharing · "arrange by" · the toolbar full of
things you never press · delete-that-means-delete · treating `node_modules` as content.

## 7a — The browser

- [ ] Backend: `fs.rs` — list_dir, create, rename, move, copy, **trash** (macOS Trash,
      never `rm`), get_info. Paths canonicalized and guarded against escaping allowed roots.
- [ ] Live updates via the `notify` crate — `fs:changed` events, watcher swapped on navigate
- [ ] **Miller columns** — horizontally scrolling panes, virtualized, keyboard-first
      (`←→` panes, `↑↓` rows, type-ahead). Plus a flat **List** for when you want to sort.
- [ ] **Persistent preview pane** — syntax-highlighted code, images, markdown rendered,
      and for a *folder*: its detected stack, README, git status, and run state
- [ ] **Noise collapse by default** — `node_modules`, `.git`, `dist`, `target`, `.next`,
      `venv` are folded into a single dimmed "build artifacts (4)" row you can expand.
      `.gitignore`d files dim. This alone makes a repo readable.
- [ ] **Git gutter inline** — modified / untracked / staged, per row, always visible
- [ ] **Project mode** — entering a detected project switches to a curated view driven by
      its framework (routes · components · hooks · config · tests) instead of raw folders.
      One key toggles back to raw. Reuses Phase 1's detector.
- [ ] Multi-select, drag to move, `⌥`drag to copy, undo for move/rename/trash
- [ ] Breadcrumb path bar; every segment is a jump target and a drop target

## 7b — What Finder can't do

- [ ] **⌘K is the primary interface.** The browser is the fallback. One palette: jump to
      any folder across every scan root, run a starter, create a file from a template,
      add to the context cart, launch an AI session. Fuzzy, ranked by your own usage.
- [ ] **Context Cart** — the feature that justifies the whole phase. Wander anywhere,
      press `⌘⏎` to drop files into a persistent cart (visible count in the toolbar), then:
      → **Copy as prompt context** — clipboard gets a tree + fenced file contents +
        the project's stack line, .gitignore-aware, binary-skipping, budget-capped
      → **Launch Claude Code / Codex** in tmux with exactly those files pre-loaded
      Cart survives navigation and app restart. Nothing else on macOS does this.
- [ ] **Starter library** — full-screen searchable catalog, not a dialog. ~30 entries
      (TanStack Start, TanStack Router+Query, Next.js, Vite ×4, Astro, Remix, Nuxt,
      SvelteKit, Expo, Tauri, Electron, Hono, Elysia, Express, FastAPI, Django, Rails,
      Laravel, Go chi, Axum, Phoenix, shadcn dashboard, Chrome MV3, Raycast, oclif,
      clap, Python pkg, Turborepo). Each card: stack badges, one line of what it's for,
      **the exact command shown before it runs**, and your own use count.
      Registry is user-editable JSON at `~/.workbench/starters.json`. "Save this folder
      as a starter" for your own.
- [ ] **New File with intent** — New File offers boilerplate for the *detected* framework:
      component · route · hook · api handler · test · store. Correct imports, correct
      casing, correct directory. No more pasting a snippet and fixing the imports.
- [ ] **Open here in AI** — any folder, right-click → Claude Code or Codex in a tmux
      session rooted there (reuses Phase 6)
- [ ] **Disk reclaim** — size treemap plus "you have 214 `node_modules` totalling 61 GB",
      with safe bulk-trash of build artifacts across every project at once
- [ ] Folders that are projects render as project rows: framework badge, run status dot,
      ship score, and a jump into their Workbench detail page

**Done when:** you stop opening Finder, assembling AI context takes two keystrokes instead
of ten minutes of copy-paste, and starting a TanStack project is one search and one click.

---

## Cut from v1 (on purpose)

| Skipped | Add when |
|---|---|
| Playwright | headless Chrome fails on a project you care about |
| Light theme | never |
| Per-project `workbench.yml` config files | DB fields stop being enough |
| Cloud sync / multi-machine | you have a second machine you actually use |
| Auth, accounts, sharing | it becomes a product for other people |
| Docker/compose project support | you have projects that only run in Docker |
| A file-manager npm library | you decide Finder parity isn't worth hand-building |
| Cloud storage mounts in Files | you keep projects somewhere other than local disk |
| Vendored starter template files | a starter you want has no CLI and no GitHub repo |
| Windows/Linux builds | you stop being the only user |

## Build order shortcut

Phases 0→1→2 alone is the MVP and is worth shipping before touching Phase 3.
Phase 3 is where it becomes magic, Phase 5 is where it becomes a decision tool.
Phase 7 (Files) only depends on Phase 1's detector — it can be built any time after
Phase 2 and is the phase most likely to earn daily use.
