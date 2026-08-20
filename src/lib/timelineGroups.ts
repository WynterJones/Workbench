import type { TimelineEvent } from "@/hooks/useProjectTimeline";

export interface TimelineGroup {
  key: string;
  label: string;
  events: TimelineEvent[];
}

export function groupByMonth(events: TimelineEvent[]): TimelineGroup[] {
  const groups: TimelineGroup[] = [];

  for (const event of events) {
    const date = new Date(event.occurredAt);
    if (Number.isNaN(date.getTime())) continue;

    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const last = groups[groups.length - 1];

    if (last && last.key === key) {
      last.events.push(event);
    } else {
      groups.push({
        key,
        label: date.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
        events: [event],
      });
    }
  }

  return groups;
}

export function yearOf(key: string): string {
  return key.slice(0, 4);
}

export function spanInYears(newest: string | null, oldest: string | null): number {
  if (!newest || !oldest) return 0;
  const a = new Date(newest).getTime();
  const b = new Date(oldest).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.max(0, (a - b) / (1000 * 60 * 60 * 24 * 365.25));
}
