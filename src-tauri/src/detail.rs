use std::fs;
use std::path::{Path, PathBuf};

use chrono::{DateTime, TimeZone, Utc};
use git2::Repository;
use serde::Serialize;

use crate::db;

const README_CANDIDATES: [&str; 6] = [
    "README.md",
    "readme.md",
    "Readme.md",
    "README.markdown",
    "README.txt",
    "README",
];
const MAX_README_BYTES: u64 = 200 * 1024;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Commit {
    pub sha: String,
    pub short_sha: String,
    pub summary: String,
    pub author: String,
    pub email: String,
    pub committed_at: String,
    pub files_changed: usize,
    pub insertions: usize,
    pub deletions: usize,
}

fn find_readme(dir: &Path) -> Option<PathBuf> {
    README_CANDIDATES
        .iter()
        .map(|name| dir.join(name))
        .find(|path| path.is_file())
}

#[tauri::command]
pub fn project_readme(project_id: i64) -> Result<Option<String>, String> {
    let conn = db::open()?;
    let project = db::get_project(&conn, project_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("project {project_id} not found"))?;

    let Some(path) = find_readme(Path::new(&project.path)) else {
        return Ok(None);
    };

    let meta = fs::metadata(&path).map_err(|e| e.to_string())?;
    if meta.len() > MAX_README_BYTES {
        return Err("README is too large to display".into());
    }

    fs::read_to_string(&path).map(Some).map_err(|e| e.to_string())
}

fn to_rfc3339(seconds: i64) -> String {
    Utc.timestamp_opt(seconds, 0)
        .single()
        .unwrap_or_else(|| DateTime::<Utc>::from_timestamp(0, 0).unwrap())
        .to_rfc3339()
}

pub fn read_commits(dir: &Path, limit: usize) -> Result<Vec<Commit>, String> {
    let repo = Repository::discover(dir).map_err(|_| "not a git repository".to_string())?;

    if repo.head().is_err() {
        return Ok(Vec::new());
    }

    let mut walk = repo.revwalk().map_err(|e| e.to_string())?;
    walk.push_head().map_err(|e| e.to_string())?;
    walk.set_sorting(git2::Sort::TIME).map_err(|e| e.to_string())?;

    let mut commits = Vec::new();
    for oid in walk.take(limit) {
        let Ok(oid) = oid else { continue };
        let Ok(commit) = repo.find_commit(oid) else { continue };

        let (files_changed, insertions, deletions) = commit
            .parent(0)
            .ok()
            .and_then(|parent| {
                let parent_tree = parent.tree().ok()?;
                let tree = commit.tree().ok()?;
                let diff = repo
                    .diff_tree_to_tree(Some(&parent_tree), Some(&tree), None)
                    .ok()?;
                let stats = diff.stats().ok()?;
                Some((stats.files_changed(), stats.insertions(), stats.deletions()))
            })
            .unwrap_or((0, 0, 0));

        let author = commit.author();
        let sha = oid.to_string();
        commits.push(Commit {
            short_sha: sha.chars().take(7).collect(),
            sha,
            summary: commit.summary().unwrap_or("(no message)").to_string(),
            author: author.name().unwrap_or("unknown").to_string(),
            email: author.email().unwrap_or("").to_string(),
            committed_at: to_rfc3339(commit.time().seconds()),
            files_changed,
            insertions,
            deletions,
        });
    }

    Ok(commits)
}

#[tauri::command]
pub fn project_commits(project_id: i64, limit: Option<usize>) -> Result<Vec<Commit>, String> {
    let conn = db::open()?;
    let project = db::get_project(&conn, project_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("project {project_id} not found"))?;

    read_commits(Path::new(&project.path), limit.unwrap_or(50))
}

#[tauri::command]
pub fn init_repository(project_id: i64) -> Result<String, String> {
    let conn = db::open()?;
    let project = db::get_project(&conn, project_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("project {project_id} not found"))?;

    let path = Path::new(&project.path);
    if !path.is_dir() {
        return Err(format!("{} no longer exists", project.path));
    }
    if Repository::open(path).is_ok() {
        return Ok(project.path);
    }

    Repository::init(path).map_err(|e| e.to_string())?;
    Ok(project.path)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn finds_readme_case_insensitively() {
        let dir = std::env::temp_dir().join("wb_detail_readme");
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        assert!(find_readme(&dir).is_none());

        fs::write(dir.join("readme.md"), "# hi").unwrap();
        let found = find_readme(&dir).expect("readme should be found");
        assert!(found.is_file());
        assert_eq!(fs::read_to_string(&found).unwrap(), "# hi");
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn empty_repository_returns_no_commits_rather_than_an_error() {
        let dir = std::env::temp_dir().join("wb_detail_unborn");
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        git2::Repository::init(&dir).unwrap();

        let result = read_commits(&dir, 10);
        assert!(result.is_ok(), "an unborn HEAD is still a git repository");
        assert!(result.unwrap().is_empty());
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn commits_error_outside_a_repository() {
        let dir = std::env::temp_dir().join("wb_detail_norepo");
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        assert!(read_commits(&dir, 10).is_err());
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn init_is_a_no_op_on_an_existing_repository() {
        let dir = std::env::temp_dir().join("wb_detail_reinit");
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        git2::Repository::init(&dir).unwrap();

        let before = fs::metadata(dir.join(".git")).unwrap().len();
        assert!(git2::Repository::open(&dir).is_ok());
        let after = fs::metadata(dir.join(".git")).unwrap().len();
        assert_eq!(before, after);
        let _ = fs::remove_dir_all(&dir);
    }
}
