import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FilePlusIcon, FolderPlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { filesApi } from "@/lib/filesApi";
import { useEntryInfo } from "@/hooks/useDirectory";
import { useFilesStore } from "@/lib/filesStore";
import { useFsMutations } from "@/features/files/lib/useFsMutations";

interface NewFileMenuProps {
  dir: string;
}

type PendingAction =
  | { kind: "file" }
  | { kind: "folder" }
  | { kind: "template"; templateId: string; label: string };

export function NewFileMenu({ dir }: NewFileMenuProps) {
  const { data: info } = useEntryInfo(dir);
  const { data: templates = [] } = useQuery({
    queryKey: ["file-templates", info?.framework ?? null],
    queryFn: () => filesApi.fileTemplates(info?.framework ?? null),
    enabled: Boolean(dir),
  });
  const { createDir, createFile, createFromTemplate } = useFsMutations();
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [name, setName] = useState("");
  const newFileRequested = useFilesStore((s) => s.newFileRequested);
  const clearNewFileRequest = useFilesStore((s) => s.clearNewFileRequest);

  useEffect(() => {
    if (newFileRequested && dir) {
      setPending({ kind: "file" });
      clearNewFileRequest();
    }
  }, [newFileRequested, dir, clearNewFileRequest]);

  function submit() {
    if (!pending || !name.trim()) return;
    if (pending.kind === "folder") createDir.mutate({ path: dir, name: name.trim() });
    else if (pending.kind === "file") createFile.mutate({ path: `${dir}/${name.trim()}`, contents: "" });
    else createFromTemplate.mutate({ dir, templateId: pending.templateId, name: name.trim() });
    setPending(null);
    setName("");
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" disabled={!dir} title="New">
            <FilePlusIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={() => setPending({ kind: "folder" })}>
            <FolderPlusIcon />
            New Folder
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setPending({ kind: "file" })}>
            <FilePlusIcon />
            New File
          </DropdownMenuItem>
          {templates.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>From template</DropdownMenuLabel>
              {templates.map((template) => (
                <DropdownMenuItem
                  key={template.id}
                  onSelect={() => setPending({ kind: "template", templateId: template.id, label: template.label })}
                >
                  {template.label}
                </DropdownMenuItem>
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={Boolean(pending)} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {pending?.kind === "folder" ? "New Folder" : pending?.kind === "file" ? "New File" : `New ${pending && "label" in pending ? pending.label : ""}`}
            </DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="name"
            className="font-mono"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={!name.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
