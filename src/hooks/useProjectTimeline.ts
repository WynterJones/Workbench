import { useInfiniteQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";

export interface TimelineEvent {
  id: string;
  kind: "project-created" | "commit" | "first-commit";
  projectId: number;
  projectName: string;
  framework: string;
  occurredAt: string;
  title: string;
  detail: string | null;
}

export interface TimelinePage {
  events: TimelineEvent[];
  total: number;
  nextOffset: number | null;
  oldest: string | null;
  newest: string | null;
  projectCount: number;
}

const PAGE_SIZE = 60;

export function useProjectTimeline() {
  return useInfiniteQuery({
    queryKey: ["timeline"],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      invoke<TimelinePage>("timeline_page", { offset: pageParam, limit: PAGE_SIZE }),
    getNextPageParam: (last) => last.nextOffset ?? undefined,
    staleTime: 5 * 60_000,
  });
}
