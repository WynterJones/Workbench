use std::path::Path;
use std::sync::Mutex;
use std::time::{Duration, Instant};

use chrono::{TimeZone, Utc};
use git2::Repository;
use serde::Serialize;

use crate::db;

const COMMITS_PER_REPO: usize = 400;
const CACHE_TTL: Duration = Duration::from_secs(300);

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TimelineEvent {
    pub id: String,
    pub kind: String,
    pub project_id: i64,
    pub project_name: String,
    pub framework: String,
    pub occurred_at: String,
    pub title: String,
    pub detail: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TimelinePage {
    pub events: Vec<TimelineEvent>,
    pub total: usize,
    pub next_offset: Option<usize>,
    pub oldest: Option<String>,
    pub newest: Option<String>,
    pub project_count: usize,
}

#[derive(Default)]
pub struct TimelineCache(Mutex<Option<(Instant, Vec<TimelineEvent>, usize)>>);

fn to_rfc3339(seconds: i64) -> Option<String> {
    Utc.timestamp_opt(seconds, 0).single().map(|d| d.to_rfc3339())
}

fn folder_created(path: &Path) -> Option<String> {
    let meta = std::fs::metadata(path).ok()?;
    let created = meta.created().ok()?;
    let secs = created.duration_since(std::time::UNIX_EPOCH).ok()?.as_secs();
    to_rfc3339(secs as i64)
}

fn commits_for(
    path: &Path,
    project_id: i64,
    project_name: &str,
    framework: &str,
    events: &mut Vec<TimelineEvent>,
) {
    let Ok(repo) = Repository::open(path) else {
        return;
    };
    if repo.head().is_err() {
        return;
    }
    let Ok(mut walk) = repo.revwalk() else { return };
    if walk.push_head().is_err() {
        return;
    }
    let _ = walk.set_sorting(git2::Sort::TIME);

    let mut collected = Vec::new();
    for oid in walk.take(COMMITS_PER_REPO) {
        let Ok(oid) = oid else { continue };
        let Ok(commit) = repo.find_commit(oid) else { continue };
        let Some(when) = to_rfc3339(commit.time().seconds()) else {
            continue;
        };
        collected.push(TimelineEvent {
            id: format!("commit-{oid}"),
            kind: "commit".into(),
            project_id,
            project_name: project_name.to_string(),
            framework: framework.to_string(),
            occurred_at: when,
            title: commit.summary().unwrap_or("(no message)").to_string(),
            detail: commit.author().name().map(|n| n.to_string()),
        });
    }

    if let Some(first) = collected.last_mut() {
        first.kind = "first-commit".into();
        first.detail = Some(format!("First commit · {}", first.detail.clone().unwrap_or_default()));
    }

    events.extend(collected);
}

pub fn build_events() -> Result<(Vec<TimelineEvent>, usize), String> {
    let conn = db::open()?;
    let projects = db::list_all_projects(&conn).map_err(|e| e.to_string())?;
    let project_count = projects.len();
    let mut events: Vec<TimelineEvent> = Vec::new();

    for project in projects {
        let path = Path::new(&project.path);
        let framework = project.framework.as_str().to_string();

        let created = folder_created(path).unwrap_or_else(|| project.first_seen.clone());
        events.push(TimelineEvent {
            id: format!("created-{}", project.id),
            kind: "project-created".into(),
            project_id: project.id,
            project_name: project.name.clone(),
            framework: framework.clone(),
            occurred_at: created,
            title: format!("{} created", project.name),
            detail: Some(project.path.clone()),
        });

        commits_for(path, project.id, &project.name, &framework, &mut events);
    }

    events.sort_by(|a, b| b.occurred_at.cmp(&a.occurred_at));
    Ok((events, project_count))
}

#[tauri::command]
pub async fn timeline_page(
    cache: tauri::State<'_, TimelineCache>,
    offset: Option<usize>,
    limit: Option<usize>,
    refresh: Option<bool>,
) -> Result<TimelinePage, String> {
    let offset = offset.unwrap_or(0);
    let limit = limit.unwrap_or(60).clamp(1, 300);
    let force = refresh.unwrap_or(false);

    let cached = {
        let guard = cache.0.lock().map_err(|_| "timeline cache poisoned")?;
        match guard.as_ref() {
            Some((at, events, count)) if !force && at.elapsed() < CACHE_TTL => {
                Some((events.clone(), *count))
            }
            _ => None,
        }
    };

    let (events, project_count) = match cached {
        Some(hit) => hit,
        None => {
            let built = tauri::async_runtime::spawn_blocking(build_events)
                .await
                .map_err(|e| e.to_string())??;
            let mut guard = cache.0.lock().map_err(|_| "timeline cache poisoned")?;
            *guard = Some((Instant::now(), built.0.clone(), built.1));
            built
        }
    };

    let total = events.len();
    let slice: Vec<TimelineEvent> = events.iter().skip(offset).take(limit).cloned().collect();
    let next_offset = (offset + slice.len() < total).then_some(offset + slice.len());

    Ok(TimelinePage {
        newest: events.first().map(|e| e.occurred_at.clone()),
        oldest: events.last().map(|e| e.occurred_at.clone()),
        events: slice,
        total,
        next_offset,
        project_count,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn event(id: &str, when: &str) -> TimelineEvent {
        TimelineEvent {
            id: id.into(),
            kind: "commit".into(),
            project_id: 1,
            project_name: "Demo".into(),
            framework: "node".into(),
            occurred_at: when.into(),
            title: "x".into(),
            detail: None,
        }
    }

    #[test]
    fn events_sort_newest_first() {
        let mut events = vec![
            event("a", "2024-01-01T00:00:00+00:00"),
            event("b", "2026-01-01T00:00:00+00:00"),
            event("c", "2025-01-01T00:00:00+00:00"),
        ];
        events.sort_by(|a, b| b.occurred_at.cmp(&a.occurred_at));
        let ids: Vec<&str> = events.iter().map(|e| e.id.as_str()).collect();
        assert_eq!(ids, vec!["b", "c", "a"]);
    }

    #[test]
    fn folder_created_returns_none_for_a_missing_path() {
        assert!(folder_created(Path::new("/definitely/not/here")).is_none());
    }

    #[test]
    fn folder_created_reads_a_real_directory() {
        assert!(folder_created(&std::env::temp_dir()).is_some());
    }

    #[test]
    fn commits_for_ignores_a_directory_that_is_not_a_repository() {
        let mut events = Vec::new();
        commits_for(&std::env::temp_dir(), 1, "Demo", "node", &mut events);
        assert!(events.is_empty());
    }
}
