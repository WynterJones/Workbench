import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import type { AiProvider } from "@/lib/types";

export interface PortfolioVoice {
  audience: string;
  tone: string;
  takeaway: string;
}

export interface PortfolioMessage {
  role: "user" | "agent";
  text: string;
}

export interface PortfolioState {
  imagesDir: string;
  images: string[];
  voice: PortfolioVoice;
  messages: PortfolioMessage[];
  doc: string;
}

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
};

function describe(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function usePortfolio(projectId: number) {
  return useQuery({
    queryKey: ["portfolio", projectId],
    queryFn: () => invoke<PortfolioState>("portfolio_state", { id: projectId }),
  });
}

function useRefresh(projectId: number) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["portfolio", projectId] });
}

export function usePortfolioImages(projectId: number) {
  const refresh = useRefresh(projectId);

  const fail = (error: unknown) =>
    toast.error("Could not add that image", { description: describe(error) });

  const fromBytes = useMutation({
    mutationFn: async (file: File) => {
      const extension = EXTENSIONS[file.type];
      if (!extension) throw new Error(`${file.type || "That file"} is not a supported image`);
      const bytes = Array.from(new Uint8Array(await file.arrayBuffer()));
      return invoke<string>("portfolio_add_image", { id: projectId, bytes, extension });
    },
    onSuccess: refresh,
    onError: fail,
  });

  const fromFile = useMutation({
    mutationFn: (sourcePath: string) =>
      invoke<string>("portfolio_add_image_file", { id: projectId, sourcePath }),
    onSuccess: refresh,
    onError: fail,
  });

  const remove = useMutation({
    mutationFn: (name: string) => invoke<void>("portfolio_remove_image", { id: projectId, name }),
    onSuccess: refresh,
    onError: (error) => toast.error("Could not remove that image", { description: describe(error) }),
  });

  async function pickFile() {
    const path = await invoke<string | null>("pick_image_file");
    if (path) fromFile.mutate(path);
  }

  return {
    add: fromBytes.mutate,
    pickFile,
    remove: remove.mutate,
    isPending: fromBytes.isPending || fromFile.isPending,
  };
}

export function useSavePortfolioVoice(projectId: number) {
  const refresh = useRefresh(projectId);
  return useMutation({
    mutationFn: (voice: PortfolioVoice) => invoke<void>("portfolio_save_voice", { id: projectId, voice }),
    onSuccess: () => {
      refresh();
      toast.success("Voice saved");
    },
    onError: (error) => toast.error("Could not save voice", { description: describe(error) }),
  });
}

export function usePortfolioChat(projectId: number, provider: AiProvider) {
  const queryClient = useQueryClient();

  const send = useMutation({
    mutationFn: (message: string) =>
      invoke<PortfolioMessage[]>("portfolio_chat", { id: projectId, provider, message }),
    onSuccess: (messages) => {
      queryClient.setQueryData<PortfolioState>(["portfolio", projectId], (previous) =>
        previous ? { ...previous, messages } : previous,
      );
    },
    onError: (error) => toast.error("The agent could not answer", { description: describe(error) }),
  });

  const clear = useMutation({
    mutationFn: () => invoke<void>("portfolio_clear_chat", { id: projectId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["portfolio", projectId] }),
  });

  return { send, clear };
}

export function usePortfolioDoc(projectId: number, provider: AiProvider) {
  const queryClient = useQueryClient();

  function store(doc: string) {
    queryClient.setQueryData<PortfolioState>(["portfolio", projectId], (previous) =>
      previous ? { ...previous, doc } : previous,
    );
  }

  const generate = useMutation({
    mutationFn: () => invoke<string>("portfolio_generate", { id: projectId, provider }),
    onSuccess: (doc) => {
      store(doc);
      toast.success("Portfolio piece written");
    },
    onError: (error) => toast.error("Could not write the piece", { description: describe(error) }),
  });

  const save = useMutation({
    mutationFn: (markdown: string) =>
      invoke<void>("portfolio_save_doc", { id: projectId, markdown }),
    onSuccess: (_result, markdown) => {
      store(markdown);
      toast.success("Saved");
    },
    onError: (error) => toast.error("Could not save", { description: describe(error) }),
  });

  return { generate, save };
}
