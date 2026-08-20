use rusqlite::{params, Connection, OptionalExtension};

use crate::models::{AiProvider, Editor, Settings, Terminal};

pub fn get_settings(conn: &Connection) -> rusqlite::Result<Settings> {
    let row = conn
        .query_row(
            "SELECT ai_provider, editor, terminal, auto_screenshot, concurrent_runs, intro_seen
             FROM settings WHERE id = 1",
            [],
            |row| {
                Ok(Settings {
                    ai_provider: AiProvider::from_str(&row.get::<_, String>(0)?),
                    editor: Editor::from_str(&row.get::<_, String>(1)?),
                    terminal: Terminal::from_str(&row.get::<_, String>(2)?),
                    auto_screenshot: row.get::<_, i64>(3)? != 0,
                    concurrent_runs: row.get(4)?,
                    intro_seen: row.get::<_, i64>(5)? != 0,
                })
            },
        )
        .optional()?;

    match row {
        Some(settings) => Ok(settings),
        None => {
            let defaults = Settings::default();
            save_settings(conn, &defaults)?;
            Ok(defaults)
        }
    }
}

pub fn save_settings(conn: &Connection, settings: &Settings) -> rusqlite::Result<Settings> {
    conn.execute(
        "INSERT INTO settings (id, ai_provider, editor, terminal, auto_screenshot, concurrent_runs, intro_seen)
         VALUES (1, ?1, ?2, ?3, ?4, ?5, ?6)
         ON CONFLICT(id) DO UPDATE SET
            ai_provider = excluded.ai_provider,
            editor = excluded.editor,
            terminal = excluded.terminal,
            auto_screenshot = excluded.auto_screenshot,
            concurrent_runs = excluded.concurrent_runs,
            intro_seen = excluded.intro_seen",
        params![
            settings.ai_provider.as_str(),
            settings.editor.as_str(),
            settings.terminal.as_str(),
            settings.auto_screenshot as i64,
            settings.concurrent_runs,
            settings.intro_seen as i64,
        ],
    )?;
    Ok(settings.clone())
}
