import type { BrokenReason, Project, RunResult } from "@/lib/types";

const REASON_LABELS: Record<BrokenReason, string> = {
  "deps-not-installed": "Dependencies are not installed",
  "missing-env": "Missing required .env file",
  "port-in-use": "Port already in use",
  crashed: "Crashed on boot",
  timeout: "Timed out waiting for a response",
  "no-run-command": "No run command could be inferred",
};

interface RunLogPanelProps {
  project: Project;
  lastResult: RunResult | null;
}

export function RunLogPanel({ project, lastResult }: RunLogPanelProps) {
  if (project.status !== "broken" && !lastResult) {
    return <p className="text-sm text-muted-foreground">No run issues to report.</p>;
  }

  const reason = lastResult?.reason ?? project.brokenReason;
  const logTail = lastResult?.logTail;

  return (
    <div className="space-y-2">
      {reason && (
        <p className="text-sm text-warn">{REASON_LABELS[reason] ?? reason}</p>
      )}
      {logTail ? (
        <pre className="max-h-64 overflow-auto rounded-md border border-border bg-secondary/40 p-3 font-mono text-xs text-muted-foreground">
          {logTail}
        </pre>
      ) : (
        <p className="text-xs text-muted-foreground">
          Run this project to capture a fresh log.
        </p>
      )}
    </div>
  );
}
