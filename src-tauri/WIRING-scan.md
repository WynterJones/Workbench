# Scan module wiring

`scan/` and `score.rs` are self-contained and compile against `crate::db` and
`crate::models` as they exist right now. They were verified with a temporary
`mod scan; mod score;` in `lib.rs` (compiled clean, `cargo test --lib` = 38
passed), then that edit was reverted — this file owns wiring `lib.rs` from here.

## `mod` lines

Add near the top of `src-tauri/src/lib.rs`, alongside the existing `mod` lines:

```rust
mod scan;
mod score;
```

## `invoke_handler` entries

Add these three inside the existing `tauri::generate_handler![...]` list:

```rust
scan::start_scan,
scan::ship_score,
scan::project_todos,
```

## Notes for the integrator

- `scan::start_scan(app: AppHandle, roots: Vec<String>) -> Result<(), String>`
  opens its own `db::open()` connection internally (does not use `DbState`),
  runs the walk on a blocking thread via `tauri::async_runtime::spawn_blocking`,
  and emits `scan:progress` events shaped like `models::ScanProgress`
  (`{ scanned, found, currentPath, done }`) — one per project directory visited,
  plus a final `done: true` event.
- `scan::ship_score(id: i64) -> Result<ShipScore, String>` recomputes and
  persists `ship_score` on the project, then returns it.
- `scan::project_todos(id: i64) -> Result<Vec<String>, String>` returns up to
  20 `"path:line — text"` strings for `TODO|FIXME|HACK`.
- No frontend event listener exists yet for `scan:progress` — that's on
  whoever owns the frontend scan trigger.
- `run_scan` itself (`pub fn run_scan(app: &AppHandle, roots: &[String])`) is
  exposed as a plain sync function in `scan::mod` in case anything needs to
  call it directly instead of through the async command.
