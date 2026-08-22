use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ProjectStatus {
    Unknown,
    Runnable,
    Running,
    InProgress,
    Broken,
    Dead,
    Shipped,
}

impl ProjectStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            ProjectStatus::Unknown => "unknown",
            ProjectStatus::Runnable => "runnable",
            ProjectStatus::Running => "running",
            ProjectStatus::InProgress => "in-progress",
            ProjectStatus::Broken => "broken",
            ProjectStatus::Dead => "dead",
            ProjectStatus::Shipped => "shipped",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "runnable" => ProjectStatus::Runnable,
            "running" => ProjectStatus::Running,
            "in-progress" => ProjectStatus::InProgress,
            "broken" => ProjectStatus::Broken,
            "dead" => ProjectStatus::Dead,
            "shipped" => ProjectStatus::Shipped,
            _ => ProjectStatus::Unknown,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Framework {
    Nextjs,
    Vite,
    Tauri,
    Rails,
    ChromeExtension,
    Godot,
    Go,
    Rust,
    Python,
    Wordpress,
    Node,
    Static,
    Unknown,
}

impl Framework {
    pub fn as_str(&self) -> &'static str {
        match self {
            Framework::Nextjs => "nextjs",
            Framework::Vite => "vite",
            Framework::Tauri => "tauri",
            Framework::Rails => "rails",
            Framework::ChromeExtension => "chrome-extension",
            Framework::Godot => "godot",
            Framework::Go => "go",
            Framework::Rust => "rust",
            Framework::Python => "python",
            Framework::Wordpress => "wordpress",
            Framework::Node => "node",
            Framework::Static => "static",
            Framework::Unknown => "unknown",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "nextjs" => Framework::Nextjs,
            "vite" => Framework::Vite,
            "tauri" => Framework::Tauri,
            "rails" => Framework::Rails,
            "chrome-extension" => Framework::ChromeExtension,
            "godot" => Framework::Godot,
            "go" => Framework::Go,
            "rust" => Framework::Rust,
            "python" => Framework::Python,
            "wordpress" => Framework::Wordpress,
            "node" => Framework::Node,
            "static" => Framework::Static,
            _ => Framework::Unknown,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PackageManager {
    Npm,
    Pnpm,
    Yarn,
    Bun,
    Bundler,
    Cargo,
    Go,
    Pip,
    None,
}

impl PackageManager {
    pub fn as_str(&self) -> &'static str {
        match self {
            PackageManager::Npm => "npm",
            PackageManager::Pnpm => "pnpm",
            PackageManager::Yarn => "yarn",
            PackageManager::Bun => "bun",
            PackageManager::Bundler => "bundler",
            PackageManager::Cargo => "cargo",
            PackageManager::Go => "go",
            PackageManager::Pip => "pip",
            PackageManager::None => "none",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "npm" => PackageManager::Npm,
            "pnpm" => PackageManager::Pnpm,
            "yarn" => PackageManager::Yarn,
            "bun" => PackageManager::Bun,
            "bundler" => PackageManager::Bundler,
            "cargo" => PackageManager::Cargo,
            "go" => PackageManager::Go,
            "pip" => PackageManager::Pip,
            _ => PackageManager::None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum BrokenReason {
    DepsNotInstalled,
    MissingEnv,
    PortInUse,
    Crashed,
    Timeout,
    NoRunCommand,
}

impl BrokenReason {
    pub fn as_str(&self) -> &'static str {
        match self {
            BrokenReason::DepsNotInstalled => "deps-not-installed",
            BrokenReason::MissingEnv => "missing-env",
            BrokenReason::PortInUse => "port-in-use",
            BrokenReason::Crashed => "crashed",
            BrokenReason::Timeout => "timeout",
            BrokenReason::NoRunCommand => "no-run-command",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "deps-not-installed" => Some(BrokenReason::DepsNotInstalled),
            "missing-env" => Some(BrokenReason::MissingEnv),
            "port-in-use" => Some(BrokenReason::PortInUse),
            "crashed" => Some(BrokenReason::Crashed),
            "timeout" => Some(BrokenReason::Timeout),
            "no-run-command" => Some(BrokenReason::NoRunCommand),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: i64,
    pub path: String,
    pub name: String,
    pub framework: Framework,
    pub language: Option<String>,
    pub package_manager: PackageManager,
    pub last_modified: String,
    pub git_branch: Option<String>,
    pub git_remote: Option<String>,
    pub git_dirty: bool,
    pub last_commit_at: Option<String>,
    pub loc: i64,
    pub readme_summary: Option<String>,
    pub run_cmd: Option<String>,
    pub run_url: Option<String>,
    pub homepage: Option<String>,
    pub icon_path: Option<String>,
    pub port: Option<i64>,
    pub status: ProjectStatus,
    pub broken_reason: Option<BrokenReason>,
    pub trusted: bool,
    pub archived: bool,
    pub ship_score: Option<i64>,
    pub deps_installed: bool,
    pub has_env_example: bool,
    pub first_seen: String,
    pub last_scanned: String,
    pub tags: Vec<String>,
    pub screenshot_desktop: Option<String>,
    pub screenshot_mobile: Option<String>,
}

#[derive(Debug, Clone)]
pub struct NewProjectInput {
    pub path: String,
    pub name: String,
    pub framework: Framework,
    pub language: Option<String>,
    pub package_manager: PackageManager,
    pub last_modified: String,
    pub git_branch: Option<String>,
    pub git_remote: Option<String>,
    pub git_dirty: bool,
    pub last_commit_at: Option<String>,
    pub loc: i64,
    pub readme_summary: Option<String>,
    pub run_cmd: Option<String>,
    pub run_url: Option<String>,
    pub homepage: Option<String>,
    pub port: Option<i64>,
    pub status: ProjectStatus,
    pub deps_installed: bool,
    pub has_env_example: bool,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectPatch {
    pub path: Option<String>,
    pub name: Option<String>,
    pub framework: Option<Framework>,
    pub language: Option<Option<String>>,
    pub package_manager: Option<PackageManager>,
    pub last_modified: Option<String>,
    pub git_branch: Option<Option<String>>,
    pub git_remote: Option<Option<String>>,
    pub git_dirty: Option<bool>,
    pub last_commit_at: Option<Option<String>>,
    pub loc: Option<i64>,
    pub readme_summary: Option<Option<String>>,
    pub run_cmd: Option<Option<String>>,
    pub run_url: Option<Option<String>>,
    pub homepage: Option<Option<String>>,
    pub port: Option<Option<i64>>,
    pub status: Option<ProjectStatus>,
    pub broken_reason: Option<Option<BrokenReason>>,
    pub trusted: Option<bool>,
    pub archived: Option<bool>,
    pub ship_score: Option<Option<i64>>,
    pub deps_installed: Option<bool>,
    pub has_env_example: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanRoot {
    pub id: i64,
    pub path: String,
    pub enabled: bool,
    pub last_scanned: Option<String>,
    pub project_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanProgress {
    pub scanned: i64,
    pub found: i64,
    pub current_path: String,
    pub done: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ActivityKind {
    Created,
    Commit,
    Modified,
    Screenshot,
    Scanned,
    Run,
}

impl ActivityKind {
    pub fn as_str(&self) -> &'static str {
        match self {
            ActivityKind::Created => "created",
            ActivityKind::Commit => "commit",
            ActivityKind::Modified => "modified",
            ActivityKind::Screenshot => "screenshot",
            ActivityKind::Scanned => "scanned",
            ActivityKind::Run => "run",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "commit" => ActivityKind::Commit,
            "modified" => ActivityKind::Modified,
            "screenshot" => ActivityKind::Screenshot,
            "scanned" => ActivityKind::Scanned,
            "run" => ActivityKind::Run,
            _ => ActivityKind::Created,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityEvent {
    pub id: i64,
    pub project_id: i64,
    pub kind: ActivityKind,
    pub occurred_at: String,
    pub detail: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShipSignal {
    pub key: String,
    pub label: String,
    pub passed: bool,
    pub weight: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShipScore {
    pub score: i64,
    pub signals: Vec<ShipSignal>,
    pub effort_estimate: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunResult {
    pub project_id: i64,
    pub url: Option<String>,
    pub ok: bool,
    pub reason: Option<BrokenReason>,
    pub log_tail: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryStats {
    pub total: i64,
    pub runnable: i64,
    pub shipped: i64,
    pub broken: i64,
    pub with_screenshots: i64,
    pub by_framework: std::collections::HashMap<String, i64>,
    pub total_loc: i64,
    pub oldest_project: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ShelfId {
    Continue,
    Gems,
    Discovered,
    Shipped,
    Experiments,
    Attention,
    Dead,
    Archived,
    All,
}

impl ShelfId {
    pub fn from_str(s: &str) -> Self {
        match s {
            "continue" => ShelfId::Continue,
            "gems" => ShelfId::Gems,
            "discovered" => ShelfId::Discovered,
            "shipped" => ShelfId::Shipped,
            "experiments" => ShelfId::Experiments,
            "attention" => ShelfId::Attention,
            "dead" => ShelfId::Dead,
            "archived" => ShelfId::Archived,
            _ => ShelfId::All,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SortMode {
    Modified,
    Name,
    Score,
    Discovered,
}

impl SortMode {
    pub fn from_str(s: &str) -> Self {
        match s {
            "name" => SortMode::Name,
            "score" => SortMode::Score,
            "discovered" => SortMode::Discovered,
            _ => SortMode::Modified,
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectQuery {
    pub shelf: ShelfId,
    pub search: String,
    pub frameworks: Vec<Framework>,
    pub tags: Vec<String>,
    pub sort: SortMode,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum AiProvider {
    ClaudeCode,
    Codex,
}

impl AiProvider {
    pub fn as_str(&self) -> &'static str {
        match self {
            AiProvider::ClaudeCode => "claude-code",
            AiProvider::Codex => "codex",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "codex" => AiProvider::Codex,
            _ => AiProvider::ClaudeCode,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiSession {
    pub project_id: i64,
    pub provider: AiProvider,
    pub tmux_session: String,
    pub attach_command: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Editor {
    Vscode,
    Cursor,
    Zed,
    Webstorm,
}

impl Editor {
    pub fn as_str(&self) -> &'static str {
        match self {
            Editor::Vscode => "vscode",
            Editor::Cursor => "cursor",
            Editor::Zed => "zed",
            Editor::Webstorm => "webstorm",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "cursor" => Editor::Cursor,
            "zed" => Editor::Zed,
            "webstorm" => Editor::Webstorm,
            _ => Editor::Vscode,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Terminal {
    Terminal,
    Iterm,
    Warp,
    Ghostty,
}

impl Terminal {
    pub fn as_str(&self) -> &'static str {
        match self {
            Terminal::Terminal => "terminal",
            Terminal::Iterm => "iterm",
            Terminal::Warp => "warp",
            Terminal::Ghostty => "ghostty",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "iterm" => Terminal::Iterm,
            "warp" => Terminal::Warp,
            "ghostty" => Terminal::Ghostty,
            _ => Terminal::Terminal,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub ai_provider: AiProvider,
    pub editor: Editor,
    pub terminal: Terminal,
    pub auto_screenshot: bool,
    pub concurrent_runs: i64,
    pub intro_seen: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Settings {
            ai_provider: AiProvider::ClaudeCode,
            editor: Editor::Vscode,
            terminal: Terminal::Terminal,
            auto_screenshot: true,
            concurrent_runs: 2,
            intro_seen: false,
        }
    }
}
