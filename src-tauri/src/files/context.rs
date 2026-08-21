use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};

use serde::Deserialize;

use crate::files::fs_ops::guard_existing;
use crate::files::listing::detect_framework_cheap;

const MAX_FILE_BYTES: u64 = 200_000;
const BINARY_SNIFF_BYTES: usize = 8_000;
const DEFAULT_BUDGET: usize = 120_000;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContextOptions {
    #[serde(default = "default_budget")]
    pub max_chars: usize,
}

fn default_budget() -> usize {
    DEFAULT_BUDGET
}

impl Default for ContextOptions {
    fn default() -> Self {
        ContextOptions {
            max_chars: DEFAULT_BUDGET,
        }
    }
}

#[derive(Default)]
struct TreeNode {
    children: BTreeMap<String, TreeNode>,
    is_file: bool,
}

fn insert_path(root: &mut TreeNode, components: &[String]) {
    let Some((head, rest)) = components.split_first() else {
        return;
    };
    let entry = root.children.entry(head.clone()).or_default();
    if rest.is_empty() {
        entry.is_file = true;
    } else {
        insert_path(entry, rest);
    }
}

fn render_tree(node: &TreeNode, prefix: &str, out: &mut String) {
    let entries: Vec<_> = node.children.iter().collect();
    for (i, (name, child)) in entries.iter().enumerate() {
        let is_last = i == entries.len() - 1;
        let connector = if is_last { "└── " } else { "├── " };
        let label = if child.is_file {
            name.to_string()
        } else {
            format!("{name}/")
        };
        out.push_str(&format!("{prefix}{connector}{label}\n"));
        if !child.is_file {
            let child_prefix = format!("{prefix}{}", if is_last { "    " } else { "│   " });
            render_tree(child, &child_prefix, out);
        }
    }
}

fn common_ancestor(paths: &[PathBuf]) -> PathBuf {
    if paths.is_empty() {
        return PathBuf::new();
    }
    let component_lists: Vec<Vec<std::ffi::OsString>> = paths
        .iter()
        .map(|p| {
            p.components()
                .map(|c| c.as_os_str().to_os_string())
                .collect()
        })
        .collect();
    let min_len = component_lists.iter().map(|c| c.len()).min().unwrap_or(0);
    let mut common = Vec::new();
    for i in 0..min_len {
        let candidate = &component_lists[0][i];
        if component_lists[1..].iter().all(|c| &c[i] == candidate) {
            common.push(candidate.clone());
        } else {
            break;
        }
    }
    common.into_iter().collect()
}

fn lang_tag(extension: &Option<String>) -> String {
    let Some(ext) = extension else {
        return String::new();
    };
    let lowered = ext.to_lowercase();
    let tag = match lowered.as_str() {
        "ts" => "typescript",
        "tsx" => "tsx",
        "js" | "mjs" | "cjs" => "javascript",
        "jsx" => "jsx",
        "rs" => "rust",
        "py" => "python",
        "rb" => "ruby",
        "go" => "go",
        "php" => "php",
        "java" => "java",
        "kt" => "kotlin",
        "swift" => "swift",
        "c" => "c",
        "h" | "hpp" => "cpp",
        "cpp" | "cc" => "cpp",
        "cs" => "csharp",
        "css" => "css",
        "scss" => "scss",
        "html" => "html",
        "json" => "json",
        "yaml" | "yml" => "yaml",
        "toml" => "toml",
        "md" => "markdown",
        "sh" | "bash" => "bash",
        "sql" => "sql",
        "graphql" | "gql" => "graphql",
        "vue" => "vue",
        "svelte" => "svelte",
        other => other,
    };
    tag.to_string()
}

fn is_binary(bytes: &[u8]) -> bool {
    bytes.iter().take(BINARY_SNIFF_BYTES).any(|b| *b == 0)
}

fn collect_files(path: &Path) -> Vec<PathBuf> {
    if path.is_file() {
        return vec![path.to_path_buf()];
    }
    let mut files = Vec::new();
    let walker = ignore::WalkBuilder::new(path)
        .hidden(false)
        .git_ignore(true)
        .git_exclude(true)
        .build();
    for entry in walker.flatten() {
        if entry.path().components().any(|c| c.as_os_str() == ".git") {
            continue;
        }
        if entry.file_type().map(|t| t.is_file()).unwrap_or(false) {
            files.push(entry.into_path());
        }
    }
    files
}

fn nearest_project(start: &Path) -> Option<(PathBuf, String)> {
    let mut current = Some(start);
    while let Some(dir) = current {
        if let Some(framework) = detect_framework_cheap(dir) {
            return Some((dir.to_path_buf(), framework));
        }
        current = dir.parent();
    }
    None
}

pub fn build_context(
    paths: &[String],
    opts: &ContextOptions,
    roots: &[PathBuf],
) -> Result<String, String> {
    if paths.is_empty() {
        return Err("no paths selected".to_string());
    }

    let resolved: Vec<PathBuf> = paths
        .iter()
        .map(|p| guard_existing(p, roots))
        .collect::<Result<_, _>>()?;

    let root = {
        let ancestor = common_ancestor(&resolved);
        if ancestor.is_dir() && resolved.len() > 1 {
            ancestor
        } else {
            ancestor.parent().map(PathBuf::from).unwrap_or(ancestor)
        }
    };

    let mut files: Vec<PathBuf> = resolved.iter().flat_map(|p| collect_files(p)).collect();
    files.sort();
    files.dedup();

    let mut tree_root = TreeNode::default();
    let mut rel_paths: Vec<(PathBuf, Vec<String>)> = Vec::new();
    for file in &files {
        let rel = file.strip_prefix(&root).unwrap_or(file);
        let components: Vec<String> = rel
            .components()
            .map(|c| c.as_os_str().to_string_lossy().to_string())
            .collect();
        if components.is_empty() {
            continue;
        }
        insert_path(&mut tree_root, &components);
        rel_paths.push((file.clone(), components));
    }
    rel_paths.sort_by(|a, b| a.1.join("/").cmp(&b.1.join("/")));

    let mut tree_str = String::new();
    render_tree(&tree_root, "", &mut tree_str);

    let mut output = String::new();
    output.push_str(&format!("# Context: {}\n\n", root.display()));

    if let Some((project_root, framework)) = nearest_project(&root) {
        output.push_str(&format!(
            "Stack: {framework} ({})\n\n",
            project_root.display()
        ));
    }

    output.push_str("```\n");
    output.push_str(&tree_str);
    output.push_str("```\n");

    let mut dropped: Vec<String> = Vec::new();

    for (file, components) in &rel_paths {
        let rel_display = components.join("/");
        let metadata = match fs::metadata(file) {
            Ok(m) => m,
            Err(_) => {
                dropped.push(rel_display);
                continue;
            }
        };
        if metadata.len() > MAX_FILE_BYTES {
            dropped.push(rel_display);
            continue;
        }
        let bytes = match fs::read(file) {
            Ok(b) => b,
            Err(_) => {
                dropped.push(rel_display);
                continue;
            }
        };
        if is_binary(&bytes) {
            dropped.push(rel_display);
            continue;
        }
        let content = String::from_utf8_lossy(&bytes);
        let extension = file.extension().map(|e| e.to_string_lossy().to_string());
        let lang = lang_tag(&extension);
        let block = format!("\n### {rel_display}\n```{lang}\n{content}\n```\n");

        if output.len() + block.len() > opts.max_chars {
            dropped.push(rel_display);
            continue;
        }
        output.push_str(&block);
    }

    if !dropped.is_empty() {
        output.push_str(&format!(
            "\n> Truncated: {} file(s) skipped (binary, over {} bytes, or over the {}-character budget): {}\n",
            dropped.len(),
            MAX_FILE_BYTES,
            opts.max_chars,
            dropped.join(", ")
        ));
    }

    Ok(output)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs as stdfs;

    fn tempdir() -> PathBuf {
        let mut dir = std::env::temp_dir();
        let unique = format!(
            "workbench-context-test-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        );
        dir.push(unique);
        stdfs::create_dir_all(&dir).unwrap();
        dir.canonicalize().unwrap()
    }

    #[test]
    fn skips_binary_files() {
        let root = tempdir();
        stdfs::write(root.join("data.bin"), [0u8, 1, 2, 0, 3]).unwrap();
        stdfs::write(root.join("main.rs"), "fn main() {}").unwrap();
        let roots = vec![root.clone()];
        let opts = ContextOptions::default();
        let output = build_context(&[root.to_string_lossy().to_string()], &opts, &roots).unwrap();
        assert!(output.contains("main.rs"));
        assert!(!output.contains("```\nfn main"));
        assert!(output.contains("data.bin"));
        assert!(output.contains("Truncated"));
    }

    #[test]
    fn truncates_when_over_budget() {
        let root = tempdir();
        stdfs::write(root.join("a.txt"), "a".repeat(100)).unwrap();
        stdfs::write(root.join("b.txt"), "b".repeat(100)).unwrap();
        let roots = vec![root.clone()];
        let opts = ContextOptions { max_chars: 150 };
        let output = build_context(&[root.to_string_lossy().to_string()], &opts, &roots).unwrap();
        assert!(output.contains("Truncated"));
    }

    #[test]
    fn includes_full_content_within_budget() {
        let root = tempdir();
        stdfs::write(root.join("a.txt"), "hello world").unwrap();
        let roots = vec![root.clone()];
        let opts = ContextOptions::default();
        let output = build_context(&[root.to_string_lossy().to_string()], &opts, &roots).unwrap();
        assert!(output.contains("hello world"));
        assert!(!output.contains("Truncated"));
    }
}
