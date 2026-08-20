import type { BrokenReason } from "@/lib/types";

interface ReasonCopy {
  title: string;
  detail: string;
}

const COPY: Record<BrokenReason, ReasonCopy> = {
  "missing-env": {
    title: "Missing environment file",
    detail: "This project has a .env.example but no .env, so it can't start.",
  },
  "deps-not-installed": {
    title: "Dependencies not installed",
    detail: "Install the project's packages first, then run it again.",
  },
  "port-in-use": {
    title: "Port already in use",
    detail: "Something else is listening on the port this project wants.",
  },
  crashed: {
    title: "Crashed on startup",
    detail: "The process exited before it started serving. See the run log.",
  },
  timeout: {
    title: "Timed out",
    detail: "The project never responded on its URL within 45 seconds.",
  },
  "no-run-command": {
    title: "No run command",
    detail: "Workbench couldn't work out how to start this project.",
  },
};

export function explainBrokenReason(reason: BrokenReason | null | undefined): ReasonCopy | null {
  if (!reason) return null;
  return COPY[reason] ?? { title: "Could not start", detail: String(reason) };
}
