import { ChevronDownIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUpdateProject } from "@/hooks/useProjects";
import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@/lib/types";

export const STATUS_OPTIONS: { value: ProjectStatus; label: string; dot: string; hint: string }[] = [
  { value: "unknown", label: "Not Sorted", dot: "bg-muted-foreground/50", hint: "Not classified yet" },
  { value: "runnable", label: "Runnable", dot: "bg-ok", hint: "Has a run command" },
  { value: "in-progress", label: "In Progress", dot: "bg-brand", hint: "Actively being built" },
  { value: "experiment", label: "Experiment", dot: "bg-brand/60", hint: "A trial, not headed anywhere" },
  { value: "shipped", label: "Shipped", dot: "bg-ok", hint: "Live somewhere" },
  { value: "broken", label: "Broken", dot: "bg-warn", hint: "Fails to start" },
  { value: "dead", label: "Dead", dot: "bg-destructive", hint: "Abandoned" },
];

interface StatusPickerProps {
  projectId: number;
  status: ProjectStatus;
}

export function StatusPicker({ projectId, status }: StatusPickerProps) {
  const update = useUpdateProject();
  const current = STATUS_OPTIONS.find((option) => option.value === status);

  function choose(next: ProjectStatus) {
    if (next === status) return;
    update.mutate(
      { id: projectId, patch: { status: next } },
      {
        onSuccess: () =>
          toast.success(`Marked as ${STATUS_OPTIONS.find((o) => o.value === next)?.label ?? next}`),
        onError: (error) =>
          toast.error("Could not change status", {
            description: error instanceof Error ? error.message : String(error),
          }),
      },
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="cursor-pointer gap-2"
          disabled={update.isPending}
        >
          <span
            className={cn("size-2 shrink-0 rounded-full", current?.dot ?? "bg-muted-foreground/50")}
          />
          {current?.label ?? "Running"}
          <ChevronDownIcon className="opacity-60" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Project status
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {STATUS_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={() => choose(option.value)}
            className="cursor-pointer gap-2.5 py-2"
          >
            <span className={cn("size-2 shrink-0 rounded-full", option.dot)} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm text-foreground">{option.label}</span>
              <span className="text-[11px] text-muted-foreground">{option.hint}</span>
            </span>
            {option.value === status && (
              <span className="shrink-0 font-mono text-[10px] text-brand">current</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
