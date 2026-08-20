use std::process::Command;
use std::time::Duration;

use serde::Serialize;

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AgentInfo {
    pub id: String,
    pub name: String,
    pub vendor: String,
    pub binary: String,
    pub installed: bool,
    pub path: Option<String>,
    pub version: Option<String>,
    pub config_dir: Option<String>,
    pub config_exists: bool,
    pub install_url: String,
    pub docs_url: String,
    pub install_command: String,
    pub description: String,
}

struct AgentSpec {
    id: &'static str,
    name: &'static str,
    vendor: &'static str,
    binary: &'static str,
    config_dir: &'static str,
    install_url: &'static str,
    docs_url: &'static str,
    install_command: &'static str,
    description: &'static str,
}

const AGENTS: &[AgentSpec] = &[
    AgentSpec {
        id: "claude-code",
        name: "Claude Code",
        vendor: "Anthropic",
        binary: "claude",
        config_dir: ".claude",
        install_url: "https://claude.com/claude-code",
        docs_url: "https://docs.claude.com/en/docs/claude-code",
        install_command: "curl -fsSL https://claude.ai/install.sh | bash",
        description: "Anthropic's agentic coding CLI, with skills, subagents and MCP.",
    },
    AgentSpec {
        id: "codex",
        name: "Codex",
        vendor: "OpenAI",
        binary: "codex",
        config_dir: ".codex",
        install_url: "https://developers.openai.com/codex/cli",
        docs_url: "https://developers.openai.com/codex/cli",
        install_command: "npm install -g @openai/codex",
        description: "OpenAI's terminal coding agent.",
    },
    AgentSpec {
        id: "gemini-cli",
        name: "Gemini CLI",
        vendor: "Google",
        binary: "gemini",
        config_dir: ".gemini",
        install_url: "https://github.com/google-gemini/gemini-cli",
        docs_url: "https://github.com/google-gemini/gemini-cli",
        install_command: "npm install -g @google/gemini-cli",
        description: "Google's open-source terminal agent for Gemini models.",
    },
    AgentSpec {
        id: "cursor-agent",
        name: "Cursor Agent",
        vendor: "Cursor",
        binary: "cursor-agent",
        config_dir: ".cursor",
        install_url: "https://cursor.com/cli",
        docs_url: "https://cursor.com/docs/cli",
        install_command: "curl https://cursor.com/install -fsS | bash",
        description: "Cursor's editor agent, available from the terminal.",
    },
    AgentSpec {
        id: "copilot-cli",
        name: "GitHub Copilot CLI",
        vendor: "GitHub",
        binary: "copilot",
        config_dir: ".copilot",
        install_url: "https://github.com/features/copilot/cli",
        docs_url: "https://docs.github.com/en/copilot/concepts/agents/about-copilot-cli",
        install_command: "npm install -g @github/copilot",
        description: "GitHub's coding agent in the terminal.",
    },
    AgentSpec {
        id: "opencode",
        name: "OpenCode",
        vendor: "SST",
        binary: "opencode",
        config_dir: ".opencode",
        install_url: "https://opencode.ai",
        docs_url: "https://opencode.ai/docs",
        install_command: "curl -fsSL https://opencode.ai/install | bash",
        description: "Open-source terminal agent that works with many model providers.",
    },
    AgentSpec {
        id: "crush",
        name: "Crush",
        vendor: "Charm",
        binary: "crush",
        config_dir: ".config/crush",
        install_url: "https://github.com/charmbracelet/crush",
        docs_url: "https://github.com/charmbracelet/crush",
        install_command: "brew install charmbracelet/tap/crush",
        description: "Charm's glamourous multi-model coding agent for the terminal.",
    },
    AgentSpec {
        id: "aider",
        name: "Aider",
        vendor: "Aider",
        binary: "aider",
        config_dir: ".aider",
        install_url: "https://aider.chat",
        docs_url: "https://aider.chat/docs",
        install_command: "python -m pip install aider-install && aider-install",
        description: "Pair programming in your terminal, strong git integration.",
    },
    AgentSpec {
        id: "amp",
        name: "Amp",
        vendor: "Sourcegraph",
        binary: "amp",
        config_dir: ".amp",
        install_url: "https://ampcode.com",
        docs_url: "https://ampcode.com/manual",
        install_command: "npm install -g @sourcegraph/amp",
        description: "Sourcegraph's agentic coding tool.",
    },
    AgentSpec {
        id: "qwen-code",
        name: "Qwen Code",
        vendor: "Alibaba",
        binary: "qwen",
        config_dir: ".qwen",
        install_url: "https://github.com/QwenLM/qwen-code",
        docs_url: "https://github.com/QwenLM/qwen-code",
        install_command: "npm install -g @qwen-code/qwen-code",
        description: "Terminal agent tuned for Qwen models.",
    },
    AgentSpec {
        id: "goose",
        name: "Goose",
        vendor: "Block",
        binary: "goose",
        config_dir: ".config/goose",
        install_url: "https://block.github.io/goose/",
        docs_url: "https://block.github.io/goose/docs/quickstart",
        install_command: "brew install block-goose-cli",
        description: "Block's open-source, extensible AI agent.",
    },
    AgentSpec {
        id: "openclaw",
        name: "OpenClaw",
        vendor: "OpenClaw",
        binary: "openclaw",
        config_dir: ".openclaw",
        install_url: "https://openclaw.ai",
        docs_url: "https://docs.openclaw.ai/",
        install_command: "curl -fsSL https://openclaw.ai/install.sh | bash",
        description: "Open-source coding assistant with a gateway, skills and a browser dashboard.",
    },
    AgentSpec {
        id: "hermes",
        name: "Hermes Agent",
        vendor: "Nous Research",
        binary: "hermes",
        config_dir: ".hermes",
        install_url: "https://hermes-agent.nousresearch.com",
        docs_url: "https://hermes-agent.nousresearch.com/docs/",
        install_command: "curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash",
        description: "Autonomous agent with persistent memory, MCP servers and cron jobs.",
    },
    AgentSpec {
        id: "pi",
        name: "Pi",
        vendor: "Earendil Works",
        binary: "pi",
        config_dir: ".pi",
        install_url: "https://pi.dev",
        docs_url: "https://pi.dev/docs/latest",
        install_command: "npm install -g @earendil-works/pi-coding-agent",
        description: "Agent toolkit with a unified LLM API, agent loop and terminal UI.",
    },
    AgentSpec {
        id: "ollama",
        name: "Ollama",
        vendor: "Ollama",
        binary: "ollama",
        config_dir: ".ollama",
        install_url: "https://ollama.com/download",
        docs_url: "https://docs.ollama.com/",
        install_command: "brew install ollama",
        description: "Run open models locally and serve them to your other agents.",
    },
    AgentSpec {
        id: "cline",
        name: "Cline",
        vendor: "Cline",
        binary: "cline",
        config_dir: ".cline",
        install_url: "https://cline.bot",
        docs_url: "https://docs.cline.bot/",
        install_command: "npm install -g @cline/cli",
        description: "Open-source coding agent, originally a VS Code extension.",
    },
];

fn login_shell_which(binary: &str) -> Option<String> {
    let output = Command::new("/bin/sh")
        .arg("-lc")
        .arg(format!("command -v {binary}"))
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
    (!path.is_empty()).then_some(path)
}

fn read_version(binary: &str) -> Option<String> {
    let child = Command::new("/bin/sh")
        .arg("-lc")
        .arg(format!("{binary} --version 2>&1 | head -1"))
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::null())
        .spawn()
        .ok()?;

    let start = std::time::Instant::now();
    let mut child = child;
    loop {
        match child.try_wait() {
            Ok(Some(_)) => break,
            Ok(None) if start.elapsed() > Duration::from_secs(3) => {
                let _ = child.kill();
                return None;
            }
            Ok(None) => std::thread::sleep(Duration::from_millis(40)),
            Err(_) => return None,
        }
    }

    let output = child.wait_with_output().ok()?;
    let text = String::from_utf8_lossy(&output.stdout).trim().to_string();
    (!text.is_empty() && text.len() < 120).then_some(text)
}

fn inspect(spec: &AgentSpec) -> AgentInfo {
    let path = login_shell_which(spec.binary);
    let installed = path.is_some();
    let home = dirs::home_dir().unwrap_or_default();
    let config_path = home.join(spec.config_dir);

    AgentInfo {
        id: spec.id.to_string(),
        name: spec.name.to_string(),
        vendor: spec.vendor.to_string(),
        binary: spec.binary.to_string(),
        version: if installed { read_version(spec.binary) } else { None },
        config_exists: config_path.is_dir(),
        config_dir: Some(config_path.to_string_lossy().to_string()),
        installed,
        path,
        install_url: spec.install_url.to_string(),
        docs_url: spec.docs_url.to_string(),
        install_command: spec.install_command.to_string(),
        description: spec.description.to_string(),
    }
}

#[tauri::command]
pub async fn detect_agents() -> Result<Vec<AgentInfo>, String> {
    tauri::async_runtime::spawn_blocking(|| AGENTS.iter().map(inspect).collect())
        .await
        .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_spec_is_complete_and_unique() {
        let mut ids = std::collections::HashSet::new();
        for spec in AGENTS {
            assert!(!spec.name.is_empty(), "{} missing name", spec.id);
            assert!(!spec.install_command.is_empty(), "{} missing command", spec.id);
            assert!(spec.install_url.starts_with("https://"), "{} bad url", spec.id);
            assert!(spec.docs_url.starts_with("https://"), "{} bad docs", spec.id);
            assert!(ids.insert(spec.id), "duplicate id {}", spec.id);
        }
    }

    #[test]
    fn resolves_binaries_through_a_login_shell() {
        assert!(login_shell_which("sh").is_some());
        assert!(login_shell_which("definitely-not-a-real-binary-xyz").is_none());
    }
}
