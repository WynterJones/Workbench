use std::fs;
use std::path::{Path, PathBuf};

use serde::Serialize;

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SkillEntry {
    pub id: String,
    pub name: String,
    pub description: String,
    pub agent: String,
    pub scope: String,
    pub path: String,
    pub enabled: bool,
    pub has_scripts: bool,
    pub has_references: bool,
    pub file_count: usize,
    pub size_bytes: u64,
    pub modified: Option<String>,
    pub allowed_tools: Vec<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillDetail {
    pub entry: SkillEntry,
    pub markdown: String,
    pub files: Vec<SkillFile>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillFile {
    pub path: String,
    pub size_bytes: u64,
}

fn skill_roots() -> Vec<(PathBuf, String)> {
    let home = dirs::home_dir().unwrap_or_default();
    vec![
        (home.join(".claude/skills"), "claude-code".to_string()),
        (home.join(".codex/skills"), "codex".to_string()),
    ]
}

fn allowed_bases() -> Vec<PathBuf> {
    let home = dirs::home_dir().unwrap_or_default();
    vec![home.join(".claude"), home.join(".codex")]
}

pub fn guard(path: &str) -> Result<PathBuf, String> {
    let resolved = Path::new(path)
        .canonicalize()
        .map_err(|_| format!("path does not exist: {path}"))?;
    let bases = allowed_bases();
    let permitted = bases.iter().any(|base| {
        base.canonicalize()
            .map(|b| resolved.starts_with(b))
            .unwrap_or(false)
    });
    if permitted {
        Ok(resolved)
    } else {
        Err("path is outside the Claude and Codex skill directories".into())
    }
}

pub fn valid_package(pkg: &str) -> bool {
    if let Some(rest) = pkg.strip_prefix("https://github.com/") {
        return !rest.is_empty()
            && rest
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || "._-/".contains(c));
    }
    let mut parts = pkg.split('/');
    let (Some(owner), Some(repo), None) = (parts.next(), parts.next(), parts.next()) else {
        return false;
    };
    let ok = |s: &str| {
        !s.is_empty()
            && s.chars()
                .all(|c| c.is_ascii_alphanumeric() || "._-".contains(c))
    };
    ok(owner) && ok(repo)
}

fn parse_frontmatter(markdown: &str) -> (Option<String>, Option<String>, Vec<String>) {
    let mut name = None;
    let mut description = None;
    let mut tools = Vec::new();

    let mut lines = markdown.lines();
    if lines.next().map(str::trim) != Some("---") {
        return (name, description, tools);
    }

    for line in lines {
        let trimmed = line.trim();
        if trimmed == "---" {
            break;
        }
        let Some((key, value)) = trimmed.split_once(':') else {
            continue;
        };
        let value = value.trim().trim_matches('"').trim_matches('\'').to_string();
        match key.trim() {
            "name" => name = Some(value),
            "description" => description = Some(value),
            "allowed-tools" | "allowed_tools" => {
                tools = value
                    .trim_start_matches('[')
                    .trim_end_matches(']')
                    .split(',')
                    .map(|t| t.trim().trim_matches('"').to_string())
                    .filter(|t| !t.is_empty())
                    .collect();
            }
            _ => {}
        }
    }

    (name, description, tools)
}

fn directory_stats(dir: &Path) -> (usize, u64, bool, bool) {
    let mut count = 0;
    let mut size = 0;
    let mut has_scripts = false;
    let mut has_references = false;

    for entry in walkdir::WalkDir::new(dir).max_depth(4).into_iter().flatten() {
        let name = entry.file_name().to_string_lossy().to_string();
        if entry.file_type().is_dir() {
            if name == "scripts" {
                has_scripts = true;
            }
            if name == "references" {
                has_references = true;
            }
            continue;
        }
        count += 1;
        if let Ok(meta) = entry.metadata() {
            size += meta.len();
        }
    }

    (count, size, has_scripts, has_references)
}

fn read_skill_dir(dir: &Path, agent: &str, scope: &str) -> Option<SkillEntry> {
    let raw_name = dir.file_name()?.to_string_lossy().to_string();
    let enabled = !raw_name.ends_with(".disabled");
    let clean_name = raw_name.trim_end_matches(".disabled").to_string();

    let markdown = fs::read_to_string(dir.join("SKILL.md")).unwrap_or_default();
    let (name, description, allowed_tools) = parse_frontmatter(&markdown);
    let (file_count, size_bytes, has_scripts, has_references) = directory_stats(dir);

    let modified = fs::metadata(dir)
        .ok()
        .and_then(|m| m.modified().ok())
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| {
            chrono::DateTime::from_timestamp(d.as_secs() as i64, 0)
                .unwrap_or_default()
                .to_rfc3339()
        });

    Some(SkillEntry {
        id: format!("{agent}:{clean_name}"),
        name: name.unwrap_or_else(|| clean_name.clone()),
        description: description.unwrap_or_default(),
        agent: agent.to_string(),
        scope: scope.to_string(),
        path: dir.to_string_lossy().to_string(),
        enabled,
        has_scripts,
        has_references,
        file_count,
        size_bytes,
        modified,
        allowed_tools,
    })
}

#[tauri::command]
pub fn list_skills() -> Result<Vec<SkillEntry>, String> {
    let mut entries = Vec::new();

    for (root, agent) in skill_roots() {
        let Ok(read_dir) = fs::read_dir(&root) else {
            continue;
        };
        for item in read_dir.flatten() {
            if item.path().is_dir() {
                if let Some(entry) = read_skill_dir(&item.path(), &agent, "global") {
                    entries.push(entry);
                }
            }
        }
    }

    entries.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(entries)
}

#[tauri::command]
pub fn read_skill(path: String) -> Result<SkillDetail, String> {
    let dir = guard(&path)?;
    let agent = if dir.to_string_lossy().contains("/.codex/") {
        "codex"
    } else {
        "claude-code"
    };
    let entry = read_skill_dir(&dir, agent, "global").ok_or("could not read skill")?;
    let markdown = fs::read_to_string(dir.join("SKILL.md")).unwrap_or_default();

    let mut files = Vec::new();
    for item in walkdir::WalkDir::new(&dir).max_depth(4).into_iter().flatten() {
        if item.file_type().is_file() {
            let rel = item
                .path()
                .strip_prefix(&dir)
                .unwrap_or(item.path())
                .to_string_lossy()
                .to_string();
            files.push(SkillFile {
                path: rel,
                size_bytes: item.metadata().map(|m| m.len()).unwrap_or(0),
            });
        }
    }
    files.sort_by(|a, b| a.path.cmp(&b.path));

    Ok(SkillDetail { entry, markdown, files })
}

#[tauri::command]
pub fn toggle_skill(path: String, enabled: bool) -> Result<String, String> {
    let dir = guard(&path)?;
    let name = dir
        .file_name()
        .ok_or("invalid skill path")?
        .to_string_lossy()
        .to_string();
    let parent = dir.parent().ok_or("invalid skill path")?;

    let target = if enabled {
        parent.join(name.trim_end_matches(".disabled"))
    } else if name.ends_with(".disabled") {
        return Ok(dir.to_string_lossy().to_string());
    } else {
        parent.join(format!("{name}.disabled"))
    };

    fs::rename(&dir, &target).map_err(|e| e.to_string())?;
    Ok(target.to_string_lossy().to_string())
}

#[tauri::command]
pub fn install_skill(pkg: String, agents: Vec<String>) -> Result<String, String> {
    if !valid_package(&pkg) {
        return Err("Package must look like owner/repo or a github.com URL".into());
    }
    let agent_arg = if agents.is_empty() {
        "*".to_string()
    } else {
        agents.join(",")
    };

    let output = std::process::Command::new("npx")
        .args(["-y", "skills@latest", "add", &pkg, "-g", "-y", "-a", &agent_arg])
        .output()
        .map_err(|e| format!("could not run npx: {e}"))?;

    let combined = format!(
        "{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );

    if output.status.success() {
        Ok(combined)
    } else {
        Err(combined)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_frontmatter_fields() {
        let md = "---\nname: my-skill\ndescription: Does a thing\nallowed-tools: Read, Bash\n---\n\n# Body";
        let (name, description, tools) = parse_frontmatter(md);
        assert_eq!(name.unwrap(), "my-skill");
        assert_eq!(description.unwrap(), "Does a thing");
        assert_eq!(tools, vec!["Read", "Bash"]);
    }

    #[test]
    fn tolerates_missing_frontmatter() {
        let (name, description, tools) = parse_frontmatter("# Just a heading\n");
        assert!(name.is_none() && description.is_none() && tools.is_empty());
    }

    #[test]
    fn rejects_package_names_with_shell_metacharacters() {
        assert!(valid_package("vercel-labs/agent-skills"));
        assert!(valid_package("https://github.com/vercel-labs/agent-skills"));
        assert!(!valid_package("owner/repo; rm -rf /"));
        assert!(!valid_package("owner/repo`whoami`"));
        assert!(!valid_package("owner/repo$(id)"));
        assert!(!valid_package("owner repo"));
        assert!(!valid_package("justonepart"));
        assert!(!valid_package("a/b/c"));
    }

    #[test]
    fn guard_rejects_paths_outside_skill_directories() {
        assert!(guard("/etc").is_err());
        assert!(guard("/tmp").is_err());
    }
}
