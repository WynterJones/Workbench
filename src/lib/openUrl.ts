import { openUrl as open } from "@tauri-apps/plugin-opener";
import { toast } from "sonner";

export async function openUrl(url: string) {
  try {
    await open(url);
  } catch (error) {
    toast.error("Could not open link", {
      description: error instanceof Error ? error.message : String(error),
    });
  }
}
