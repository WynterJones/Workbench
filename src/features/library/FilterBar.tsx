import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ActiveFilterChips } from "@/features/library/ActiveFilterChips";
import { LibraryViewControls } from "@/features/library/LibraryViewControls";
import { ProjectLinksDialog } from "@/features/library/ProjectLinksDialog";

import { FrameworkOption } from "@/features/library/FrameworkOption";
import { CheckboxDot } from "@/components/CheckboxDot";
import type { Framework, ProjectQuery, ProjectStatus } from "@/lib/types";

const SORT_LABELS: Record<ProjectQuery["sort"], string> = {
  modified: "Last modified",
  name: "Name",
  score: "Ship score",
  discovered: "Recently discovered",
};

const STATUS_LABELS: Record<ProjectStatus, string> = {
  unknown: "Unknown",
  runnable: "Runnable",
  running: "Running",
  broken: "Broken",
  dead: "Dead",
  shipped: "Shipped",
};

interface FilterBarProps {
  availableFrameworks: Framework[];
  availableTags: string[];
  frameworks: Framework[];
  tags: string[];
  status: ProjectStatus | "all";
  sort: ProjectQuery["sort"];
  view: "grid" | "list";
  pageSize: number;
  columns: number;
  onFrameworksChange: (frameworks: Framework[]) => void;
  onTagsChange: (tags: string[]) => void;
  onStatusChange: (status: ProjectStatus | "all") => void;
  onSortChange: (sort: ProjectQuery["sort"]) => void;
  onViewChange: (view: "grid" | "list") => void;
  onPageSizeChange: (pageSize: number) => void;
  onColumnsChange: (columns: number) => void;
}

export function FilterBar({
  availableFrameworks,
  availableTags,
  frameworks,
  tags,
  status,
  sort,
  view,
  pageSize,
  columns,
  onFrameworksChange,
  onTagsChange,
  onStatusChange,
  onSortChange,
  onViewChange,
  onPageSizeChange,
  onColumnsChange,
}: FilterBarProps) {
  function toggleFramework(framework: Framework) {
    onFrameworksChange(
      frameworks.includes(framework)
        ? frameworks.filter((f) => f !== framework)
        : [...frameworks, framework]
    );
  }

  function toggleTag(tag: string) {
    onTagsChange(tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag]);
  }

  const hasActiveFilters = frameworks.length > 0 || tags.length > 0 || status !== "all";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Framework{frameworks.length > 0 ? ` (${frameworks.length})` : ""}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {availableFrameworks.map((framework) => (
              <DropdownMenuCheckboxItem
                key={framework}
                checked={frameworks.includes(framework)}
                onCheckedChange={() => toggleFramework(framework)}
                onSelect={(event) => event.preventDefault()}
                className="cursor-pointer py-2 pl-2"
              >
                <FrameworkOption framework={framework} checked={frameworks.includes(framework)} />
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Tags{tags.length > 0 ? ` (${tags.length})` : ""}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {availableTags.length === 0 && (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">No tags yet</div>
            )}
            {availableTags.map((tag) => (
              <DropdownMenuCheckboxItem
                key={tag}
                checked={tags.includes(tag)}
                onCheckedChange={() => toggleTag(tag)}
                onSelect={(event) => event.preventDefault()}
                className="cursor-pointer py-2 pl-2"
              >
                <CheckboxDot checked={tags.includes(tag)} />
                {tag}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Select value={status} onValueChange={(value) => onStatusChange(value as ProjectStatus | "all")}>
          <SelectTrigger size="sm" className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {(Object.keys(STATUS_LABELS) as ProjectStatus[]).map((value) => (
              <SelectItem key={value} value={value}>
                {STATUS_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={(value) => onSortChange(value as ProjectQuery["sort"])}>
          <SelectTrigger size="sm" className="w-44">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(SORT_LABELS) as ProjectQuery["sort"][]).map((value) => (
              <SelectItem key={value} value={value}>
                {SORT_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <ProjectLinksDialog />

        <LibraryViewControls
          view={view}
          pageSize={pageSize}
          columns={columns}
          onViewChange={onViewChange}
          onPageSizeChange={onPageSizeChange}
          onColumnsChange={onColumnsChange}
        />
      </div>

      {hasActiveFilters && (
        <ActiveFilterChips
          frameworks={frameworks}
          tags={tags}
          status={status}
          statusLabels={STATUS_LABELS}
          onRemoveFramework={toggleFramework}
          onRemoveTag={toggleTag}
          onClearStatus={() => onStatusChange("all")}
          onClearAll={() => {
            onFrameworksChange([]);
            onTagsChange([]);
            onStatusChange("all");
          }}
        />
      )}
    </div>
  );
}
