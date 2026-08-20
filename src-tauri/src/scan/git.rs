use std::path::Path;

use git2::{Repository, StatusOptions};

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct GitInfo {
    pub branch: Option<String>,
    pub remote: Option<String>,
    pub dirty: bool,
    pub last_commit_at: Option<String>,
}

pub fn inspect(dir: &Path) -> GitInfo {
    let repo = match Repository::discover(dir) {
        Ok(repo) => repo,
        Err(_) => return GitInfo::default(),
    };

    GitInfo {
        branch: current_branch(&repo),
        remote: origin_remote_url(&repo),
        dirty: is_dirty(&repo),
        last_commit_at: last_commit_timestamp(&repo),
    }
}

fn current_branch(repo: &Repository) -> Option<String> {
    let head = repo.head().ok()?;
    if head.is_branch() {
        head.shorthand().map(|s| s.to_string())
    } else {
        None
    }
}

fn origin_remote_url(repo: &Repository) -> Option<String> {
    let remote = repo.find_remote("origin").ok()?;
    let url = remote.url()?;
    Some(normalize_remote_url(url))
}

pub fn normalize_remote_url(url: &str) -> String {
    let trimmed = url.trim();
    let https = match trimmed.strip_prefix("git@") {
        Some(rest) => match rest.split_once(':') {
            Some((host, path)) => format!("https://{host}/{path}"),
            None => trimmed.to_string(),
        },
        None => trimmed.to_string(),
    };
    https.strip_suffix(".git").map(|s| s.to_string()).unwrap_or(https)
}

fn is_dirty(repo: &Repository) -> bool {
    let mut opts = StatusOptions::new();
    opts.include_untracked(true).include_ignored(false);
    match repo.statuses(Some(&mut opts)) {
        Ok(statuses) => !statuses.is_empty(),
        Err(_) => false,
    }
}

fn last_commit_timestamp(repo: &Repository) -> Option<String> {
    let head = repo.head().ok()?;
    let commit = head.peel_to_commit().ok()?;
    let time = commit.time();
    let dt = chrono::DateTime::from_timestamp(time.seconds(), 0)?;
    Some(dt.to_rfc3339())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes_ssh_github_remote() {
        assert_eq!(
            normalize_remote_url("git@github.com:wynterjones/workbench.git"),
            "https://github.com/wynterjones/workbench"
        );
    }

    #[test]
    fn leaves_https_remote_but_strips_git_suffix() {
        assert_eq!(
            normalize_remote_url("https://github.com/wynterjones/workbench.git"),
            "https://github.com/wynterjones/workbench"
        );
    }

    #[test]
    fn missing_repo_returns_default_info() {
        let tmp = tempfile::tempdir().unwrap();
        let info = inspect(tmp.path());
        assert_eq!(info, GitInfo::default());
    }
}
