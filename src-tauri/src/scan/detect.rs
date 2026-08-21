use std::path::Path;

use crate::models::{Framework, PackageManager};

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct PackageJsonInfo {
    pub scripts: Vec<(String, String)>,
}

#[derive(Debug, Clone, Default)]
pub struct DetectContext {
    pub manifest_version_present: bool,
    pub wordpress_header_present: bool,
    pub package_json: Option<PackageJsonInfo>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Detection {
    pub framework: Framework,
    pub language: Option<String>,
    pub package_manager: PackageManager,
    pub run_cmd: Option<String>,
    pub run_url: Option<String>,
    pub port: Option<i64>,
}

const MARKER_FILES: &[&str] = &[
    "package.json",
    "Cargo.toml",
    "go.mod",
    "requirements.txt",
    "pyproject.toml",
    "composer.json",
    "manifest.json",
    "project.godot",
    "index.html",
    "Gemfile",
];

const MARKER_PREFIXES: &[&str] = &["next.config.", "vite.config."];

pub fn has_any_marker(entries: &[String]) -> bool {
    entries.iter().any(|e| MARKER_FILES.contains(&e.as_str()))
        || entries
            .iter()
            .any(|e| MARKER_PREFIXES.iter().any(|p| e.starts_with(p)))
        || entries.iter().any(|e| e == "src-tauri/tauri.conf.json")
}

pub fn detect(_dir: &Path, entries: &[String], ctx: &DetectContext) -> Option<Detection> {
    if entries.is_empty() {
        return None;
    }

    let has = |name: &str| entries.iter().any(|e| e == name);
    let has_prefix = |prefix: &str| entries.iter().any(|e| e.starts_with(prefix));

    let framework = if has("src-tauri/tauri.conf.json") {
        Framework::Tauri
    } else if has_prefix("next.config.") {
        Framework::Nextjs
    } else if has_prefix("vite.config.") {
        Framework::Vite
    } else if has("Gemfile") && has("config/application.rb") {
        Framework::Rails
    } else if has("manifest.json") && ctx.manifest_version_present {
        Framework::ChromeExtension
    } else if has("project.godot") {
        Framework::Godot
    } else if has("go.mod") {
        Framework::Go
    } else if has("Cargo.toml") {
        Framework::Rust
    } else if has("requirements.txt") || has("pyproject.toml") {
        Framework::Python
    } else if has("composer.json") || (has("style.css") && ctx.wordpress_header_present) {
        Framework::Wordpress
    } else if has("package.json") {
        Framework::Node
    } else if has("index.html") {
        Framework::Static
    } else {
        Framework::Unknown
    };

    let package_manager = resolve_package_manager(framework, entries);
    let language = resolve_language(framework, entries);
    let (run_cmd, run_url, port) =
        resolve_run(framework, package_manager, ctx.package_json.as_ref());

    Some(Detection {
        framework,
        language,
        package_manager,
        run_cmd,
        run_url,
        port,
    })
}

fn resolve_package_manager(framework: Framework, entries: &[String]) -> PackageManager {
    let has = |name: &str| entries.iter().any(|e| e == name);

    if has("pnpm-lock.yaml") {
        return PackageManager::Pnpm;
    }
    if has("yarn.lock") {
        return PackageManager::Yarn;
    }
    if has("bun.lockb") {
        return PackageManager::Bun;
    }
    if has("package-lock.json") {
        return PackageManager::Npm;
    }

    match framework {
        Framework::Rails => PackageManager::Bundler,
        Framework::Go => PackageManager::Go,
        Framework::Rust | Framework::Tauri => PackageManager::Cargo,
        Framework::Python => PackageManager::Pip,
        Framework::Nextjs | Framework::Vite | Framework::Node | Framework::ChromeExtension => {
            if has("package.json") {
                PackageManager::Npm
            } else {
                PackageManager::None
            }
        }
        _ => PackageManager::None,
    }
}

fn resolve_language(framework: Framework, entries: &[String]) -> Option<String> {
    let has_ts = entries.iter().any(|e| e == "tsconfig.json");

    match framework {
        Framework::Nextjs | Framework::Vite | Framework::Node | Framework::ChromeExtension => {
            Some(if has_ts { "TypeScript" } else { "JavaScript" }.to_string())
        }
        Framework::Tauri => Some("Rust".to_string()),
        Framework::Rails => Some("Ruby".to_string()),
        Framework::Godot => Some("GDScript".to_string()),
        Framework::Go => Some("Go".to_string()),
        Framework::Rust => Some("Rust".to_string()),
        Framework::Python => Some("Python".to_string()),
        Framework::Wordpress => Some("PHP".to_string()),
        Framework::Static => Some("HTML".to_string()),
        Framework::Unknown => None,
    }
}

fn resolve_run(
    framework: Framework,
    pm: PackageManager,
    package_json: Option<&PackageJsonInfo>,
) -> (Option<String>, Option<String>, Option<i64>) {
    match framework {
        Framework::Nextjs => {
            let cmd = script_run_cmd(pm, package_json, &["dev", "start", "serve"])
                .unwrap_or_else(|| default_pm_cmd(pm, "dev"));
            (
                Some(cmd),
                Some("http://localhost:3000".to_string()),
                Some(3000),
            )
        }
        Framework::Vite => {
            let cmd = script_run_cmd(pm, package_json, &["dev", "start", "serve"])
                .unwrap_or_else(|| default_pm_cmd(pm, "dev"));
            (
                Some(cmd),
                Some("http://localhost:5173".to_string()),
                Some(5173),
            )
        }
        Framework::Node => {
            let cmd = script_run_cmd(pm, package_json, &["dev", "start", "serve"]);
            (cmd, None, None)
        }
        Framework::Tauri => {
            let has_tauri_script = package_json
                .map(|p| p.scripts.iter().any(|(k, _)| k == "tauri"))
                .unwrap_or(false);
            let cmd = if has_tauri_script {
                tauri_pm_cmd(pm)
            } else {
                "cargo tauri dev".to_string()
            };
            (Some(cmd), None, None)
        }
        Framework::Rails => (
            Some("bin/rails server".to_string()),
            Some("http://localhost:3000".to_string()),
            Some(3000),
        ),
        Framework::Go => (Some("go run .".to_string()), None, None),
        Framework::Rust => (Some("cargo run".to_string()), None, None),
        Framework::Static => (Some("npx serve .".to_string()), None, None),
        Framework::ChromeExtension
        | Framework::Godot
        | Framework::Python
        | Framework::Wordpress
        | Framework::Unknown => (None, None, None),
    }
}

fn script_run_cmd(
    pm: PackageManager,
    package_json: Option<&PackageJsonInfo>,
    preference: &[&str],
) -> Option<String> {
    let scripts = &package_json?.scripts;
    for name in preference {
        if scripts.iter().any(|(k, _)| k == name) {
            return Some(default_pm_cmd(pm, name));
        }
    }
    None
}

fn default_pm_cmd(pm: PackageManager, script: &str) -> String {
    match pm {
        PackageManager::Npm | PackageManager::None => {
            if script == "start" {
                "npm start".to_string()
            } else {
                format!("npm run {script}")
            }
        }
        PackageManager::Pnpm => {
            if script == "start" {
                "pnpm start".to_string()
            } else {
                format!("pnpm run {script}")
            }
        }
        PackageManager::Yarn => format!("yarn {script}"),
        PackageManager::Bun => {
            if script == "start" {
                "bun start".to_string()
            } else {
                format!("bun run {script}")
            }
        }
        _ => format!("npm run {script}"),
    }
}

fn tauri_pm_cmd(pm: PackageManager) -> String {
    match pm {
        PackageManager::Pnpm => "pnpm tauri dev".to_string(),
        PackageManager::Yarn => "yarn tauri dev".to_string(),
        PackageManager::Bun => "bun run tauri dev".to_string(),
        _ => "npm run tauri dev".to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn strings(items: &[&str]) -> Vec<String> {
        items.iter().map(|s| s.to_string()).collect()
    }

    fn ctx() -> DetectContext {
        DetectContext::default()
    }

    #[test]
    fn detects_nextjs_with_dev_script_and_port() {
        let entries = strings(&["package.json", "next.config.js", "package-lock.json"]);
        let package_json = PackageJsonInfo {
            scripts: vec![("dev".to_string(), "next dev".to_string())],
        };
        let mut context = ctx();
        context.package_json = Some(package_json);

        let d = detect(Path::new("/proj"), &entries, &context).unwrap();
        assert_eq!(d.framework, Framework::Nextjs);
        assert_eq!(d.package_manager, PackageManager::Npm);
        assert_eq!(d.port, Some(3000));
        assert_eq!(d.run_cmd, Some("npm run dev".to_string()));
    }

    #[test]
    fn detects_vite_with_port() {
        let entries = strings(&["package.json", "vite.config.ts"]);
        let d = detect(Path::new("/proj"), &entries, &ctx()).unwrap();
        assert_eq!(d.framework, Framework::Vite);
        assert_eq!(d.port, Some(5173));
    }

    #[test]
    fn tauri_wins_over_vite_when_nested() {
        let entries = strings(&[
            "package.json",
            "vite.config.ts",
            "src-tauri/tauri.conf.json",
        ]);
        let d = detect(Path::new("/proj"), &entries, &ctx()).unwrap();
        assert_eq!(d.framework, Framework::Tauri);
        assert_eq!(d.language, Some("Rust".to_string()));
    }

    #[test]
    fn tauri_run_cmd_prefers_tauri_script() {
        let entries = strings(&[
            "package.json",
            "vite.config.ts",
            "src-tauri/tauri.conf.json",
        ]);
        let mut context = ctx();
        context.package_json = Some(PackageJsonInfo {
            scripts: vec![("tauri".to_string(), "tauri".to_string())],
        });
        let d = detect(Path::new("/proj"), &entries, &context).unwrap();
        assert_eq!(d.run_cmd, Some("npm run tauri dev".to_string()));
    }

    #[test]
    fn detects_rails_only_with_application_rb() {
        let entries = strings(&["Gemfile", "config/application.rb", "Rakefile"]);
        let d = detect(Path::new("/proj"), &entries, &ctx()).unwrap();
        assert_eq!(d.framework, Framework::Rails);
        assert_eq!(d.run_cmd, Some("bin/rails server".to_string()));
        assert_eq!(d.port, Some(3000));
    }

    #[test]
    fn bare_gemfile_is_not_rails() {
        let entries = strings(&["Gemfile", "Rakefile"]);
        let d = detect(Path::new("/proj"), &entries, &ctx()).unwrap();
        assert_eq!(d.framework, Framework::Unknown);
    }

    #[test]
    fn manifest_with_version_is_chrome_extension() {
        let entries = strings(&["manifest.json", "package.json"]);
        let mut context = ctx();
        context.manifest_version_present = true;
        let d = detect(Path::new("/proj"), &entries, &context).unwrap();
        assert_eq!(d.framework, Framework::ChromeExtension);
    }

    #[test]
    fn manifest_without_version_falls_back_to_node() {
        let entries = strings(&["manifest.json", "package.json"]);
        let d = detect(Path::new("/proj"), &entries, &ctx()).unwrap();
        assert_eq!(d.framework, Framework::Node);
    }

    #[test]
    fn detects_godot() {
        let entries = strings(&["project.godot"]);
        let d = detect(Path::new("/proj"), &entries, &ctx()).unwrap();
        assert_eq!(d.framework, Framework::Godot);
        assert_eq!(d.language, Some("GDScript".to_string()));
    }

    #[test]
    fn detects_go() {
        let entries = strings(&["go.mod", "main.go"]);
        let d = detect(Path::new("/proj"), &entries, &ctx()).unwrap();
        assert_eq!(d.framework, Framework::Go);
        assert_eq!(d.package_manager, PackageManager::Go);
        assert_eq!(d.run_cmd, Some("go run .".to_string()));
    }

    #[test]
    fn detects_rust() {
        let entries = strings(&["Cargo.toml", "src"]);
        let d = detect(Path::new("/proj"), &entries, &ctx()).unwrap();
        assert_eq!(d.framework, Framework::Rust);
        assert_eq!(d.run_cmd, Some("cargo run".to_string()));
    }

    #[test]
    fn detects_python_requirements() {
        let entries = strings(&["requirements.txt", "main.py"]);
        let d = detect(Path::new("/proj"), &entries, &ctx()).unwrap();
        assert_eq!(d.framework, Framework::Python);
        assert_eq!(d.package_manager, PackageManager::Pip);
    }

    #[test]
    fn detects_python_pyproject() {
        let entries = strings(&["pyproject.toml"]);
        let d = detect(Path::new("/proj"), &entries, &ctx()).unwrap();
        assert_eq!(d.framework, Framework::Python);
    }

    #[test]
    fn detects_wordpress_via_composer() {
        let entries = strings(&["composer.json"]);
        let d = detect(Path::new("/proj"), &entries, &ctx()).unwrap();
        assert_eq!(d.framework, Framework::Wordpress);
    }

    #[test]
    fn detects_wordpress_via_style_header() {
        let entries = strings(&["style.css"]);
        let mut context = ctx();
        context.wordpress_header_present = true;
        let d = detect(Path::new("/proj"), &entries, &context).unwrap();
        assert_eq!(d.framework, Framework::Wordpress);
    }

    #[test]
    fn plain_node_falls_back_and_prefers_dev_over_start() {
        let entries = strings(&["package.json"]);
        let mut context = ctx();
        context.package_json = Some(PackageJsonInfo {
            scripts: vec![
                ("start".to_string(), "node index.js".to_string()),
                ("dev".to_string(), "nodemon index.js".to_string()),
            ],
        });
        let d = detect(Path::new("/proj"), &entries, &context).unwrap();
        assert_eq!(d.framework, Framework::Node);
        assert_eq!(d.run_cmd, Some("npm run dev".to_string()));
    }

    #[test]
    fn static_index_html_fallback() {
        let entries = strings(&["index.html", "style.css"]);
        let d = detect(Path::new("/proj"), &entries, &ctx()).unwrap();
        assert_eq!(d.framework, Framework::Static);
        assert_eq!(d.run_cmd, Some("npx serve .".to_string()));
    }

    #[test]
    fn package_manager_from_pnpm_lockfile() {
        let entries = strings(&["package.json", "vite.config.ts", "pnpm-lock.yaml"]);
        let d = detect(Path::new("/proj"), &entries, &ctx()).unwrap();
        assert_eq!(d.package_manager, PackageManager::Pnpm);
    }

    #[test]
    fn empty_entries_return_none() {
        let entries: Vec<String> = Vec::new();
        assert!(detect(Path::new("/proj"), &entries, &ctx()).is_none());
    }

    #[test]
    fn has_any_marker_recognizes_signals() {
        assert!(has_any_marker(&strings(&["Cargo.toml"])));
        assert!(has_any_marker(&strings(&["src-tauri/tauri.conf.json"])));
        assert!(!has_any_marker(&strings(&["README.md"])));
    }
}
