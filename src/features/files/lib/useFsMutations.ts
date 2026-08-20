import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { filesApi } from "@/lib/filesApi";

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function useFsMutations() {
  const queryClient = useQueryClient();

  function invalidateDirs() {
    queryClient.invalidateQueries({ queryKey: ["dir"] });
    queryClient.invalidateQueries({ queryKey: ["fs-info"] });
  }

  const createDir = useMutation({
    mutationFn: ({ path, name }: { path: string; name: string }) => filesApi.createDir(path, name),
    onSuccess: invalidateDirs,
    onError: (error) => toast.error("Couldn't create folder", { description: describeError(error) }),
  });

  const createFile = useMutation({
    mutationFn: ({ path, contents }: { path: string; contents: string }) => filesApi.createFile(path, contents),
    onSuccess: invalidateDirs,
    onError: (error) => toast.error("Couldn't create file", { description: describeError(error) }),
  });

  const createFromTemplate = useMutation({
    mutationFn: ({ dir, templateId, name }: { dir: string; templateId: string; name: string }) =>
      filesApi.createFromTemplate(dir, templateId, name),
    onSuccess: (entry) => {
      invalidateDirs();
      toast.success(`Created ${entry.name}`);
    },
    onError: (error) => toast.error("Couldn't create from template", { description: describeError(error) }),
  });

  const renameEntry = useMutation({
    mutationFn: ({ path, newName }: { path: string; newName: string }) => filesApi.renameEntry(path, newName),
    onSuccess: invalidateDirs,
    onError: (error) => toast.error("Rename failed", { description: describeError(error) }),
  });

  const moveEntries = useMutation({
    mutationFn: ({ paths, dest }: { paths: string[]; dest: string }) => filesApi.moveEntries(paths, dest),
    onSuccess: (_data, variables) => {
      invalidateDirs();
      toast.success(`Moved ${variables.paths.length} item${variables.paths.length === 1 ? "" : "s"}`);
    },
    onError: (error) => toast.error("Move failed", { description: describeError(error) }),
  });

  const copyEntries = useMutation({
    mutationFn: ({ paths, dest }: { paths: string[]; dest: string }) => filesApi.copyEntries(paths, dest),
    onSuccess: (_data, variables) => {
      invalidateDirs();
      toast.success(`Copied ${variables.paths.length} item${variables.paths.length === 1 ? "" : "s"}`);
    },
    onError: (error) => toast.error("Copy failed", { description: describeError(error) }),
  });

  const trashEntries = useMutation({
    mutationFn: (paths: string[]) => filesApi.trashEntries(paths),
    onSuccess: (_data, paths) => {
      invalidateDirs();
      toast.success(`Moved ${paths.length} item${paths.length === 1 ? "" : "s"} to Trash`);
    },
    onError: (error) => toast.error("Couldn't move to Trash", { description: describeError(error) }),
  });

  return { createDir, createFile, createFromTemplate, renameEntry, moveEntries, copyEntries, trashEntries };
}
