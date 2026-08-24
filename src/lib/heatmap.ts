import type { HeatmapDay } from "@/hooks/useHeatmap";

export type Week = (HeatmapDay | null)[];

export interface MonthLabel {
  label: string;
  index: number;
  span: number;
}

export function heatmapWeeks(days: HeatmapDay[]): Week[] {
  if (days.length === 0) return [];

  const weeks: Week[] = [];
  let current: Week = [];

  const firstWeekday = new Date(`${days[0].date}T00:00:00`).getDay();
  for (let i = 0; i < firstWeekday; i += 1) current.push(null);

  for (const day of days) {
    current.push(day);
    if (current.length === 7) {
      weeks.push(current);
      current = [];
    }
  }

  if (current.length > 0) {
    while (current.length < 7) current.push(null);
    weeks.push(current);
  }

  return weeks;
}

export function monthLabels(weeks: Week[]): MonthLabel[] {
  const labels: MonthLabel[] = [];

  weeks.forEach((week, index) => {
    const firstDay = week.find((day): day is HeatmapDay => day !== null);
    if (!firstDay) return;
    const date = new Date(`${firstDay.date}T00:00:00`);
    const label = date.toLocaleDateString(undefined, { month: "short" });
    const previous = labels[labels.length - 1];
    if (!previous || previous.label !== label) {
      labels.push({ label, index, span: 1 });
    } else {
      previous.span += 1;
    }
  });

  return labels;
}

export function levelThresholds(days: HeatmapDay[]): [number, number, number] {
  const counts = days
    .map((day) => day.count)
    .filter((count) => count > 0)
    .sort((a, b) => a - b);
  if (counts.length === 0) return [1, 1, 1];
  const at = (q: number) => counts[Math.min(counts.length - 1, Math.floor(counts.length * q))];
  return [at(0.25), at(0.5), at(0.75)];
}

export function levelFor(count: number, thresholds: [number, number, number]): number {
  if (count === 0) return 0;
  if (count <= thresholds[0]) return 1;
  if (count <= thresholds[1]) return 2;
  if (count <= thresholds[2]) return 3;
  return 4;
}
