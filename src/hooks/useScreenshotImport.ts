import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
};

export function useScreenshotImport(projectId: number, variant: "desktop" | "mobile") {
  const queryClient = useQueryClient();

  function done() {
    queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    queryClient.invalidateQueries({ queryKey: ["projects"] });
    toast.success("Screenshot added");
  }

  function fail(error: unknown) {
    toast.error("Could not add screenshot", {
      description: error instanceof Error ? error.message : String(error),
    });
  }

  const fromFile = useMutation({
    mutationFn: (sourcePath: string) =>
      invoke<string>("import_screenshot_file", { projectId, variant, sourcePath }),
    onSuccess: done,
    onError: fail,
  });

  const fromBytes = useMutation({
    mutationFn: async (file: File) => {
      const extension = EXTENSIONS[file.type];
      if (!extension) throw new Error(`${file.type || "That file"} is not a supported image`);
      const bytes = Array.from(new Uint8Array(await file.arrayBuffer()));
      return invoke<string>("import_screenshot_bytes", { projectId, variant, bytes, extension });
    },
    onSuccess: done,
    onError: fail,
  });

  async function pickFile() {
    const path = await invoke<string | null>("pick_image_file");
    if (path) fromFile.mutate(path);
  }

  return {
    pickFile,
    importFile: fromFile.mutate,
    importBlob: fromBytes.mutate,
    isPending: fromFile.isPending || fromBytes.isPending,
  };
}
