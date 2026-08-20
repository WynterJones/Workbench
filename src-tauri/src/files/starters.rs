use std::fs;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};

use crate::files::fs_ops::guard_existing;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StarterTemplate {
    pub id: String,
    pub name: String,
    pub description: String,
    pub stack: Vec<String>,
    pub tags: Vec<String>,
    pub command: String,
    pub docs_url: String,
    pub category: String,
}

const DEFAULT_STARTERS_JSON: &str = r#"[
  {"id":"tanstack-start","name":"TanStack Start","description":"Full-stack React framework on TanStack Router, SSR out of the box.","stack":["React","TypeScript","Vite"],"tags":["fullstack","react","ssr"],"command":"npx create-tsrouter-app@latest {{name}} --add-ons start","docsUrl":"https://tanstack.com/start/latest","category":"web"},
  {"id":"tanstack-router-query","name":"TanStack Router + Query","description":"Type-safe React router with TanStack Query wired in.","stack":["React","TypeScript","Vite"],"tags":["spa","react","data-fetching"],"command":"npx create-tsrouter-app@latest {{name}} --add-ons tanstack-query","docsUrl":"https://tanstack.com/router/latest","category":"web"},
  {"id":"nextjs","name":"Next.js","description":"React framework with app router, SSR, and API routes.","stack":["React","TypeScript","Next.js"],"tags":["fullstack","react","ssr"],"command":"npx create-next-app@latest {{name}}","docsUrl":"https://nextjs.org/docs","category":"web"},
  {"id":"vite-react-ts","name":"Vite React-TS","description":"Bare Vite + React + TypeScript starter, no framework opinions.","stack":["React","TypeScript","Vite"],"tags":["spa","react"],"command":"npm create vite@latest {{name}} -- --template react-ts","docsUrl":"https://vite.dev/guide/","category":"web"},
  {"id":"vite-vue","name":"Vite Vue","description":"Vite + Vue 3 + TypeScript starter.","stack":["Vue","TypeScript","Vite"],"tags":["spa","vue"],"command":"npm create vite@latest {{name}} -- --template vue-ts","docsUrl":"https://vite.dev/guide/","category":"web"},
  {"id":"vite-svelte","name":"Vite Svelte","description":"Vite + Svelte + TypeScript starter.","stack":["Svelte","TypeScript","Vite"],"tags":["spa","svelte"],"command":"npm create vite@latest {{name}} -- --template svelte-ts","docsUrl":"https://vite.dev/guide/","category":"web"},
  {"id":"vite-solid","name":"Vite Solid","description":"Vite + SolidJS + TypeScript starter.","stack":["Solid","TypeScript","Vite"],"tags":["spa","solid"],"command":"npm create vite@latest {{name}} -- --template solid-ts","docsUrl":"https://vite.dev/guide/","category":"web"},
  {"id":"astro","name":"Astro","description":"Content-focused framework, ships zero JS by default.","stack":["Astro","TypeScript"],"tags":["content","static","islands"],"command":"npm create astro@latest {{name}}","docsUrl":"https://docs.astro.build","category":"web"},
  {"id":"remix","name":"Remix","description":"React framework built on web fundamentals and nested routing.","stack":["React","TypeScript","Remix"],"tags":["fullstack","react","ssr"],"command":"npx create-remix@latest {{name}}","docsUrl":"https://remix.run/docs","category":"web"},
  {"id":"nuxt","name":"Nuxt","description":"Vue meta-framework with SSR, file-based routing, and modules.","stack":["Vue","TypeScript","Nuxt"],"tags":["fullstack","vue","ssr"],"command":"npx nuxi@latest init {{name}}","docsUrl":"https://nuxt.com/docs","category":"web"},
  {"id":"sveltekit","name":"SvelteKit","description":"Svelte's official app framework with SSR and routing.","stack":["Svelte","TypeScript","SvelteKit"],"tags":["fullstack","svelte","ssr"],"command":"npx sv create {{name}}","docsUrl":"https://svelte.dev/docs/kit","category":"web"},
  {"id":"expo","name":"Expo","description":"React Native toolchain for iOS, Android, and web from one codebase.","stack":["React Native","TypeScript","Expo"],"tags":["mobile","react-native"],"command":"npx create-expo-app@latest {{name}}","docsUrl":"https://docs.expo.dev","category":"mobile"},
  {"id":"tauri-react","name":"Tauri React","description":"Tauri desktop shell with a React + TypeScript frontend.","stack":["Rust","React","TypeScript","Tauri"],"tags":["desktop","rust","react"],"command":"npm create tauri-app@latest {{name}} -- --template react-ts","docsUrl":"https://v2.tauri.app/start/","category":"desktop"},
  {"id":"electron","name":"Electron","description":"Cross-platform desktop shell with Node + Chromium.","stack":["JavaScript","Electron"],"tags":["desktop","node"],"command":"npx create-electron-app@latest {{name}}","docsUrl":"https://www.electronjs.org/docs/latest","category":"desktop"},
  {"id":"hono","name":"Hono","description":"Ultra-fast web framework that runs on any JS runtime.","stack":["TypeScript","Hono"],"tags":["api","edge","node"],"command":"npm create hono@latest {{name}}","docsUrl":"https://hono.dev/docs","category":"backend"},
  {"id":"elysia","name":"Elysia","description":"Bun-native web framework with end-to-end type safety.","stack":["TypeScript","Bun","Elysia"],"tags":["api","bun"],"command":"bun create elysia {{name}}","docsUrl":"https://elysiajs.com","category":"backend"},
  {"id":"express","name":"Express","description":"Minimal, unopinionated Node.js web framework.","stack":["Node.js","Express"],"tags":["api","node"],"command":"npx express-generator {{name}}","docsUrl":"https://expressjs.com","category":"backend"},
  {"id":"fastapi","name":"FastAPI","description":"Full-stack template with FastAPI backend and typed Python.","stack":["Python","FastAPI"],"tags":["api","python"],"command":"uvx --from cookiecutter cookiecutter gh:tiangolo/full-stack-fastapi-template","docsUrl":"https://fastapi.tiangolo.com","category":"backend"},
  {"id":"django","name":"Django","description":"Batteries-included Python web framework.","stack":["Python","Django"],"tags":["fullstack","python"],"command":"django-admin startproject {{name}}","docsUrl":"https://docs.djangoproject.com","category":"backend"},
  {"id":"rails","name":"Rails","description":"Convention-over-configuration Ruby web framework.","stack":["Ruby","Rails"],"tags":["fullstack","ruby"],"command":"rails new {{name}}","docsUrl":"https://guides.rubyonrails.org","category":"backend"},
  {"id":"laravel","name":"Laravel","description":"Expressive PHP web framework.","stack":["PHP","Laravel"],"tags":["fullstack","php"],"command":"composer create-project laravel/laravel {{name}}","docsUrl":"https://laravel.com/docs","category":"backend"},
  {"id":"go-chi","name":"Go chi","description":"Lightweight, idiomatic Go router for building HTTP services.","stack":["Go","chi"],"tags":["api","go"],"command":"mkdir {{name}} && cd {{name}} && go mod init {{name}} && go get github.com/go-chi/chi/v5","docsUrl":"https://go-chi.io","category":"backend"},
  {"id":"axum","name":"Rust Axum","description":"Ergonomic async web framework built on Tokio and Tower.","stack":["Rust","Axum","Tokio"],"tags":["api","rust"],"command":"cargo new {{name}} && cd {{name}} && cargo add axum tokio -F tokio/full","docsUrl":"https://docs.rs/axum/latest/axum/","category":"backend"},
  {"id":"phoenix","name":"Phoenix","description":"Productive, reliable Elixir web framework on the BEAM.","stack":["Elixir","Phoenix"],"tags":["fullstack","elixir"],"command":"mix phx.new {{name}}","docsUrl":"https://hexdocs.pm/phoenix","category":"backend"},
  {"id":"shadcn-dashboard","name":"shadcn Dashboard","description":"Production-ready Next.js admin dashboard built on shadcn/ui.","stack":["React","TypeScript","Next.js","shadcn/ui"],"tags":["dashboard","admin","react"],"command":"bunx degit Kiranism/next-shadcn-dashboard-starter {{name}}","docsUrl":"https://github.com/Kiranism/next-shadcn-dashboard-starter","category":"web"},
  {"id":"chrome-mv3","name":"Chrome MV3 Extension","description":"Manifest V3 browser extension via the Plasmo framework.","stack":["TypeScript","Plasmo"],"tags":["extension","chrome"],"command":"bun create plasmo {{name}}","docsUrl":"https://docs.plasmo.com","category":"extension"},
  {"id":"raycast-extension","name":"Raycast Extension","description":"Official Raycast extension starter with template picker.","stack":["TypeScript","Raycast API"],"tags":["extension","raycast"],"command":"npm init raycast-extension","docsUrl":"https://developers.raycast.com","category":"extension"},
  {"id":"oclif-cli","name":"oclif CLI","description":"Salesforce's framework for building polished Node CLIs.","stack":["TypeScript","Node.js","oclif"],"tags":["cli","node"],"command":"npx oclif generate {{name}}","docsUrl":"https://oclif.io","category":"cli"},
  {"id":"clap-cli","name":"Rust clap CLI","description":"Rust CLI scaffolded with the clap argument parser.","stack":["Rust","clap"],"tags":["cli","rust"],"command":"cargo generate thesurlydev/clap-cli-template --name {{name}}","docsUrl":"https://docs.rs/clap/latest/clap/","category":"cli"},
  {"id":"python-package","name":"Python Package","description":"Standard packaging layout via the classic pypackage cookiecutter.","stack":["Python"],"tags":["package","python"],"command":"uvx --from cookiecutter cookiecutter gh:audreyfeldroy/cookiecutter-pypackage","docsUrl":"https://github.com/audreyfeldroy/cookiecutter-pypackage","category":"package"},
  {"id":"turborepo","name":"Turborepo Monorepo","description":"High-performance build system for JS/TS monorepos.","stack":["TypeScript","Turborepo"],"tags":["monorepo","tooling"],"command":"npx create-turbo@latest {{name}}","docsUrl":"https://turborepo.dev/docs","category":"monorepo"}
]"#;

fn starters_path() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join(".workbench")
        .join("starters.json")
}

fn default_registry() -> Vec<StarterTemplate> {
    serde_json::from_str(DEFAULT_STARTERS_JSON).unwrap_or_default()
}

fn load_registry() -> Result<Vec<StarterTemplate>, String> {
    let path = starters_path();
    if !path.exists() {
        let defaults = default_registry();
        save_registry(&defaults)?;
        return Ok(defaults);
    }
    let raw = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&raw).map_err(|e| e.to_string())
}

fn save_registry(templates: &[StarterTemplate]) -> Result<(), String> {
    let path = starters_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let raw = serde_json::to_string_pretty(templates).map_err(|e| e.to_string())?;
    fs::write(&path, raw).map_err(|e| e.to_string())
}

pub fn list_starters() -> Result<Vec<StarterTemplate>, String> {
    load_registry()
}

pub fn save_starter(template: StarterTemplate) -> Result<StarterTemplate, String> {
    let mut registry = load_registry()?;
    if let Some(existing) = registry.iter_mut().find(|t| t.id == template.id) {
        *existing = template.clone();
    } else {
        registry.push(template.clone());
    }
    save_registry(&registry)?;
    Ok(template)
}

pub fn delete_starter(id: &str) -> Result<(), String> {
    let mut registry = load_registry()?;
    registry.retain(|t| t.id != id);
    save_registry(&registry)
}

fn shell_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', "'\\''"))
}

pub fn save_folder_as_starter(
    path: &str,
    name: &str,
    roots: &[PathBuf],
) -> Result<StarterTemplate, String> {
    let resolved = guard_existing(path, roots)?;
    if !resolved.is_dir() {
        return Err(format!("{path} is not a directory"));
    }
    let id = slugify(name);
    let template = StarterTemplate {
        id,
        name: name.to_string(),
        description: format!("Local template copied from {}", resolved.display()),
        stack: Vec::new(),
        tags: vec!["local".to_string()],
        command: format!("cp -R {} ./{{{{name}}}}", shell_quote(&resolved.to_string_lossy())),
        docs_url: String::new(),
        category: "local".to_string(),
    };
    save_starter(template)
}

fn slugify(name: &str) -> String {
    let mut slug = String::new();
    let mut last_dash = false;
    for ch in name.to_lowercase().chars() {
        if ch.is_ascii_alphanumeric() {
            slug.push(ch);
            last_dash = false;
        } else if !last_dash {
            slug.push('-');
            last_dash = true;
        }
    }
    slug.trim_matches('-').to_string()
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileTemplate {
    pub id: String,
    pub kind: String,
    pub label: String,
    pub file_name: String,
}

struct TemplateDef {
    id: &'static str,
    framework: &'static str,
    kind: &'static str,
    label: &'static str,
    file_name_pattern: &'static str,
    body: &'static str,
}

const CATALOG: &[TemplateDef] = &[
    TemplateDef {
        id: "react-component",
        framework: "react",
        kind: "component",
        label: "Component",
        file_name_pattern: "{{PascalName}}.tsx",
        body: "import { type FC } from \"react\";\n\ninterface {{PascalName}}Props {}\n\nexport const {{PascalName}}: FC<{{PascalName}}Props> = () => {\n  return <div />;\n};\n",
    },
    TemplateDef {
        id: "react-hook",
        framework: "react",
        kind: "hook",
        label: "Hook",
        file_name_pattern: "use{{PascalName}}.ts",
        body: "import { useState } from \"react\";\n\nexport function use{{PascalName}}() {\n  const [state, setState] = useState(null);\n  return { state, setState };\n}\n",
    },
    TemplateDef {
        id: "react-store",
        framework: "react",
        kind: "store",
        label: "Context store",
        file_name_pattern: "{{PascalName}}Context.tsx",
        body: "import { createContext, useContext, type ReactNode } from \"react\";\n\ninterface {{PascalName}}ContextValue {}\n\nconst {{PascalName}}Context = createContext<{{PascalName}}ContextValue | null>(null);\n\nexport function {{PascalName}}Provider({ children }: { children: ReactNode }) {\n  const value: {{PascalName}}ContextValue = {};\n  return (\n    <{{PascalName}}Context.Provider value={value}>{children}</{{PascalName}}Context.Provider>\n  );\n}\n\nexport function use{{PascalName}}() {\n  const ctx = useContext({{PascalName}}Context);\n  if (!ctx) throw new Error(\"use{{PascalName}} must be used within {{PascalName}}Provider\");\n  return ctx;\n}\n",
    },
    TemplateDef {
        id: "react-test",
        framework: "react",
        kind: "test",
        label: "Test",
        file_name_pattern: "{{PascalName}}.test.ts",
        body: "import { describe, expect, it } from \"vitest\";\n\ndescribe(\"{{PascalName}}\", () => {\n  it(\"works\", () => {\n    expect(true).toBe(true);\n  });\n});\n",
    },
    TemplateDef {
        id: "nextjs-route",
        framework: "nextjs",
        kind: "route",
        label: "App router page",
        file_name_pattern: "{{kebab-name}}/page.tsx",
        body: "export default function {{PascalName}}Page() {\n  return <div>{{PascalName}}</div>;\n}\n",
    },
    TemplateDef {
        id: "nextjs-api",
        framework: "nextjs",
        kind: "api",
        label: "API handler",
        file_name_pattern: "{{kebab-name}}/route.ts",
        body: "import { NextResponse } from \"next/server\";\n\nexport async function GET() {\n  return NextResponse.json({ ok: true });\n}\n",
    },
    TemplateDef {
        id: "nextjs-component",
        framework: "nextjs",
        kind: "component",
        label: "Component",
        file_name_pattern: "{{PascalName}}.tsx",
        body: "import { type FC } from \"react\";\n\ninterface {{PascalName}}Props {}\n\nexport const {{PascalName}}: FC<{{PascalName}}Props> = () => {\n  return <div />;\n};\n",
    },
    TemplateDef {
        id: "nextjs-test",
        framework: "nextjs",
        kind: "test",
        label: "Test",
        file_name_pattern: "{{PascalName}}.test.ts",
        body: "import { describe, expect, it } from \"vitest\";\n\ndescribe(\"{{PascalName}}\", () => {\n  it(\"works\", () => {\n    expect(true).toBe(true);\n  });\n});\n",
    },
    TemplateDef {
        id: "vue-component",
        framework: "vue",
        kind: "component",
        label: "Component",
        file_name_pattern: "{{PascalName}}.vue",
        body: "<script setup lang=\"ts\">\ninterface Props {}\n\ndefineProps<Props>();\n</script>\n\n<template>\n  <div></div>\n</template>\n",
    },
    TemplateDef {
        id: "vue-test",
        framework: "vue",
        kind: "test",
        label: "Test",
        file_name_pattern: "{{PascalName}}.test.ts",
        body: "import { describe, expect, it } from \"vitest\";\nimport { mount } from \"@vue/test-utils\";\nimport {{PascalName}} from \"./{{PascalName}}.vue\";\n\ndescribe(\"{{PascalName}}\", () => {\n  it(\"renders\", () => {\n    const wrapper = mount({{PascalName}});\n    expect(wrapper.exists()).toBe(true);\n  });\n});\n",
    },
    TemplateDef {
        id: "svelte-component",
        framework: "svelte",
        kind: "component",
        label: "Component",
        file_name_pattern: "{{PascalName}}.svelte",
        body: "<script lang=\"ts\">\n  export let name = \"{{PascalName}}\";\n</script>\n\n<div>{name}</div>\n",
    },
    TemplateDef {
        id: "svelte-test",
        framework: "svelte",
        kind: "test",
        label: "Test",
        file_name_pattern: "{{PascalName}}.test.ts",
        body: "import { describe, expect, it } from \"vitest\";\nimport { render } from \"@testing-library/svelte\";\nimport {{PascalName}} from \"./{{PascalName}}.svelte\";\n\ndescribe(\"{{PascalName}}\", () => {\n  it(\"renders\", () => {\n    const { container } = render({{PascalName}});\n    expect(container).toBeTruthy();\n  });\n});\n",
    },
    TemplateDef {
        id: "rails-route",
        framework: "rails",
        kind: "route",
        label: "Controller",
        file_name_pattern: "{{snake_name}}_controller.rb",
        body: "class {{PascalName}}Controller < ApplicationController\n  def index\n    render json: {}\n  end\nend\n",
    },
    TemplateDef {
        id: "rails-test",
        framework: "rails",
        kind: "test",
        label: "Controller test",
        file_name_pattern: "{{snake_name}}_controller_test.rb",
        body: "require \"test_helper\"\n\nclass {{PascalName}}ControllerTest < ActionDispatch::IntegrationTest\n  test \"should get index\" do\n    get {{snake_name}}_index_url\n    assert_response :success\n  end\nend\n",
    },
    TemplateDef {
        id: "go-api",
        framework: "go",
        kind: "api",
        label: "HTTP handler",
        file_name_pattern: "{{snake_name}}.go",
        body: "package handlers\n\nimport \"net/http\"\n\nfunc {{PascalName}}Handler(w http.ResponseWriter, r *http.Request) {\n\tw.WriteHeader(http.StatusOK)\n}\n",
    },
    TemplateDef {
        id: "go-test",
        framework: "go",
        kind: "test",
        label: "Handler test",
        file_name_pattern: "{{snake_name}}_test.go",
        body: "package handlers\n\nimport (\n\t\"net/http/httptest\"\n\t\"testing\"\n)\n\nfunc Test{{PascalName}}Handler(t *testing.T) {\n\tw := httptest.NewRecorder()\n\tr := httptest.NewRequest(\"GET\", \"/\", nil)\n\t{{PascalName}}Handler(w, r)\n\tif w.Code != 200 {\n\t\tt.Fatalf(\"expected 200, got %d\", w.Code)\n\t}\n}\n",
    },
    TemplateDef {
        id: "python-module",
        framework: "python",
        kind: "component",
        label: "Module",
        file_name_pattern: "{{snake_name}}.py",
        body: "class {{PascalName}}:\n    def __init__(self) -> None:\n        pass\n",
    },
    TemplateDef {
        id: "python-test",
        framework: "python",
        kind: "test",
        label: "Test",
        file_name_pattern: "test_{{snake_name}}.py",
        body: "from {{snake_name}} import {{PascalName}}\n\n\ndef test_{{snake_name}}_instantiates():\n    instance = {{PascalName}}()\n    assert instance is not None\n",
    },
];

fn split_words(name: &str) -> Vec<String> {
    let mut words = Vec::new();
    let mut current = String::new();
    for ch in name.chars() {
        if ch == '-' || ch == '_' || ch == ' ' {
            if !current.is_empty() {
                words.push(current.clone());
                current.clear();
            }
        } else if ch.is_uppercase() && !current.is_empty() {
            words.push(current.clone());
            current = ch.to_lowercase().to_string();
        } else {
            current.push(ch.to_ascii_lowercase());
        }
    }
    if !current.is_empty() {
        words.push(current);
    }
    words
}

fn pascal_case(name: &str) -> String {
    split_words(name)
        .iter()
        .map(|w| {
            let mut chars = w.chars();
            match chars.next() {
                Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
                None => String::new(),
            }
        })
        .collect()
}

fn kebab_case(name: &str) -> String {
    split_words(name).join("-")
}

fn snake_case(name: &str) -> String {
    split_words(name).join("_")
}

fn substitute(template: &str, name: &str) -> String {
    template
        .replace("{{PascalName}}", &pascal_case(name))
        .replace("{{kebab-name}}", &kebab_case(name))
        .replace("{{snake_name}}", &snake_case(name))
}

pub fn file_templates(framework: &str) -> Vec<FileTemplate> {
    CATALOG
        .iter()
        .filter(|t| t.framework == framework)
        .map(|t| FileTemplate {
            id: t.id.to_string(),
            kind: t.kind.to_string(),
            label: t.label.to_string(),
            file_name: t.file_name_pattern.to_string(),
        })
        .collect()
}

pub fn create_from_template(
    dir: &str,
    template_id: &str,
    name: &str,
    roots: &[PathBuf],
) -> Result<String, String> {
    let def = CATALOG
        .iter()
        .find(|t| t.id == template_id)
        .ok_or_else(|| format!("unknown template {template_id}"))?;

    let resolved_dir = guard_existing(dir, roots)?;
    if !resolved_dir.is_dir() {
        return Err(format!("{dir} is not a directory"));
    }

    let relative_file_name = substitute(def.file_name_pattern, name);
    let target = resolved_dir.join(&relative_file_name);
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let contents = substitute(def.body, name);
    fs::write(&target, contents).map_err(|e| e.to_string())?;
    Ok(target.to_string_lossy().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_registry_parses_and_has_unique_ids() {
        let registry = default_registry();
        assert!(registry.len() >= 30);
        let mut ids: Vec<&str> = registry.iter().map(|t| t.id.as_str()).collect();
        ids.sort();
        ids.dedup();
        assert_eq!(ids.len(), registry.len());
    }

    #[test]
    fn casing_helpers_match_conventions() {
        assert_eq!(pascal_case("user-profile"), "UserProfile");
        assert_eq!(kebab_case("UserProfile"), "user-profile");
        assert_eq!(snake_case("UserProfile"), "user_profile");
    }

    #[test]
    fn file_templates_filters_by_framework() {
        let templates = file_templates("react");
        assert!(templates.iter().any(|t| t.kind == "component"));
        assert!(templates.iter().all(|t| CATALOG
            .iter()
            .find(|c| c.id == t.id)
            .map(|c| c.framework == "react")
            .unwrap_or(false)));
    }
}
