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

export function levelFor(count: number, max: number): number {
  if (count === 0) return 0;
  if (max <= 1) return 4;
  const ratio = count / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}
