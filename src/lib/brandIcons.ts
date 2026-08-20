import * as si from "simple-icons";
import type { Framework } from "@/lib/types";

export interface BrandMark {
  path: string;
  hex: string;
  title: string;
}

const MIN_LUMINANCE = 0.32;

function luminance(hex: string): number {
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function lift(hex: string): string {
  const channels = [hex.slice(0, 2), hex.slice(2, 4), hex.slice(4, 6)].map((c) =>
    parseInt(c, 16),
  );
  const current = luminance(hex);
  if (current >= MIN_LUMINANCE) return `#${hex}`;
  const boost = (MIN_LUMINANCE - current) * 255 * 1.9;
  return `#${channels
    .map((c) => Math.min(255, Math.round(c + boost)).toString(16).padStart(2, "0"))
    .join("")}`;
}

function mark(key: string): BrandMark | null {
  const icon = (si as Record<string, unknown>)[key] as
    | { path: string; hex: string; title: string }
    | undefined;
  if (!icon) return null;
  return { path: icon.path, hex: lift(icon.hex), title: icon.title };
}

const FRAMEWORK_KEYS: Record<Framework, string> = {
  nextjs: "siNextdotjs",
  vite: "siVite",
  tauri: "siTauri",
  rails: "siRubyonrails",
  "chrome-extension": "siGooglechrome",
  godot: "siGodotengine",
  go: "siGo",
  rust: "siRust",
  python: "siPython",
  wordpress: "siWordpress",
  node: "siNodedotjs",
  static: "siHtml5",
  unknown: "",
};

const EXTRA_KEYS: Record<string, string> = {
  react: "siReact",
  vue: "siVuedotjs",
  svelte: "siSvelte",
  astro: "siAstro",
  solid: "siSolid",
  angular: "siAngular",
  nuxt: "siNuxt",
  laravel: "siLaravel",
  php: "siPhp",
  django: "siDjango",
  flask: "siFlask",
  elixir: "siElixir",
  phoenix: "siPhoenixframework",
  docker: "siDocker",
  ruby: "siRuby",
  typescript: "siTypescript",
  javascript: "siJavascript",
  electron: "siElectron",
  expo: "siExpo",
  flutter: "siFlutter",
  remix: "siRemix",
  sveltekit: "siSvelte",
  supabase: "siSupabase",
  tailwindcss: "siTailwindcss",
  anthropic: "siAnthropic",
  googlegemini: "siGooglegemini",
  cursor: "siCursor",
  githubcopilot: "siGithubcopilot",
  opencode: "siOpencode",
  cline: "siCline",
  ollama: "siOllama",
  railway: "siRailway",
  sentry: "siSentry",
  github: "siGithub",
};

export function frameworkBrand(framework: Framework): BrandMark | null {
  const key = FRAMEWORK_KEYS[framework];
  return key ? mark(key) : null;
}

export function brandByName(name: string): BrandMark | null {
  const normalized = name.toLowerCase().replace(/[^a-z]/g, "");
  const key = EXTRA_KEYS[normalized] ?? FRAMEWORK_KEYS[normalized as Framework];
  return key ? mark(key) : null;
}
