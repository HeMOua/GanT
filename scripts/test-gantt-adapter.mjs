import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(
  new URL("../packages/web/package.json", import.meta.url),
);
const ts = require("typescript");
const source = readFileSync(
  new URL("../packages/web/src/components/gantt/adapter.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022 },
}).outputText;
const { toChartData, toTaskPatch, escapeText } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);
for (const [start, end] of [
  ["2026-10-24", "2026-10-24"],
  ["2026-03-07", "2026-03-09"],
  ["2026-10-31", "2026-11-02"],
  ["2026-12-30", "2027-01-03"],
]) {
  const task = {
    id: 1,
    name: "Synthetic",
    parent_id: null,
    start_time: start,
    end_time: end,
    progress: 37,
  };
  const chart = toChartData([task]).data[0];
  assert(chart.end_date > chart.start_date);
  assert.deepEqual(toTaskPatch(chart), {
    start_time: start,
    end_time: end,
    progress: 37,
  });
}
const tasks = [
  {
    id: 1,
    name: "Root",
    start_time: "2026-10-24",
    end_time: "2026-10-24",
    parent_id: null,
  },
  {
    id: 2,
    name: "Milestone",
    start_time: "2026-10-24",
    end_time: "2026-10-24",
    parent_id: 1,
    is_milestone: true,
    dependencies: [{ task_id: 1, type: "FF", lag: 2, _dep_id: 9 }],
    color: "red;display:none",
  },
];
const data = toChartData(tasks);
assert.equal(data.data[1].parent, 1);
assert.equal(data.data[1].type, "milestone");
assert.equal(data.data[1].color, undefined);
assert.deepEqual(data.links, [
  { id: 9, source: 1, target: 2, type: "2", lag: 2 },
]);
assert.equal(toTaskPatch(data.data[1]).end_time, "2026-10-24");
assert.equal(
  escapeText('<img src=x onerror="alert(1)">'),
  "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;",
);
console.log(
  "Gantt adapter: inclusive dates, DST/year boundaries, milestones, hierarchy, link mapping, escaping passed",
);
