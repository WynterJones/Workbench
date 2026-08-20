import {
  AppWindow,
  Binary,
  Box,
  Cog,
  Feather,
  FileCode,
  Gamepad2,
  Gem,
  Hexagon,
  Newspaper,
  Puzzle,
  Triangle,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { Framework } from "./types";

const DIVISIONS: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { amount: 60, unit: "seconds" },
  { amount: 60, unit: "minutes" },
  { amount: 24, unit: "hours" },
  { amount: 7, unit: "days" },
  { amount: 4.34524, unit: "weeks" },
  { amount: 12, unit: "months" },
  { amount: Number.POSITIVE_INFINITY, unit: "years" },
];

const RELATIVE_FORMATTER = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function relativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "unknown";

  let duration = (date.getTime() - Date.now()) / 1000;
  for (const division of DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return RELATIVE_FORMATTER.format(Math.round(duration), division.unit);
    }
    duration /= division.amount;
  }
  return "unknown";
}

export function daysSince(iso: string): number {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
}

export function formatLoc(loc: number): string {
  return new Intl.NumberFormat("en-US").format(loc);
}

export function truncatePath(path: string, maxLength = 40): string {
  if (path.length <= maxLength) return path;
  const segments = path.split("/").filter(Boolean);
  const tail = segments.slice(-2).join("/");
  const truncated = `…/${tail}`;
  return truncated.length <= maxLength ? truncated : `…${path.slice(-(maxLength - 1))}`;
}

const FRAMEWORK_LABELS: Record<Framework, string> = {
  nextjs: "Next.js",
  vite: "Vite",
  tauri: "Tauri",
  rails: "Rails",
  "chrome-extension": "Chrome Extension",
  godot: "Godot",
  go: "Go",
  rust: "Rust",
  python: "Python",
  wordpress: "WordPress",
  node: "Node",
  static: "Static",
  unknown: "Unknown",
};

export function frameworkLabel(framework: Framework): string {
  return FRAMEWORK_LABELS[framework] ?? "Unknown";
}

const FRAMEWORK_ICONS: Record<Framework, LucideIcon> = {
  nextjs: Triangle,
  vite: Zap,
  tauri: AppWindow,
  rails: Gem,
  "chrome-extension": Puzzle,
  godot: Gamepad2,
  go: Feather,
  rust: Cog,
  python: Binary,
  wordpress: Newspaper,
  node: Hexagon,
  static: FileCode,
  unknown: Box,
};

export function frameworkIcon(framework: Framework): LucideIcon {
  return FRAMEWORK_ICONS[framework] ?? Box;
}

export function formatShipScore(score: number | null): string {
  if (score === null) return "—";
  return `${Math.round(score)}`;
}
