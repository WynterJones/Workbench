import { CheckboxDot } from "@/components/CheckboxDot";
import { Skeleton } from "@/components/ui/skeleton";
import { usePluginSourceMembers } from "@/hooks/usePluginData";

interface PluginAuthorPickerProps {
  pluginId: string;
  source: string;
  authors: string[];
  onToggle: (author: string) => void;
}

export function PluginAuthorPicker({
  pluginId,
  source,
  authors,
  onToggle,
}: PluginAuthorPickerProps) {
  const { data, isLoading, isError, error } = usePluginSourceMembers(pluginId, source);

  if (isLoading) {
    return <Skeleton className="ml-7 h-16 w-[calc(100%-1.75rem)]" />;
  }

  if (isError) {
    return (
      <p className="ml-7 py-1 text-[11px] text-red-400">
        {error instanceof Error ? error.message : String(error)}
      </p>
    );
  }

  if ((data ?? []).length === 0) {
    return <p className="ml-7 py-1 text-[11px] text-muted-foreground">No contributors found.</p>;
  }

  return (
    <div className="ml-7 max-h-40 space-y-0.5 overflow-y-auto border-l border-border pl-2">
      {(data ?? []).map((member) => (
        <button
          key={member.id}
          type="button"
          onClick={() => onToggle(member.id)}
          className="flex w-full cursor-pointer items-center gap-2.5 rounded px-2 py-1 text-left transition-colors duration-150 hover:bg-secondary/60"
        >
          <CheckboxDot checked={authors.includes(member.id)} />
          <span className="truncate text-xs text-foreground">{member.name}</span>
          {member.detail && (
            <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground/60">
              {member.detail}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
