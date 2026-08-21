<div align="center">

<img src="docs/wordmark.png" alt="Workbench" width="440">

### A visual library of everything you have ever built.

For people who ship faster than they can name folders.

<img src="docs/screenshots/intro.png" alt="Workbench" width="820">

</div>

---

Your hard drive is a graveyard of half-finished ideas. Somewhere in there is a project
that was 80% done, one that solved a problem you're about to solve again, and three you
have completely forgotten exist.

Workbench scans your drives, identifies every project by framework, runs the ones you
trust, screenshots them, and turns a decade of scattered folders into something you can
actually browse.

**Scan → Identify → Run → Screenshot → Browse → Decide → Act**

<img src="docs/screenshots/projects.png" alt="The project library" width="100%">

## What it does

**Finds everything.** Point it at `~/Code`, `~/Projects`, an external drive — whatever.
It walks the filesystem and recognises Next.js, Vite, Tauri, Rails, Go, Rust, Python,
Chrome extensions, Godot, WordPress, and more from their signature files. It knows the
difference between a Tauri app and the Vite app inside it.

**Shows you what they look like.** For projects you explicitly trust, Workbench starts
them, waits for the server, captures desktop and mobile screenshots, then kills the
process. No more wondering what `test-app-4-final-new` was.

**Tells you what's closest to done.** A ship score built from real signals — does it run,
does it have a README, auth, payments, deployment config, tests, recent activity — with
an effort estimate.

**Remembers your whole career.** A contribution heatmap built from local git history
across every scanned repo, so private and unpushed work counts too. Token usage from your
Claude Code and Codex logs. Timelines that merge commits with scan activity.

**Browses files properly.** Cached Miller columns, folder favorites, instant previews
for code, Markdown, images, video and PDFs, git status in the gutter, and build
artifacts folded away so a repo is readable at a glance. 007 Mode recursively gathers
Markdown and PDF files into a draggable, presentation-ready dossier wall.

**Keeps the library flexible.** Switch between grid and visual list layouts, choose the
column and page count, filter by status or your own project tags, and keep those choices
between launches. Media has persistent filters, pagination, fit-to-frame previews and a
three-second safety check before removing favorites. Heart images directly from File
Finder, paste a project URL to save it instantly, or open every saved link from one list.

**Finds the videos buried in a project.** The Videos tab recursively gathers YouTube,
Vimeo, Wistia, Voomly and Loom links from project files, skips dependencies and build
output, and lays them out as playable cards with an open-in-browser fallback.

**Manages your agents.** Detects which AI coding CLIs you have installed — Claude Code,
Codex, Gemini, Cursor, Copilot, OpenCode, Crush, OpenClaw, Hermes, Pi and more — and
manages the skills installed for Claude Code and Codex, with search and install from
skills.sh built in.

**Starts the next one.** 127 verified project starters across React, Next.js, shadcn/ui,
Vue, Svelte, Astro, Python, Rust, Go, Ruby, PHP, mobile, desktop, extensions and AI.

**Runs your agents in-app.** Launch Claude Code, Codex or any installed CLI straight into
a project from an embedded terminal that floats, moves, resizes and survives navigation.
When a project won't start, hand it to an agent — it investigates, reports back a working
run command and URL, and Workbench saves them. Frameworks that can't be served headlessly
(Chrome extensions, Godot) get manual instructions instead of a dead spinner.

**Watches your live services.** Optional plugins pull Railway deployments, unresolved
Sentry issues and open GitHub pull requests into one dashboard. Pick the projects, repos
and authors you care about; tokens stay in your local database. Any Sentry issue can be
sent to a coding agent as a fully written prompt with the stack trace attached.

**Speaks MCP, both ways.** Browse every MCP server configured across your agents in one
place, and expose your own catalog as a server — `list_projects`, `get_project` and
`library_stats` — installable into Claude Code, Codex, Gemini CLI or Cursor with one
click from Settings. Servers you do not need can be hidden from Workbench without
changing another tool's configuration.

**Stays current.** Workbench checks its public GitHub releases automatically and keeps
an Update available button visible when a newer build is ready. The sidebar collapses
to an icon rail when you want more room, while keeping the current version visible in
the expanded view.

## Install

Download the latest `.dmg` from [Releases](../../releases), drag Workbench to
Applications, and open it.

Requires macOS 10.15 or later. Optional: Chrome for screenshots, git for history,
tmux for background AI sessions, Node for JavaScript projects. Workbench checks for
these on first run and tells you what each one unlocks.

## Your data stays yours

Everything lives in `~/.workbench/` — a SQLite database, screenshots, and generated
prompts. Nothing is uploaded. There is no account or telemetry. Network access is
limited to update checks plus the services and actions you choose to enable.

**Workbench never executes your project code without permission.** Scanning is strictly
read-only. Running a project requires you to approve the exact command first, and the
trust flag is per-project.

## Building from source

```bash
git clone https://github.com/WynterJones/Workbench.git
cd Workbench
npm install
npm run tauri dev
```

Requires Rust and Node 20+.

```bash
npm test          # frontend tests
cargo test        # in src-tauri/
npm run tauri build
```

## How it is built

```
src/                    React 19 + TypeScript + Tailwind v4 + shadcn/ui
  components/           app shell, shared primitives
  features/             intro, library, project, files, media, portfolio,
                        skills, models, plugins, mcp, terminal, timeline, settings
  hooks/                data access
  lib/                  types, api, store, formatting
src-tauri/src/
  db.rs models.rs       SQLite persistence
  scan/                 walker, framework detection, git, metadata
  run/                  process manager, screenshot capture
  files/                listing, path guard, starters, context
  plugins/              Railway, Sentry, GitHub pull requests
  skills.rs agents.rs   skill and agent management
  pty.rs handoff.rs     embedded terminal, agent run-fix sessions
  mcp.rs mcp_server.rs  MCP config browser, Workbench's own MCP server
  score.rs heatmap.rs   ship score, contribution graph
```

Tauri v2 with a Rust core. Dark theme only.

## License

MIT

<div align="center">
<br>
Made by <a href="https://wynter.ai">Wynter.ai</a>
</div>
