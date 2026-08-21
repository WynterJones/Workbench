use std::collections::HashMap;
use std::path::Path;
use std::process::Command;

use chrono::{Duration, NaiveDate, TimeZone, Utc};
use git2::Repository;
use serde::Serialize;

use crate::db;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HeatmapDay {
    pub date: String,
    pub count: u32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Heatmap {
    pub days: Vec<HeatmapDay>,
    pub total: u32,
    pub identities: Vec<String>,
    pub repos_scanned: usize,
    pub busiest_day: Option<String>,
    pub current_streak: u32,
    pub longest_streak: u32,
}

fn git_identities() -> Vec<String> {
    let mut identities = Vec::new();
    for key in ["user.email", "github.user"] {
        if let Ok(output) = Command::new("git")
            .args(["config", "--global", key])
            .output()
        {
            let value = String::from_utf8_lossy(&output.stdout)
                .trim()
                .to_lowercase();
            if !value.is_empty() {
                identities.push(value);
            }
        }
    }
    identities
}

fn collect_repo(
    path: &Path,
    since: i64,
    identities: &[String],
    counts: &mut HashMap<NaiveDate, u32>,
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

    for oid in walk.take(5000) {
        let Ok(oid) = oid else { continue };
        let Ok(commit) = repo.find_commit(oid) else {
            continue;
        };
        let seconds = commit.time().seconds();
        if seconds < since {
            break;
        }
        if !identities.is_empty() {
            let email = commit.author().email().unwrap_or_default().to_lowercase();
            if !identities.iter().any(|id| id == &email) {
                continue;
            }
        }
        if let Some(dt) = Utc.timestamp_opt(seconds, 0).single() {
            *counts.entry(dt.date_naive()).or_insert(0) += 1;
        }
    }
}

pub fn build(days_back: i64, repos: &[String], identities: &[String]) -> Heatmap {
    let today = Utc::now().date_naive();
    let start = today - Duration::days(days_back - 1);
    let since = Utc
        .from_utc_datetime(&start.and_hms_opt(0, 0, 0).unwrap())
        .timestamp();

    let mut counts: HashMap<NaiveDate, u32> = HashMap::new();
    let mut scanned = 0;
    for repo in repos {
        let path = Path::new(repo);
        if path.join(".git").is_dir() {
            scanned += 1;
            collect_repo(path, since, identities, &mut counts);
        }
    }

    let mut days = Vec::with_capacity(days_back as usize);
    let mut total = 0;
    let mut current_streak = 0;
    let mut longest_streak = 0;
    let mut running = 0;

    for offset in 0..days_back {
        let date = start + Duration::days(offset);
        let count = counts.get(&date).copied().unwrap_or(0);
        total += count;
        if count > 0 {
            running += 1;
            longest_streak = longest_streak.max(running);
        } else {
            running = 0;
        }
        days.push(HeatmapDay {
            date: date.to_string(),
            count,
        });
    }

    for day in days.iter().rev() {
        if day.count > 0 {
            current_streak += 1;
        } else {
            break;
        }
    }

    let busiest_day = days
        .iter()
        .max_by_key(|d| d.count)
        .filter(|d| d.count > 0)
        .map(|d| d.date.clone());

    Heatmap {
        days,
        total,
        identities: identities.to_vec(),
        repos_scanned: scanned,
        busiest_day,
        current_streak,
        longest_streak,
    }
}

#[tauri::command]
pub async fn contribution_heatmap(days: Option<i64>) -> Result<Heatmap, String> {
    let days_back = days.unwrap_or(365).clamp(30, 730);
    tauri::async_runtime::spawn_blocking(move || {
        let conn = db::open()?;
        let repos: Vec<String> = db::list_project_paths(&conn).map_err(|e| e.to_string())?;
        Ok(build(days_back, &repos, &git_identities()))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn returns_one_entry_per_day_in_range() {
        let heatmap = build(30, &[], &[]);
        assert_eq!(heatmap.days.len(), 30);
        assert_eq!(heatmap.total, 0);
        assert_eq!(heatmap.repos_scanned, 0);
        assert!(heatmap.busiest_day.is_none());
    }

    #[test]
    fn days_are_ordered_oldest_first_and_end_today() {
        let heatmap = build(7, &[], &[]);
        let first = heatmap.days.first().unwrap().date.clone();
        let last = heatmap.days.last().unwrap().date.clone();
        assert!(first < last);
        assert_eq!(last, Utc::now().date_naive().to_string());
    }

    #[test]
    fn ignores_paths_that_are_not_repositories() {
        let heatmap = build(30, &["/definitely/not/here".to_string()], &[]);
        assert_eq!(heatmap.repos_scanned, 0);
    }
}
