// All requests are intercepted with synthetic fixtures. No user database is opened.
import { chromium } from "playwright-core";
import { existsSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
const cache = join(homedir(), "Library/Caches/ms-playwright");
const executablePath = readdirSync(cache)
  .filter((n) => /^chromium-\d+$/.test(n))
  .sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1]))
  .map((n) =>
    join(
      cache,
      n,
      "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
    ),
  )
  .find(existsSync);
assert(executablePath, "No local Chromium available");
const browser = await chromium.launch({ executablePath, headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
await context.addInitScript(() => {
  localStorage.setItem("access_token", "synthetic-test-session");
  localStorage.setItem(
    "user",
    JSON.stringify({
      id: 1,
      username: "示例用户",
      display_name: "示例用户",
      role: "ADMIN",
    }),
  );
});
const base = process.env.GANT_VERIFY_URL || "http://127.0.0.1:4177";
const project = {
  id: 1,
  name: "产品迭代 · 秋季交付",
  description: "围绕核心体验，安排设计、开发与发布",
  status: "ACTIVE",
  start_date: "2026-10-20",
  end_date: "2026-11-12",
  created_at: "2026-10-20",
  updated_at: "2026-10-20",
  totalTasks: 6,
  doneTasks: 2,
  inProgressTasks: 2,
};
const members = [
  {
    id: 1,
    username: "member-a",
    display_name: "示例设计师",
    name: "示例设计师",
    role: "ADMIN",
    created_at: "2026-10-20",
  },
];
let taskId = 10,
  failSave = false,
  patchCount = 0;
const dates = [
  ["2026-10-20", "2026-11-12"],
  ["2026-10-20", "2026-10-23"],
  ["2026-10-24", "2026-10-28"],
  ["2026-10-29", "2026-11-04"],
  ["2026-11-05", "2026-11-08"],
  ["2026-11-12", "2026-11-12"],
];
let tasks = [
  "秋季版本",
  "需求确认",
  "交互设计",
  "功能开发",
  "集成测试",
  "版本发布",
].map((name, i) => ({
  id: i + 1,
  name,
  start_time: dates[i][0],
  end_time: dates[i][1],
  parent_id: i ? 1 : null,
  progress: [35, 100, 60, 20, 0, 0][i],
  status: [
    "IN_PROGRESS",
    "DONE",
    "IN_PROGRESS",
    "IN_PROGRESS",
    "BLOCKED",
    "NOT_STARTED",
  ][i],
  order: i,
  is_milestone: i === 5,
  is_critical: i === 3,
  assignees:
    i === 2 ? [{ _assignee_id: 1, user_id: 1, name: "示例设计师" }] : [],
  dependencies: i > 2 ? [{ _dep_id: i, task_id: i, type: "FS", lag: 0 }] : [],
}));
await context.route("http://localhost:3000/api/**", async (route) => {
  const request = route.request(),
    path = new URL(request.url()).pathname.replace("/api", ""),
    method = request.method(),
    data = request.postDataJSON();
  let result = {};
  if (path === "/projects" && method === "GET")
    result = [{ ...project, totalTasks: tasks.length }];
  else if (path === "/projects/1" && method === "GET") result = project;
  else if (path === "/projects" && method === "POST")
    result = { ...project, ...data, id: 2 };
  else if (path === "/users" && method === "GET") result = members;
  else if (path === "/users" && method === "POST") {
    result = { ...data, id: 2, created_at: "2026-10-24" };
    members.push(result);
  } else if (path === "/projects/1/tasks" && method === "GET") result = tasks;
  else if (path === "/projects/1/tasks" && method === "POST") {
    result = {
      ...data,
      id: ++taskId,
      assignees: [],
      dependencies: [],
      order: 100,
    };
    tasks.push(result);
  } else if (/^\/tasks\/\d+$/.test(path) && method === "PATCH") {
    if (failSave)
      return route.fulfill({ status: 503, json: { message: "模拟保存失败" } });
    patchCount++;
    const id = Number(path.split("/")[2]);
    tasks = tasks.map((t) => (t.id === id ? { ...t, ...data } : t));
    result = tasks.find((t) => t.id === id);
  } else if (/^\/tasks\/\d+$/.test(path) && method === "DELETE") {
    tasks = tasks.filter((t) => t.id !== Number(path.split("/")[2]));
  } else if (path.includes("/dependencies") && method === "POST") {
    const t = tasks.find((t) => t.id === Number(path.split("/")[2]));
    t.dependencies.push({
      _dep_id: ++taskId,
      task_id: data.depends_on_task_id,
      type: data.type,
      lag: 0,
    });
    result = {};
  } else if (path.includes("/dependencies/") && method === "DELETE") {
    const t = tasks.find((t) => t.id === Number(path.split("/")[2]));
    t.dependencies = t.dependencies.filter(
      (d) => d._dep_id !== Number(path.split("/")[4]),
    );
  } else if (path.includes("/assignees") && method === "POST") {
    const t = tasks.find((t) => t.id === Number(path.split("/")[2]));
    t.assignees.push({
      _assignee_id: ++taskId,
      user_id: data.user_id,
      name: "示例设计师",
    });
    result = {};
  } else if (path.includes("/assignees/") && method === "DELETE") {
    const t = tasks.find((t) => t.id === Number(path.split("/")[2]));
    t.assignees = t.assignees.filter(
      (a) => a._assignee_id !== Number(path.split("/")[4]),
    );
  } else throw new Error(`Unexpected mock route: ${method} ${path}`);
  await route.fulfill({ status: 200, json: result });
});
const page = await context.newPage(),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error" && !(failSave && m.text().includes("503")))
    errors.push(m.text());
});
const out = join(process.cwd(), "artifacts/ui-verify");
mkdirSync(out, { recursive: true });
const checks = [];
async function check(name, fn) {
  try {
    await fn();
    checks.push(name);
  } catch (error) {
    error.message = name + ": " + error.message;
    throw error;
  }
}
try {
  await page.goto(base);
  await page
    .getByRole("heading", { name: project.name, exact: true })
    .waitFor();
  await page.locator(".n-spin-body").waitFor({ state: "hidden" });
  await page.screenshot({
    path: join(out, "projects.png"),
    animations: "disabled",
  });
  await check("project create dialog", async () => {
    await page.getByRole("button", { name: "新建项目", exact: true }).click();
    await page.getByPlaceholder("输入项目名称").fill("模拟新项目");
    await page.getByRole("button", { name: "创建项目", exact: true }).click();
    await page
      .getByRole("heading", { name: "模拟新项目", exact: true })
      .waitFor();
  });
  await page.goto(base + "/project/1");
  await page.locator(".gantt_task_line").first().waitFor();
  await page.getByRole("button", { name: "周", exact: true }).click();
  await check("hierarchy, links and milestone", async () => {
    assert.equal(await page.locator(".gantt_task_line").count(), 6);
    assert.equal(await page.locator(".gantt_task_link").count(), 3);
    assert.equal(await page.locator(".gantt_milestone").count(), 1);
  });
  await page.waitForTimeout(200);
  await page.screenshot({
    path: join(out, "gantt.png"),
    animations: "disabled",
  });
  await page.getByRole("button", { name: "日", exact: true }).click();
  await check("task drawer and assignee", async () => {
    await page.locator('.gantt_row[task_id="3"]').dblclick();
    await page.getByRole("heading", { name: "编辑任务" }).waitFor();
    await page.getByText("示例设计师", { exact: true }).last().waitFor();
    await page.getByPlaceholder("输入任务名称").fill("交互设计 · 已更新");
    await page.getByRole("button", { name: "保存修改", exact: true }).click();
    await page
      .getByText("交互设计 · 已更新", { exact: true })
      .first()
      .waitFor();
    await page.locator(".n-drawer").waitFor({ state: "hidden" });
    assert(tasks.some((t) => t.name === "交互设计 · 已更新"));
  });
  await check("date drag persists and inclusive end preserved", async () => {
    const bar = page.locator('.gantt_task_line[task_id="3"]');
    const box = await bar.boundingBox();
    assert(box);
    const before = tasks.find((t) => t.id === 3).start_time,
      patches = patchCount;
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(
      box.x + box.width * 0.5 + 96,
      box.y + box.height * 0.5,
      { steps: 16 },
    );
    await page.mouse.up();
    await page.waitForFunction(
      () => !document.querySelector('[aria-busy="true"]'),
    );
    await page.waitForTimeout(350);
    assert(patchCount > patches, `patch counts ${patches} to ${patchCount}`);
    assert.notEqual(tasks.find((t) => t.id === 3).start_time, before);
  });
  await check("save failure restores chart", async () => {
    failSave = true;
    const before = tasks.find((t) => t.id === 3).start_time;
    const bar = page.locator('.gantt_task_line[task_id="3"]'),
      box = await bar.boundingBox();
    assert(box);
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(
      box.x + box.width * 0.5 + 48,
      box.y + box.height * 0.5,
      { steps: 12 },
    );
    await page.mouse.up();
    await page
      .getByText("保存失败，已恢复原计划，请重试", { exact: true })
      .waitFor();
    assert.equal(tasks.find((t) => t.id === 3).start_time, before);
    failSave = false;
  });
  await check("resize duration persists", async () => {
    await page.waitForFunction(
      () => !document.querySelector('[aria-busy="true"]'),
    );
    const bar = page.locator('.gantt_task_line[task_id="3"]');
    await bar.hover();
    const handle = bar.locator(".gantt_task_drag.task_right"),
      box = await handle.boundingBox();
    assert(box);
    const before = tasks.find((t) => t.id === 3).end_time,
      patches = patchCount;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 48, box.y + box.height / 2, {
      steps: 12,
    });
    await page.mouse.up();
    await page.waitForTimeout(300);
    assert(patchCount > patches, `patch counts ${patches} to ${patchCount}`);
    assert.notEqual(tasks.find((t) => t.id === 3).end_time, before);
  });
  await check("progress drag persists", async () => {
    await page.waitForFunction(
      () => !document.querySelector('[aria-busy="true"]'),
    );
    const bar = page.locator('.gantt_task_line[task_id="3"]');
    await bar.hover();
    const handle = bar.locator(".gantt_task_progress_drag"),
      box = await handle.boundingBox();
    assert(box);
    const before = tasks.find((t) => t.id === 3).progress,
      patches = patchCount;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 - 45, box.y + box.height / 2, {
      steps: 12,
    });
    await page.mouse.up();
    await page.waitForTimeout(300);
    assert(patchCount > patches, `patch counts ${patches} to ${patchCount}`);
    assert.notEqual(tasks.find((t) => t.id === 3).progress, before);
  });
  await check("draw dependency and remove with confirmation", async () => {
    await page.getByRole("button", { name: "周", exact: true }).click();
    const from = page.locator('.gantt_task_line[task_id="3"]'),
      to = page.locator('.gantt_task_line[task_id="5"]');
    await from.hover();
    const source = await from
      .locator(".gantt_link_control.task_right .gantt_link_point")
      .boundingBox();
    assert(source);
    await to.hover();
    const target = await to
      .locator(".gantt_link_control.task_left .gantt_link_point")
      .boundingBox();
    assert(target);
    await from.hover();
    await page.mouse.move(
      source.x + source.width / 2,
      source.y + source.height / 2,
    );
    await page.mouse.down();
    const targetBar = await to.boundingBox();
    await page.mouse.move(
      targetBar.x + targetBar.width / 2,
      targetBar.y + targetBar.height / 2,
      { steps: 20 },
    );
    await page.waitForTimeout(100);
    await page.mouse.move(
      target.x + target.width / 2,
      target.y + target.height / 2,
      { steps: 25 },
    );
    await page.mouse.up();
    await page.waitForTimeout(350);
    const dep = tasks
      .find((t) => t.id === 5)
      .dependencies.find((d) => d.task_id === 3);
    assert(dep, "Dependency was not persisted");
    await page
      .locator(`.gantt_task_link[link_id="${dep._dep_id}"]`)
      .dispatchEvent("dblclick");
    await page.getByRole("button", { name: "删除依赖", exact: true }).click();
    await page.waitForTimeout(250);
    assert(
      !tasks.find((t) => t.id === 5).dependencies.some((d) => d.task_id === 3),
    );
  });
  await check("time scales", async () => {
    await page.getByRole("button", { name: "周", exact: true }).click();
    await page.getByRole("button", { name: "月", exact: true }).click();
    await page.getByRole("button", { name: "日", exact: true }).click();
    assert.equal(await page.locator(".gantt_row").count(), 6);
  });
  await check("filter keeps ancestors", async () => {
    await page.getByPlaceholder("查找任务").fill("交互设计");
    await page.waitForTimeout(150);
    assert.equal(await page.locator(".gantt_row").count(), 2);
    await page.getByPlaceholder("查找任务").fill("");
  });
  await check("route teardown and remount", async () => {
    await page.getByRole("link", { name: "成员管理" }).click();
    await page.getByRole("heading", { name: "成员管理" }).waitFor();
    await page.screenshot({ path: join(out, "members.png") });
    await page.goto(base + "/project/1");
    await page.locator(".gantt_task_line").first().waitFor();
    assert.equal(await page.locator(".gantt_row").count(), 6);
  });
  await check("compact 1024px layout", async () => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.screenshot({ path: join(out, "gantt-compact.png") });
    assert(
      await page.locator(".gantt-host").evaluate((e) => e.clientHeight > 300),
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
  });
  assert.deepEqual(errors, []);
  writeFileSync(
    join(out, "result.json"),
    JSON.stringify({ passed: checks, errorCount: errors.length }, null, 2),
  );
  console.log(
    JSON.stringify(
      { passed: checks, errorCount: errors.length, screenshots: out },
      null,
      2,
    ),
  );
} catch (error) {
  await page.screenshot({ path: join(out, "failure.png") });
  console.error("UI verification failed:", error.message);
  console.error("Synthetic-page errors:", JSON.stringify(errors));
  process.exitCode = 1;
} finally {
  await browser.close();
}
