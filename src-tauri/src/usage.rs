use std::collections::HashMap;
use std::fs;
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};

use chrono::{Duration, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use walkdir::WalkDir;

#[derive(Serialize, Deserialize, Default, Clone)]
struct FileUsage {
    mtime: u64,
    size: u64,
    days: HashMap<String, DayTokens>,
}

#[derive(Serialize, Deserialize, Default, Clone, Copy)]
struct DayTokens {
    input: u64,
    output: u64,
}

#[derive(Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct AgentUsage {
    pub agent: String,
    pub label: String,
    pub total_tokens: u64,
    pub week_tokens: u64,
    pub input_tokens: u64,
    pub output_tokens: u64,
    pub sessions: usize,
}

#[derive(Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct UsageReport {
    pub agents: Vec<AgentUsage>,
    pub total_tokens: u64,
    pub week_tokens: u64,
    pub scanned_files: usize,
}

fn cache_path() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_default()
        .join(".workbench/usage-cache.json")
}

fn load_cache() -> HashMap<String, FileUsage> {
    fs::read_to_string(cache_path())
        .ok()
        .and_then(|raw| serde_json::from_str(&raw).ok())
        .unwrap_or_default()
}

fn save_cache(cache: &HashMap<String, FileUsage>) {
    if let Some(parent) = cache_path().parent() {
        let _ = fs::create_dir_all(parent);
    }
    if let Ok(raw) = serde_json::to_string(cache) {
        let _ = fs::write(cache_path(), raw);
    }
}

fn file_signature(path: &Path) -> Option<(u64, u64)> {
    let meta = fs::metadata(path).ok()?;
    let mtime = meta
        .modified()
        .ok()?
        .duration_since(std::time::UNIX_EPOCH)
        .ok()?
        .as_secs();
    Some((mtime, meta.len()))
}

fn day_of(value: &serde_json::Value) -> Option<String> {
    value
        .get("timestamp")
        .and_then(|t| t.as_str())
        .map(|t| t.chars().take(10).collect())
}

fn parse_claude(path: &Path) -> HashMap<String, DayTokens> {
    let mut days: HashMap<String, DayTokens> = HashMap::new();
    let Ok(file) = fs::File::open(path) else {
        return days;
    };

    for line in BufReader::new(file).lines().map_while(Result::ok) {
        if !line.contains("\"usage\"") {
            continue;
        }
        let Ok(value) = serde_json::from_str::<serde_json::Value>(&line) else {
            continue;
        };
        let Some(usage) = value.get("message").and_then(|m| m.get("usage")) else {
            continue;
        };
        let number = |key: &str| usage.get(key).and_then(|v| v.as_u64()).unwrap_or(0);
        let input = number("input_tokens")
            + number("cache_creation_input_tokens")
            + number("cache_read_input_tokens");
        let output = number("output_tokens");
        if input == 0 && output == 0 {
            continue;
        }
        let day = day_of(&value).unwrap_or_else(|| "unknown".into());
        let entry = days.entry(day).or_default();
        entry.input += input;
        entry.output += output;
    }

    days
}

fn parse_codex(path: &Path) -> HashMap<String, DayTokens> {
    let mut days: HashMap<String, DayTokens> = HashMap::new();
    let Ok(file) = fs::File::open(path) else {
        return days;
    };

    let day_from_path = path
        .components()
        .rev()
        .take(4)
        .filter_map(|c| c.as_os_str().to_str())
        .collect::<Vec<_>>();
    let fallback_day = if day_from_path.len() >= 4 {
        format!(
            "{}-{}-{}",
            day_from_path[3], day_from_path[2], day_from_path[1]
        )
    } else {
        "unknown".to_string()
    };

    let mut last: Option<(String, DayTokens)> = None;
    for line in BufReader::new(file).lines().map_while(Result::ok) {
        if !line.contains("total_token_usage") {
            continue;
        }
        let Ok(value) = serde_json::from_str::<serde_json::Value>(&line) else {
            continue;
        };
        let Some(usage) = find_key(&value, "total_token_usage") else {
            continue;
        };
        let number = |key: &str| usage.get(key).and_then(|v| v.as_u64()).unwrap_or(0);
        let tokens = DayTokens {
            input: number("input_tokens") + number("cached_input_tokens"),
            output: number("output_tokens") + number("reasoning_output_tokens"),
        };
        let day = day_of(&value).unwrap_or_else(|| fallback_day.clone());
        last = Some((day, tokens));
    }

    if let Some((day, tokens)) = last {
        days.insert(day, tokens);
    }
    days
}

fn find_key<'a>(value: &'a serde_json::Value, key: &str) -> Option<&'a serde_json::Value> {
    match value {
        serde_json::Value::Object(map) => {
            if let Some(found) = map.get(key) {
                return Some(found);
            }
            map.values().find_map(|v| find_key(v, key))
        }
        serde_json::Value::Array(items) => items.iter().find_map(|v| find_key(v, key)),
        _ => None,
    }
}

fn collect(
    root: &Path,
    cache: &mut HashMap<String, FileUsage>,
    parser: fn(&Path) -> HashMap<String, DayTokens>,
) -> (HashMap<String, DayTokens>, usize) {
    let mut totals: HashMap<String, DayTokens> = HashMap::new();
    let mut files = 0;

    for entry in WalkDir::new(root).into_iter().flatten() {
        if !entry.file_type().is_file() {
            continue;
        }
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("jsonl") {
            continue;
        }
        let Some((mtime, size)) = file_signature(path) else {
            continue;
        };
        files += 1;

        let key = path.to_string_lossy().to_string();
        let cached = cache
            .get(&key)
            .filter(|c| c.mtime == mtime && c.size == size);
        let days = match cached {
            Some(hit) => hit.days.clone(),
            None => {
                let parsed = parser(path);
                cache.insert(
                    key,
                    FileUsage {
                        mtime,
                        size,
                        days: parsed.clone(),
                    },
                );
                parsed
            }
        };

        for (day, tokens) in days {
            let entry = totals.entry(day).or_default();
            entry.input += tokens.input;
            entry.output += tokens.output;
        }
    }

    (totals, files)
}

fn summarise(
    agent: &str,
    label: &str,
    days: HashMap<String, DayTokens>,
    sessions: usize,
) -> AgentUsage {
    let week_start = (Utc::now().date_naive() - Duration::days(6))
        .format("%Y-%m-%d")
        .to_string();

    let mut usage = AgentUsage {
        agent: agent.to_string(),
        label: label.to_string(),
        sessions,
        ..Default::default()
    };

    for (day, tokens) in &days {
        usage.input_tokens += tokens.input;
        usage.output_tokens += tokens.output;
        let total = tokens.input + tokens.output;
        usage.total_tokens += total;
        if day.as_str() >= week_start.as_str() && NaiveDate::parse_from_str(day, "%Y-%m-%d").is_ok()
        {
            usage.week_tokens += total;
        }
    }

    usage
}

#[tauri::command]
pub async fn token_usage() -> Result<UsageReport, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let home = dirs::home_dir().unwrap_or_default();
        let mut cache = load_cache();
        let mut report = UsageReport::default();

        let sources: [(&str, &str, PathBuf, fn(&Path) -> HashMap<String, DayTokens>); 2] = [
            (
                "claude-code",
                "Claude Code",
                home.join(".claude/projects"),
                parse_claude as fn(&Path) -> HashMap<String, DayTokens>,
            ),
            (
                "codex",
                "Codex",
                home.join(".codex/sessions"),
                parse_codex as fn(&Path) -> HashMap<String, DayTokens>,
            ),
        ];

        for (agent, label, root, parser) in sources {
            if !root.is_dir() {
                continue;
            }
            let (days, files) = collect(&root, &mut cache, parser);
            report.scanned_files += files;
            let usage = summarise(agent, label, days, files);
            report.total_tokens += usage.total_tokens;
            report.week_tokens += usage.week_tokens;
            report.agents.push(usage);
        }

        save_cache(&cache);
        report
            .agents
            .sort_by(|a, b| b.total_tokens.cmp(&a.total_tokens));
        Ok(report)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn parses_claude_usage_including_cache_tokens() {
        let path = std::env::temp_dir().join("wb_usage_claude.jsonl");
        let mut file = fs::File::create(&path).unwrap();
        writeln!(
            file,
            r#"{{"type":"assistant","timestamp":"2026-08-19T10:00:00Z","message":{{"usage":{{"input_tokens":2,"cache_creation_input_tokens":500,"cache_read_input_tokens":1000,"output_tokens":250}}}}}}"#
        )
        .unwrap();
        writeln!(
            file,
            r#"{{"type":"user","timestamp":"2026-08-19T10:01:00Z"}}"#
        )
        .unwrap();

        let days = parse_claude(&path);
        let day = days.get("2026-08-19").unwrap();
        assert_eq!(day.input, 1502);
        assert_eq!(day.output, 250);
        let _ = fs::remove_file(&path);
    }

    #[test]
    fn codex_uses_the_last_cumulative_total_not_the_sum() {
        let path = std::env::temp_dir().join("wb_usage_codex.jsonl");
        let mut file = fs::File::create(&path).unwrap();
        writeln!(
            file,
            r#"{{"timestamp":"2026-08-19T10:00:00Z","payload":{{"total_token_usage":{{"input_tokens":100,"cached_input_tokens":0,"output_tokens":10,"reasoning_output_tokens":0}}}}}}"#
        )
        .unwrap();
        writeln!(
            file,
            r#"{{"timestamp":"2026-08-19T10:05:00Z","payload":{{"total_token_usage":{{"input_tokens":4084,"cached_input_tokens":3200,"output_tokens":16,"reasoning_output_tokens":4}}}}}}"#
        )
        .unwrap();

        let days = parse_codex(&path);
        let day = days.get("2026-08-19").unwrap();
        assert_eq!(day.input, 7284);
        assert_eq!(day.output, 20);
        let _ = fs::remove_file(&path);
    }

    #[test]
    fn week_total_only_counts_the_last_seven_days() {
        let today = Utc::now().date_naive().format("%Y-%m-%d").to_string();
        let old = (Utc::now().date_naive() - Duration::days(40))
            .format("%Y-%m-%d")
            .to_string();

        let mut days = HashMap::new();
        days.insert(
            today,
            DayTokens {
                input: 10,
                output: 5,
            },
        );
        days.insert(
            old,
            DayTokens {
                input: 100,
                output: 50,
            },
        );

        let usage = summarise("claude-code", "Claude Code", days, 2);
        assert_eq!(usage.total_tokens, 165);
        assert_eq!(usage.week_tokens, 15);
    }

    #[test]
    fn missing_directories_produce_no_rows() {
        let mut cache = HashMap::new();
        let (days, files) = collect(Path::new("/definitely/not/here"), &mut cache, parse_claude);
        assert!(days.is_empty());
        assert_eq!(files, 0);
    }
}
