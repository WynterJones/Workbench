# Wiring for `src/files/`

Paste into `src/lib.rs`. Verified locally by temporarily wiring this in,
running `cargo check --lib` and `cargo test --lib` (22/22 passing, zero
warnings from `files::*`), then reverting `lib.rs` back to its original
content before handing off.

## 1. Module declaration

```rust
mod files;
```

Add alongside the other `mod` lines at the top of `lib.rs`.

## 2. Import

```rust
use files::WatcherState;
```

## 3. Managed state

Inside the `.setup(|app| { ... })` closure, alongside the existing
`app.manage(DbState(...))`:

```rust
app.manage(WatcherState::default());
```

`files` reads scan roots and the user's home directory itself (via
`fs_ops::allowed_roots`, called from `DbState` inside each command) — no
other managed state is needed.

## 4. `invoke_handler` entries

Add these to the `tauri::generate_handler![...]` list:

```rust
files::fs_list_dir,
files::fs_create_dir,
files::fs_create_file,
files::fs_rename,
files::fs_move_entries,
files::fs_copy_entries,
files::fs_trash_entries,
files::fs_get_info,
files::fs_watch_directory,
files::fs_unwatch_directory,
files::fs_list_starters,
files::fs_save_starter,
files::fs_delete_starter,
files::fs_save_folder_as_starter,
files::fs_file_templates,
files::fs_create_from_template,
files::fs_scaffold_starter,
files::fs_build_context,
```

All command names are `fs_`-prefixed deliberately, to avoid colliding with
generic names other modules might use (`rename`, `get_info`, etc.).

## Events emitted (frontend should listen with `@tauri-apps/api/event`)

- `fs:changed` — payload is the watched directory path (`string`). Emitted
  by the debounced `notify` watcher in `watch.rs`, ~150ms after the last
  filesystem event in the active directory.
- `scaffold:progress` — payload is one line of stdout/stderr (`string`),
  emitted live while `fs_scaffold_starter` runs the starter's shell command.

## Notes / things the integrator should know

- **Framework detection in `listing.rs`**: `crate::scan::detect` did not
  exist yet at the time this was written (no `scan/` directory present).
  `listing.rs::detect_framework_cheap` (marked `pub(crate)`, also reused by
  `context.rs` for the "Stack:" summary line) does a cheap marker-file
  presence check (`package.json` → `node`, `Cargo.toml` → `rust`, `go.mod`
  → `go`, etc.) instead. If/when `scan::detect` lands with a real
  per-project framework detector, swap the body of that function to
  delegate to it — the call sites don't need to change.
- **`file_templates(framework)`** takes a free-form string (`"react"`,
  `"nextjs"`, `"vue"`, `"svelte"`, `"rails"`, `"go"`, `"python"`), not
  `models::Framework` — the model enum's `Vite` variant doesn't distinguish
  React/Vue/Svelte/Solid, which the template catalog needs to. The frontend
  should pass whichever finer-grained string it already knows for the
  project (or "react" as a safe default for anything Vite-based).
- **No new dependencies were needed.** Everything (`notify`, `trash`,
  `walkdir`, `ignore`, `git2`, `regex` (unused — hand-rolled validation was
  simpler than a regex for the project-name check), `chrono`, `dirs`,
  `serde`, `serde_json`, `rusqlite`) was already in `Cargo.toml`.
- `trash_entries` uses `trash::delete_all`, which sends every path to
  macOS Trash in one call — never `std::fs::remove_*`.
- `fs_ops::guard_existing` / `guard_new` are the only path-validation entry
  points; every other command in `files/` routes through them before
  touching disk.
