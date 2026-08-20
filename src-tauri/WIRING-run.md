# Wiring for run/, ai.rs, openers.rs

Verified against a temporary local copy of `lib.rs` — `cargo check` and
`cargo test --lib` both pass with these exact additions (31 tests total,
including this module's). `lib.rs` itself was left untouched, as instructed.

## `mod` lines

Add alongside the existing ones:

```rust
mod ai;
mod openers;
mod run;
```

`run` is a directory module (`run/mod.rs`, `run/process.rs`, `run/capture.rs`,
`run/store.rs`); no extra declarations needed beyond `mod run;`.

## Managed state

Add before `.setup(...)` (order doesn't matter relative to `.setup`, but
must be before `.invoke_handler`):

```rust
.manage(run::ProcessRegistry::default())
.manage(run::CaptureCancel::default())
```

## invoke_handler entries

Add inside the existing `tauri::generate_handler![...]` list:

```rust
run::run_project,
run::stop_project,
run::trust_project,
run::capture_all,
run::capture_cancel,
ai::build_ai_prompt,
ai::start_ai_session,
ai::list_ai_sessions,
ai::kill_ai_session,
ai::detect_ai_clis,
openers::open_in,
```

## App-exit cleanup (not yet wired — please add)

`run::kill_all_on_exit(&ProcessRegistry)` exists but nothing calls it yet.
Wire it into app exit, e.g.:

```rust
.build(tauri::generate_context!())
.expect("error while running tauri application")
.run(|app_handle, event| {
    if let tauri::RunEvent::ExitRequested { .. } = event {
        run::kill_all_on_exit(&app_handle.state::<run::ProcessRegistry>());
    }
});
```

(This replaces the current `.run(tauri::generate_context!())` call — swap
`.build(...).run(...)` for the two-step form above.)

## Design notes / assumptions

- **Trust gate**: `run_project` (and the shared `capture_all` path) calls
  `ensure_trusted(info.trusted)` before touching the filesystem or spawning
  anything, and returns `Err("project is not trusted; call trust_project
  first")` immediately if false. `trust_project(id, trusted)` is the only way
  to flip the flag. Scanning code never runs any of this — nothing in `run/`,
  `ai.rs`, or `openers.rs` executes project code except from inside
  `run_project`/`capture_all`, both gated.
- **DB access**: `run/store.rs` opens its own short-lived `rusqlite::Connection`
  per call (via `Connection::open(~/.workbench/workbench.db)`) rather than
  reusing `DbState`'s shared `Mutex<Connection>`. This is deliberate:
  `run_project` can block for up to 45s waiting on health checks, and holding
  the app-wide `DbState` mutex for that long would freeze every other DB
  command. `db.rs` already turns on WAL mode, so a second connection is safe.
  Table/column names were cross-checked against the real `db.rs` migration
  (`projects`, `screenshots`, `settings`) and match exactly.
- **capture_all concurrency**: worker pool sized to
  `settings.concurrent_runs` (min 1, capped at 8), using `std::thread::scope`
  + a shared `Mutex<VecDeque<i64>>` queue. Each worker calls `run_project`-equivalent
  logic then always kills the child before picking up the next id, so one
  project's failure/hang never blocks the batch. `capture:progress` is
  emitted per finished project with `{projectId, ok, brokenReason, remaining,
  done}` (camelCase). `capture_cancel()` sets an `AtomicBool` workers check
  between projects — in-flight projects finish, no new ones start.
- **Screenshots**: blank/solid-color captures (via `capture::is_blank_png` —
  file-size + raw-byte-diversity heuristic, no image-decoding dependency) are
  silently dropped rather than inserted as `screenshots` rows, per the "detect
  a failed capture" requirement.
- **AI sessions**: tmux session name is exactly `wb-{slug}` as specified.
  Since that name alone can't carry `project_id`/`provider` back out, a small
  sidecar JSON file at `~/.workbench/sessions.json` (`{projectId:
  {tmuxSession, provider}}`) tracks the mapping; `list_ai_sessions` prunes
  entries whose tmux session no longer exists. This file is private to
  `ai.rs` — no schema dependency on `db.rs`.
- **Prompts**: written to `~/.workbench/prompts/{id}.md`, then launched via
  `claude "$(cat '<escaped path>')"` / `codex "$(cat '<escaped path>')"` sent
  through `tmux send-keys`. `build_ai_prompt(id)` is a separate command that
  returns the same text without writing the file or touching tmux, for UI
  preview.
- **Shell safety**: process spawning and openers use `std::process::Command`
  with argument arrays (never a hand-built shell string with paths spliced
  in), so no escaping is needed there — args go straight to `execve`. The one
  place a real shell re-parses a string we build is the tmux `send-keys`
  payload (interpreted by the pane's login shell), where the prompt file path
  is explicitly single-quote shell-escaped (tested in `ai::tests`).
- **`run/process.rs`** owns the process-group lifecycle: `setsid()` via
  `pre_exec` makes the spawned pid its own process group leader, so
  `kill(-pid, SIGTERM)` (then `SIGKILL` after a 3s grace period) reaches the
  whole tree — vite/next/rails and anything they fork.
- Settings are read defensively: if the `settings` row is missing or the
  query fails for any reason, `run::store::get_settings()` / editor/terminal
  opener code falls back to `Settings::default()` rather than erroring.

## Tests

`cargo test --lib` (with the wiring above applied): 31 passed, 0 failed.
Coverage in this module: failure classification priority order, URL/port
extraction from realistic vite/next/rails stdout, log-ring capping, blank-PNG
heuristics, tmux slugification, shell-escaping of paths with spaces/quotes,
GitHub remote URL normalization (ssh/https variants), and the trust gate
rejecting an untrusted project. No test spawns a real server or Chrome.
