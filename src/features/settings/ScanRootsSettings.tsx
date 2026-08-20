import { FolderPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useScanRoots } from "@/hooks/useScanRoots";

export function ScanRootsSettings() {
  const { roots, pickAndAddRoot, removeRoot } = useScanRoots();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scan roots</CardTitle>
        <CardDescription>Folders Workbench walks when scanning.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {roots.length === 0 ? (
          <p className="text-sm text-muted-foreground">No roots added yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {roots.map((root) => (
              <li
                key={root.id}
                className="flex items-center justify-between rounded-md border border-border bg-secondary/40 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs text-foreground">{root.path}</p>
                  <p className="text-xs text-muted-foreground">{root.projectCount} projects</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeRoot(root.id)}
                  aria-label={`Remove ${root.path}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <Button variant="outline" onClick={pickAndAddRoot} className="w-fit gap-2">
          <FolderPlus className="size-4" />
          Add folder
        </Button>
      </CardContent>
    </Card>
  );
}
