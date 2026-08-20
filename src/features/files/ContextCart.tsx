import { useMemo } from "react";
import { CopyIcon, RocketIcon, Trash2Icon, XIcon } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useContextCart, type CartEntry } from "@/hooks/useContextCart";
import { iconForKind } from "@/features/files/lib/cartIcon";
import type { AiProvider } from "@/lib/types";

interface ContextCartProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function groupByProject(entries: CartEntry[]) {
  const map = new Map<string, { label: string; entries: CartEntry[] }>();
  for (const entry of entries) {
    const key = entry.projectRoot ?? "__ungrouped__";
    const label = entry.projectRoot ? (entry.projectLabel ?? entry.projectRoot) : "Other files";
    const bucket = map.get(key) ?? { label, entries: [] };
    bucket.entries.push(entry);
    map.set(key, bucket);
  }
  return Array.from(map.values());
}

export function ContextCart({ open, onOpenChange }: ContextCartProps) {
  const cart = useContextCart();
  const groups = useMemo(() => groupByProject(cart.entries), [cart.entries]);

  function launch(provider: AiProvider) {
    cart.launchAi(provider);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="inset-y-0 left-auto right-0 top-0 flex h-full max-h-none w-full max-w-sm translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-l border-border p-0 sm:max-w-sm data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right"
      >
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
          <span className="flex flex-col">
            <span className="text-sm font-semibold">Context · {cart.count}</span>
            <span className="text-[11px] font-normal text-muted-foreground">
              Files staged for an AI prompt
            </span>
          </span>
          <div className="flex items-center gap-1">
            {cart.count > 0 && (
              <Button variant="ghost" size="icon-sm" onClick={cart.clear} title="Clear all" className="cursor-pointer">
                <Trash2Icon className="size-3.5" />
              </Button>
            )}
            <Button variant="ghost" size="icon-sm" onClick={() => onOpenChange(false)}>
              <XIcon className="size-3.5" />
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {cart.count === 0 && (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Empty. Press ⌘⏎ on a file or folder to add it here.
            </div>
          )}
          {groups.map((group) => (
            <div key={group.label} className="mb-3">
              <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
                {group.label}
              </div>
              {group.entries.map((entry) => {
                const Icon = iconForKind(entry.kind);
                return (
                  <div key={entry.path} className="group flex h-7 items-center gap-2 rounded px-2 hover:bg-secondary/50">
                    <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate text-xs">{entry.name}</span>
                    <button
                      type="button"
                      onClick={() => cart.remove(entry.path)}
                      className="cursor-pointer hidden size-4 shrink-0 items-center justify-center text-muted-foreground hover:text-destructive group-hover:flex"
                    >
                      <XIcon className="size-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-border p-3">
          <Button onClick={cart.copyAsContext} disabled={cart.count === 0} className="cursor-pointer gap-2">
            <CopyIcon className="size-4" />
            Copy as prompt context
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={cart.count === 0} className="cursor-pointer gap-2">
                <RocketIcon className="size-4" />
                Launch AI
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onSelect={() => launch("claude-code")}>Claude Code</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => launch("codex")}>Codex</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </DialogContent>
    </Dialog>
  );
}
