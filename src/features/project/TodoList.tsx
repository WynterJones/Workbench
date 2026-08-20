import { Skeleton } from "@/components/ui/skeleton";
import { useProjectTodos } from "@/hooks/useProject";

interface ParsedTodo {
  location: string | null;
  text: string;
}

function parseTodo(raw: string): ParsedTodo {
  const match = raw.match(/^(.+?:\d+):\s*(.*)$/);
  if (match) return { location: match[1], text: match[2] };
  return { location: null, text: raw };
}

interface TodoListProps {
  projectId: number;
}

export function TodoList({ projectId }: TodoListProps) {
  const { data: todos, isLoading } = useProjectTodos(projectId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-6 w-full" />
        ))}
      </div>
    );
  }

  if (!todos || todos.length === 0) {
    return <p className="text-sm text-muted-foreground">No TODOs, FIXMEs, or HACKs found.</p>;
  }

  return (
    <ul className="space-y-1.5">
      {todos.map((raw, index) => {
        const { location, text } = parseTodo(raw);
        return (
          <li key={index} className="flex items-start gap-2 text-xs">
            {location && (
              <span className="shrink-0 font-mono text-muted-foreground/70">{location}</span>
            )}
            <span className="text-foreground/90">{text}</span>
          </li>
        );
      })}
    </ul>
  );
}
