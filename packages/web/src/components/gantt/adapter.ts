import type { GanttTask, DependencyType } from "./types";
export function parseDay(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}
export function formatDay(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}
export function nextDay(value: Date, days = 1): Date {
  const d = new Date(value);
  d.setDate(d.getDate() + days);
  return d;
}
export function escapeText(value: unknown): string {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
export const linkTypes: Record<DependencyType, string> = {
  FS: "0",
  SS: "1",
  FF: "2",
};
export function toChartData(tasks: GanttTask[]) {
  const ids = new Set(tasks.map((t) => t.id));
  return {
    data: tasks.map((t) => ({
      id: t.id,
      text: t.name,
      start_date: parseDay(t.start_time),
      end_date: t.is_milestone
        ? parseDay(t.start_time)
        : nextDay(parseDay(t.end_time)),
      parent: t.parent_id && ids.has(t.parent_id) ? t.parent_id : 0,
      progress: (t.progress || 0) / 100,
      open: true,
      type: t.is_milestone ? "milestone" : "task",
      color: /^#[0-9a-f]{6}$/i.test(t.color || "") ? t.color : undefined,
      status: t.status || "NOT_STARTED",
      critical: !!t.is_critical,
      owners: (t.assignees || []).map((a) => a.name).join("、"),
    })),
    links: tasks.flatMap((t) =>
      (t.dependencies || [])
        .filter((d) => ids.has(d.task_id))
        .map((d, i) => ({
          id: (d as any)._dep_id ?? `${t.id}-${i}`,
          source: d.task_id,
          target: t.id,
          type: linkTypes[d.type],
          lag: d.lag,
        })),
    ),
  };
}
export function toTaskPatch(t: {
  start_date: Date;
  end_date: Date;
  progress: number;
  type?: string;
}) {
  return {
    start_time: formatDay(t.start_date),
    end_time: formatDay(
      t.type === "milestone" ? t.start_date : nextDay(t.end_date, -1),
    ),
    progress: Math.round(t.progress * 100),
  };
}
