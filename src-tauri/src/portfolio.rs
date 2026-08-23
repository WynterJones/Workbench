use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};

use crate::models::AiProvider;
use crate::run::store::{self, ProjectRunInfo};
use crate::shots::{extension_of, ALLOWED_EXTENSIONS, MAX_IMAGE_BYTES};

const AGENT_TIMEOUT: Duration = Duration::from_secs(300);

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Voice {
    pub audience: String,
    pub tone: String,
    pub takeaway: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessage {
    pub role: String,
    pub text: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PortfolioState {
    pub images_dir: String,
    pub images: Vec<String>,
    pub voice: Voice,
    pub messages: Vec<ChatMessage>,
    pub doc: String,
}

fn project_dir(id: i64) -> PathBuf {
    store::workbench_dir()
        .join("portfolio")
        .join(id.to_string())
}

pub fn images_dir(id: i64) -> PathBuf {
    project_dir(id).join("images")
}

fn voice_path(id: i64) -> PathBuf {
    project_dir(id).join("voice.json")
}

fn chat_path(id: i64) -> PathBuf {
    project_dir(id).join("chat.json")
}

fn doc_path(id: i64) -> PathBuf {
    project_dir(id).join("portfolio.md")
}

fn read_json<T: Default + serde::de::DeserializeOwned>(path: &Path) -> T {
    fs::read_to_string(path)
        .ok()
        .and_then(|raw| serde_json::from_str(&raw).ok())
        .unwrap_or_default()
}

fn write_json<T: Serialize>(path: &Path, value: &T) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(value).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())
}

fn list_images(id: i64) -> Vec<String> {
    let dir = images_dir(id);
    let Ok(entries) = fs::read_dir(&dir) else {
        return Vec::new();
    };
    let mut names: Vec<String> = entries
        .filter_map(|entry| entry.ok())
        .filter(|entry| extension_of(&entry.path()).is_some())
        .map(|entry| entry.file_name().to_string_lossy().to_string())
        .collect();
    names.sort();
    names
}

fn unique_name(ext: &str) -> String {
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or_default();
    format!("shot-{stamp}.{ext}")
}

#[tauri::command]
pub fn portfolio_state(id: i64) -> Result<PortfolioState, String> {
    Ok(PortfolioState {
        images_dir: images_dir(id).to_string_lossy().to_string(),
        images: list_images(id),
        voice: read_json(&voice_path(id)),
        messages: read_json(&chat_path(id)),
        doc: fs::read_to_string(doc_path(id)).unwrap_or_default(),
    })
}

#[tauri::command]
pub fn portfolio_add_image(id: i64, bytes: Vec<u8>, extension: String) -> Result<String, String> {
    let ext = extension.to_lowercase();
    if !ALLOWED_EXTENSIONS.contains(&ext.as_str()) {
        return Err("Only png, jpg, gif, webp and avif images are supported".into());
    }
    if bytes.is_empty() {
        return Err("That image was empty".into());
    }
    if bytes.len() > MAX_IMAGE_BYTES {
        return Err("That image is larger than 25 MB".into());
    }
    let dir = images_dir(id);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let name = unique_name(&ext);
    fs::write(dir.join(&name), &bytes).map_err(|e| e.to_string())?;
    Ok(name)
}

fn checked_source(source_path: &str) -> Result<String, String> {
    let source = Path::new(source_path);
    let ext = extension_of(source)
        .ok_or_else(|| "Only png, jpg, gif, webp and avif images are supported".to_string())?;
    let meta = fs::metadata(source).map_err(|e| e.to_string())?;
    if !meta.is_file() {
        return Err(format!("{source_path} is not a file"));
    }
    if meta.len() as usize > MAX_IMAGE_BYTES {
        return Err("That image is larger than 25 MB".into());
    }
    Ok(ext)
}

fn copy_into_images(id: i64, source_path: &str, name: &str) -> Result<PathBuf, String> {
    let dir = images_dir(id);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let target = dir.join(name);
    fs::copy(source_path, &target).map_err(|e| e.to_string())?;
    Ok(target)
}

#[tauri::command]
pub fn portfolio_add_image_file(id: i64, source_path: String) -> Result<String, String> {
    let ext = checked_source(&source_path)?;
    let name = unique_name(&ext);
    copy_into_images(id, &source_path, &name)?;
    Ok(name)
}

pub fn import_labelled_image(id: i64, source_path: &str, label: &str) -> Result<String, String> {
    let ext = checked_source(source_path)?;
    let name = format!("{}.{ext}", crate::ai::slugify(label));
    let target = copy_into_images(id, source_path, &name)?;
    if store::get_screenshot_path(id, "desktop").is_none() {
        let _ = store::insert_screenshot(id, "desktop", &target.to_string_lossy());
    }
    Ok(name)
}

#[tauri::command]
pub fn portfolio_remove_image(id: i64, name: String) -> Result<(), String> {
    if name.contains('/') || name.contains("..") {
        return Err("That is not an image in this portfolio".into());
    }
    let target = images_dir(id).join(&name);
    if !target.is_file() {
        return Err("That image is already gone".into());
    }
    fs::remove_file(target).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn portfolio_save_voice(id: i64, voice: Voice) -> Result<(), String> {
    write_json(&voice_path(id), &voice)
}

#[tauri::command]
pub fn portfolio_save_doc(id: i64, markdown: String) -> Result<(), String> {
    let path = doc_path(id);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(path, markdown).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn portfolio_clear_chat(id: i64) -> Result<(), String> {
    write_json(&chat_path(id), &Vec::<ChatMessage>::new())
}

fn shell_escape(value: &str) -> String {
    format!("'{}'", value.replace('\'', "'\\''"))
}

fn invocation(provider: AiProvider, prompt: &str) -> String {
    match provider {
        AiProvider::ClaudeCode => format!("claude -p {}", shell_escape(prompt)),
        AiProvider::Codex => format!("codex exec --skip-git-repo-check {}", shell_escape(prompt)),
    }
}

fn ask_agent(
    id: i64,
    provider: AiProvider,
    cwd: &str,
    prompt: &str,
    label: &str,
) -> Result<String, String> {
    let dir = project_dir(id);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let out_file = dir.join(format!("{label}.out"));
    let err_file = dir.join(format!("{label}.err"));

    let script = format!(
        "{} > {} 2> {}",
        invocation(provider, prompt),
        shell_escape(&out_file.to_string_lossy()),
        shell_escape(&err_file.to_string_lossy())
    );
    let mut child = Command::new("/bin/zsh")
        .args(["-lc", &script])
        .current_dir(cwd)
        .spawn()
        .map_err(|e| e.to_string())?;

    let deadline = Instant::now() + AGENT_TIMEOUT;
    let status = loop {
        match child.try_wait().map_err(|e| e.to_string())? {
            Some(status) => break status,
            None if Instant::now() >= deadline => {
                let _ = child.kill();
                return Err("The agent took longer than five minutes and was stopped".into());
            }
            None => std::thread::sleep(Duration::from_millis(250)),
        }
    };

    let text = fs::read_to_string(&out_file).unwrap_or_default();
    if !status.success() && text.trim().is_empty() {
        let stderr = fs::read_to_string(&err_file).unwrap_or_default();
        let tail = stderr
            .trim()
            .lines()
            .rev()
            .take(4)
            .collect::<Vec<_>>()
            .join(" ");
        return Err(if tail.is_empty() {
            format!(
                "{} exited without saying anything",
                invocation(provider, "")
            )
        } else {
            tail
        });
    }
    Ok(text.trim().to_string())
}

fn voice_lines(voice: &Voice) -> String {
    let mut lines = String::new();
    if !voice.audience.trim().is_empty() {
        lines.push_str(&format!("Written for: {}\n", voice.audience.trim()));
    }
    if !voice.tone.trim().is_empty() {
        lines.push_str(&format!("It should sound: {}\n", voice.tone.trim()));
    }
    if !voice.takeaway.trim().is_empty() {
        lines.push_str(&format!(
            "The reader should walk away with: {}\n",
            voice.takeaway.trim()
        ));
    }
    lines
}

fn transcript(messages: &[ChatMessage]) -> String {
    messages
        .iter()
        .map(|m| {
            let who = if m.role == "user" { "Owner" } else { "You" };
            format!("{who}: {}", m.text.trim())
        })
        .collect::<Vec<_>>()
        .join("\n\n")
}

fn header(info: &ProjectRunInfo) -> String {
    format!(
        "Project: {}\nPath: {}\nFramework: {}\n",
        info.name, info.path, info.framework
    )
}

pub fn chat_prompt(
    info: &ProjectRunInfo,
    voice: &Voice,
    messages: &[ChatMessage],
    message: &str,
) -> String {
    let mut prompt = String::from(
        "You are helping the person who built this project talk about it for a portfolio piece. \
         Read the code and the README in this directory before answering — be specific about \
         what is actually here, never generic.\n\n",
    );
    prompt.push_str(&header(info));
    let voice = voice_lines(voice);
    if !voice.is_empty() {
        prompt.push_str(&format!("\n{voice}"));
    }
    if !messages.is_empty() {
        prompt.push_str(&format!(
            "\nConversation so far:\n{}\n",
            transcript(messages)
        ));
    }
    prompt.push_str(&format!("\nOwner just said:\n{}\n", message.trim()));
    prompt.push_str(
        "\nReply under 200 words, no preamble. Write it as Markdown: short paragraphs, \
         **bold** for the terms that matter, a bullet list when you are listing things, \
         `backticks` for file and symbol names. No headings, no tables, no code blocks \
         longer than a few lines. Draw out the interesting part — the hard problem, the \
         trade-off, the thing that nearly did not work — and ask one follow-up question \
         if it would sharpen the story.\n",
    );
    prompt
}

pub fn doc_prompt(
    info: &ProjectRunInfo,
    voice: &Voice,
    messages: &[ChatMessage],
    images: &[String],
) -> String {
    let mut prompt = String::from(
        "Write a portfolio piece about this project: a blog-post style write-up that shows off \
         the work. Read the code and the README first so every claim is true of this repo.\n\n",
    );
    prompt.push_str(&header(info));
    let voice = voice_lines(voice);
    if !voice.is_empty() {
        prompt.push_str(&format!("\n{voice}"));
    }
    if !messages.is_empty() {
        prompt.push_str(&format!(
            "\nWhat the owner told you about it:\n{}\n",
            transcript(messages)
        ));
    }
    if images.is_empty() {
        prompt.push_str("\nThere are no screenshots to place.\n");
    } else {
        prompt.push_str(&format!(
            "\nScreenshots to place in the piece, referenced by file name exactly like \
             ![caption](name.png):\n{}\n",
            images
                .iter()
                .map(|name| format!("- {name}"))
                .collect::<Vec<_>>()
                .join("\n")
        ));
    }
    prompt.push_str(
        "\nStructure it as: a title, a one-line hook, what it is, the problem it solves, \
         how it works, the hardest part, and what you would do next. Place the screenshots \
         where they earn their spot. Output Markdown and nothing else — no code fence around \
         the whole document, no commentary before or after.\n",
    );
    prompt
}

fn strip_document_fence(text: &str) -> String {
    let trimmed = text.trim();
    if !trimmed.starts_with("```") {
        return trimmed.to_string();
    }
    let body = trimmed.trim_start_matches("```");
    let body = body
        .strip_prefix("markdown")
        .or_else(|| body.strip_prefix("md"))
        .unwrap_or(body);
    body.trim_start_matches('\n')
        .trim_end()
        .trim_end_matches("```")
        .trim_end()
        .to_string()
}

#[tauri::command]
pub async fn portfolio_chat(
    id: i64,
    provider: AiProvider,
    message: String,
) -> Result<Vec<ChatMessage>, String> {
    let info = store::get_project_run_info(id)?;
    let voice: Voice = read_json(&voice_path(id));
    let mut messages: Vec<ChatMessage> = read_json(&chat_path(id));

    let prompt = chat_prompt(&info, &voice, &messages, &message);
    let reply = ask_agent(id, provider, &info.path, &prompt, "chat")?;

    messages.push(ChatMessage {
        role: "user".into(),
        text: message,
    });
    messages.push(ChatMessage {
        role: "agent".into(),
        text: reply,
    });
    write_json(&chat_path(id), &messages)?;
    Ok(messages)
}

#[tauri::command]
pub async fn portfolio_generate(id: i64, provider: AiProvider) -> Result<String, String> {
    let info = store::get_project_run_info(id)?;
    let voice: Voice = read_json(&voice_path(id));
    let messages: Vec<ChatMessage> = read_json(&chat_path(id));
    let images = list_images(id);

    let prompt = doc_prompt(&info, &voice, &messages, &images);
    let raw = ask_agent(id, provider, &info.path, &prompt, "doc")?;
    let doc = strip_document_fence(&raw);
    if doc.is_empty() {
        return Err("The agent returned an empty document".into());
    }
    portfolio_save_doc(id, doc.clone())?;
    Ok(doc)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn info() -> ProjectRunInfo {
        ProjectRunInfo {
            id: 4,
            path: "/tmp/olgarcade".into(),
            name: "OLGArcade".into(),
            run_cmd: None,
            trusted: true,
            deps_installed: true,
            has_env_example: false,
            port: None,
            framework: "vite".into(),
            readme_summary: None,
            status: "runnable".into(),
            git_remote: None,
            run_url: None,
        }
    }

    fn voice() -> Voice {
        Voice {
            audience: "hiring managers".into(),
            tone: "dry and confident".into(),
            takeaway: String::new(),
        }
    }

    #[test]
    fn chat_prompt_carries_voice_and_history() {
        let messages = vec![ChatMessage {
            role: "user".into(),
            text: "the websocket layer was the hard bit".into(),
        }];
        let prompt = chat_prompt(&info(), &voice(), &messages, "why?");
        assert!(prompt.contains("hiring managers"));
        assert!(prompt.contains("dry and confident"));
        assert!(!prompt.contains("walk away with"));
        assert!(prompt.contains("Owner: the websocket layer"));
        assert!(prompt.contains("why?"));
    }

    #[test]
    fn doc_prompt_names_every_screenshot() {
        let images = vec!["shot-1.png".to_string(), "shot-2.png".to_string()];
        let prompt = doc_prompt(&info(), &Voice::default(), &[], &images);
        assert!(prompt.contains("- shot-1.png"));
        assert!(prompt.contains("- shot-2.png"));
        assert!(doc_prompt(&info(), &Voice::default(), &[], &[]).contains("no screenshots"));
    }

    #[test]
    fn document_fence_is_stripped_but_inner_code_survives() {
        let fenced = "```markdown\n# Title\n\n```js\nconst a = 1\n```\n\ndone\n```";
        let stripped = strip_document_fence(fenced);
        assert!(stripped.starts_with("# Title"));
        assert!(stripped.contains("const a = 1"));
        assert!(stripped.ends_with("done"));
        assert_eq!(strip_document_fence("  # Plain\n"), "# Plain");
    }

    #[test]
    fn image_names_cannot_escape_the_portfolio_folder() {
        assert!(portfolio_remove_image(1, "../../workbench.db".into()).is_err());
        assert!(portfolio_remove_image(1, "nested/thing.png".into()).is_err());
    }

    #[test]
    fn prompts_are_escaped_for_the_shell() {
        let prompt = "it's \"fine\"";
        assert_eq!(
            invocation(AiProvider::ClaudeCode, prompt),
            "claude -p 'it'\\''s \"fine\"'"
        );
    }
}
