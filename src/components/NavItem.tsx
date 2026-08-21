import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItemProps {
  icon: LucideIcon;
  label: string;
  active: boolean;
  count?: number;
  collapsed?: boolean;
  secondary?: boolean;
  onClick: () => void;
}

export function NavItem({
  icon: Icon,
  label,
  active,
  count,
  collapsed = false,
  secondary = false,
  onClick,
}: NavItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={cn(
        "flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-[15px] font-medium transition-colors duration-150 ease-out",
        collapsed && "justify-center px-0",
        active
          ? "bg-secondary text-foreground"
          : secondary
            ? "border border-border bg-secondary/70 text-foreground shadow-sm hover:bg-secondary"
          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
      )}
    >
      <Icon className={cn("shrink-0", collapsed ? "size-5" : "size-[18px]")} strokeWidth={1.75} />
      <span className={cn("flex-1 text-left", collapsed && "sr-only")}>{label}</span>
      {!collapsed && count !== undefined && count > 0 && (
        <span className="font-mono text-[11px] font-normal text-muted-foreground">{count}</span>
      )}
    </button>
  );
}
