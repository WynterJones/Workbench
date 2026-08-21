use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};

const KEYCHAIN_SERVICE: &str = "com.wynter.workbench.plugins";

pub const PLUGIN_IDS: [&str; 3] = ["railway", "sentry", "github-pulls"];

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PluginState {
    pub id: String,
    pub enabled: bool,
    pub has_credential: bool,
    pub selected: Vec<String>,
}

pub fn is_known(id: &str) -> Result<(), String> {
    if PLUGIN_IDS.contains(&id) {
        Ok(())
    } else {
        Err(format!("unknown plugin {}", id))
    }
}

pub fn read_row(conn: &Connection, id: &str) -> rusqlite::Result<(bool, Vec<String>)> {
    let row = conn
        .query_row(
            "SELECT enabled, selected FROM plugins WHERE id = ?1",
            params![id],
            |row| Ok((row.get::<_, i64>(0)? != 0, row.get::<_, String>(1)?)),
        )
        .optional()?;

    Ok(match row {
        Some((enabled, selected)) => (enabled, parse_selected(&selected)),
        None => (false, Vec::new()),
    })
}

pub fn read_has_credential(conn: &Connection, id: &str) -> rusqlite::Result<bool> {
    let flag: Option<i64> = conn
        .query_row(
            "SELECT has_credential FROM plugins WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )
        .optional()?;
    Ok(flag.unwrap_or(0) != 0)
}

pub fn write_has_credential(conn: &Connection, id: &str, has: bool) -> rusqlite::Result<()> {
    conn.execute(
        "INSERT INTO plugins (id, has_credential) VALUES (?1, ?2)
         ON CONFLICT(id) DO UPDATE SET has_credential = excluded.has_credential",
        params![id, has as i64],
    )?;
    Ok(())
}

pub fn parse_selected(raw: &str) -> Vec<String> {
    serde_json::from_str(raw).unwrap_or_default()
}

pub fn write_enabled(conn: &Connection, id: &str, enabled: bool) -> rusqlite::Result<()> {
    conn.execute(
        "INSERT INTO plugins (id, enabled) VALUES (?1, ?2)
         ON CONFLICT(id) DO UPDATE SET enabled = excluded.enabled",
        params![id, enabled as i64],
    )?;
    Ok(())
}

pub fn write_selected(conn: &Connection, id: &str, selected: &[String]) -> rusqlite::Result<()> {
    let encoded = serde_json::to_string(selected).unwrap_or_else(|_| "[]".into());
    conn.execute(
        "INSERT INTO plugins (id, selected) VALUES (?1, ?2)
         ON CONFLICT(id) DO UPDATE SET selected = excluded.selected",
        params![id, encoded],
    )?;
    Ok(())
}

fn entry(id: &str) -> Result<keyring::Entry, String> {
    keyring::Entry::new(KEYCHAIN_SERVICE, id).map_err(|e| e.to_string())
}

pub fn read_credential(id: &str) -> Option<String> {
    entry(id)
        .ok()?
        .get_password()
        .ok()
        .filter(|t| !t.is_empty())
}

pub fn write_credential(id: &str, token: &str) -> Result<(), String> {
    let entry = entry(id)?;
    if token.is_empty() {
        return clear_credential(id);
    }
    entry.set_password(token).map_err(|e| e.to_string())
}

pub fn clear_credential(id: &str) -> Result<(), String> {
    match entry(id)?.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

pub fn state_for(conn: &Connection, id: &str) -> Result<PluginState, String> {
    let (enabled, selected) = read_row(conn, id).map_err(|e| e.to_string())?;
    Ok(PluginState {
        id: id.to_string(),
        enabled,
        has_credential: read_has_credential(conn, id).map_err(|e| e.to_string())?,
        selected,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::run_migrations;

    fn memory_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        run_migrations(&conn).unwrap();
        conn
    }

    #[test]
    fn unknown_plugin_is_rejected() {
        assert!(is_known("railway").is_ok());
        assert!(is_known("sentry").is_ok());
        assert!(is_known("github-pulls").is_ok());
        assert!(is_known("../../etc/passwd").is_err());
    }

    #[test]
    fn defaults_to_disabled_with_no_selection() {
        let conn = memory_db();
        let (enabled, selected) = read_row(&conn, "railway").unwrap();
        assert!(!enabled);
        assert!(selected.is_empty());
    }

    #[test]
    fn enabled_and_selected_round_trip_independently() {
        let conn = memory_db();
        write_enabled(&conn, "sentry", true).unwrap();
        write_selected(&conn, "sentry", &["acme/web".into(), "acme/api".into()]).unwrap();

        let (enabled, selected) = read_row(&conn, "sentry").unwrap();
        assert!(enabled);
        assert_eq!(
            selected,
            vec!["acme/web".to_string(), "acme/api".to_string()]
        );

        write_enabled(&conn, "sentry", false).unwrap();
        let (enabled, selected) = read_row(&conn, "sentry").unwrap();
        assert!(!enabled);
        assert_eq!(selected.len(), 2);
    }

    #[test]
    fn credential_presence_is_tracked_without_touching_the_keychain() {
        let conn = memory_db();
        assert!(!read_has_credential(&conn, "sentry").unwrap());

        write_has_credential(&conn, "sentry", true).unwrap();
        assert!(read_has_credential(&conn, "sentry").unwrap());
        assert_eq!(state_for(&conn, "sentry").unwrap().has_credential, true);

        write_selected(&conn, "sentry", &["acme/web".into()]).unwrap();
        assert!(read_has_credential(&conn, "sentry").unwrap());

        write_has_credential(&conn, "sentry", false).unwrap();
        assert!(!read_has_credential(&conn, "sentry").unwrap());
        assert_eq!(read_row(&conn, "sentry").unwrap().1.len(), 1);
    }

    #[test]
    fn corrupt_selection_degrades_to_empty() {
        assert!(parse_selected("not json").is_empty());
        assert_eq!(parse_selected(r#"["a"]"#), vec!["a".to_string()]);
    }

    #[test]
    fn state_never_serialises_the_token() {
        let state = PluginState {
            id: "railway".into(),
            enabled: true,
            has_credential: true,
            selected: vec!["proj".into()],
        };
        let encoded = serde_json::to_string(&state).unwrap();
        assert!(encoded.contains("hasCredential"));
        assert!(!encoded.contains("token"));
    }
}
