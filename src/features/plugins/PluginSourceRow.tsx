import { useState } from "react";
import { ChevronDownIcon, ChevronRightIcon, UsersIcon } from "lucide-react";
import { CheckboxDot } from "@/components/CheckboxDot";
import { PluginAuthorPicker } from "@/features/plugins/PluginAuthorPicker";
import type { PluginSource } from "@/hooks/usePluginData";

interface PluginSourceRowProps {
  pluginId: string;
  source: PluginSource;
  checked: boolean;
  authors: string[];
  filterable: boolean;
  onToggle: () => void;
  onToggleAuthor: (author: string) => void;
}

export function PluginSourceRow({
  pluginId,
  source,
  checked,
  authors,
  filterable,
  onToggle,
  onToggleAuthor,
}: PluginSourceRowProps) {
  const [open, setOpen] = useState(false);
  const Chevron = open ? ChevronDownIcon : ChevronRightIcon;

  return (
    <div>
      <div className="flex items-center gap-2.5 rounded px-2 py-1.5 transition-colors duration-150 hover:bg-secondary/60">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-left"
        >
          <CheckboxDot checked={checked} />
          <span className="truncate text-sm text-foreground">{source.name}</span>
          {source.detail && (
            <span className="shrink-0 truncate font-mono text-[10px] text-muted-foreground/60">
              {source.detail}
            </span>
          )}
        </button>

        {filterable && checked && (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="flex shrink-0 cursor-pointer items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <UsersIcon className="size-3" />
            {authors.length === 0 ? "Everyone" : `${authors.length} watched`}
            <Chevron className="size-3" />
          </button>
        )}
      </div>

      {open && checked && (
        <PluginAuthorPicker
          pluginId={pluginId}
          source={source.id}
          authors={authors}
          onToggle={onToggleAuthor}
        />
      )}
    </div>
  );
}
