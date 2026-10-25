# GanT

Vue 3 + Tauri 的离线项目计划工具。通用界面使用 Naive UI，甘特图使用 DHTMLX Gantt Community 10.0.3（MIT）。
桌面版通过 Tauri IPC 读写本机 SQLite，无需注册、Node 后台或网络。Web 模式保留 NestJS API。

## 功能

- 我的历程：项目参与经历、工作阶段和重要节点，支持多次加入同一项目及并行工作。
- 按自己、项目、人员、年份回顾，可切换时间轴、甘特图和列表，搜索角色、标签与成果。
- 日期支持月份或具体日期，可标记大约时间；实际结束与已知情况截止分别记录。
- 历程独立于计划任务保存，项目名称为历史快照；Web 模式按当前记录者隔离历程。
- 删除参与经历前需先删除其工作与节点；退出项目通过编辑参与经历的记录状态完成。

- 项目卡片、搜索、成员管理和统一的任务编辑抽屉。
- 任务树、里程碑、负责人、状态与关键任务标记。
- 日 / 周 / 月时间轴、任务搜索、状态筛选、展开 / 折叠与今天定位。
- 拖动排期、工期缩放和进度调整，操作写回数据库，保存失败恢复已保存的数据。
- 从任务连接点拖动创建 FS / SS / FF 依赖；双击依赖线确认删除。
- 原生文件窗口导出一致的 SQLite 备份。

目前使用社区版能力，不包含 PRO 的自动排程、关键路径计算、资源负载或基线管理。
“关键任务”是手动标记，建立依赖不会自动移动其他任务。

## 开发与构建

环境：Node ^20.19 / >=22.12、pnpm 10、Rust、Xcode Command Line Tools。
Universal 打包需要 `aarch64-apple-darwin` 和 `x86_64-apple-darwin` targets。

```bash
pnpm install
pnpm dev:desktop
# Web + NestJS
pnpm dev
# 类型检查与前端构建
pnpm build:web
# Release、签名、DMG / ZIP 与挂载解压校验
bash scripts/package-app.sh
```

当前版本 **1.3.0 / build 3**。版本在根 package.json、src-tauri/Cargo.toml 和 tauri.conf.json 同步维护，
构建号在 bundle.macOS.bundleVersion 递增。失败重试不重复递增版本。
产物位于 releases/GanT-版本-build构建号-架构/，脚本拒绝覆盖已有目录。
未配置开发者证书与公证时采用 ad-hoc 签名；首次运行可能需要在 macOS 隐私与安全性设置中允许。
Intel 与 Apple Silicon 均包含在通用包中，本机实际启动仅覆盖 Apple Silicon。

## 验证

```bash
pnpm test:gantt
TZ=America/Los_Angeles pnpm test:gantt
cargo test --manifest-path src-tauri/Cargo.toml
# 另一个终端启动预览，端口 4177
pnpm --filter web preview --host 127.0.0.1 --port 4177
pnpm verify:ui
node scripts/ui-verify/journey.mjs
# 服务端历程规则与记录者隔离（先运行 pnpm build:server）
node scripts/test-journey.cjs
```

UI 验证脚本自动发现本机缓存的 Chromium，仅使用模拟项目与成员，拦截全部 API 请求，
不读取业务数据库。覆盖页面、任务编辑、拖动保存、失败回退、工期与进度调整、依赖操作、
筛选、路由销毁重建与 1024px 窗口。截图和汇总在 artifacts/ui-verify/，不提交至 Git。
可通过 GANT_VERIFY_URL 指定本地预览地址。

## 数据与备份

macOS 工作区：`~/Library/Application Support/com.gant.desktop/gant.sqlite3`。
侧栏“备份数据”通过系统保存窗口导出 SQLite 一致快照，不覆盖已有文件。
恢复时先退出 GanT，把现有主数据库与同目录的 -wal、-shm 文件一起移到另一个备份目录，
然后将选定备份复制为 gant.sqlite3，再启动。保留旧目录以便回退。
不要在应用运行时仅复制主数据库，也不要提交或上传业务数据文件。

离线成员仅代表任务负责人，不保存密码。桌面与服务端数据库独立，不自动同步。
没有自动更新、云同步或安装包公证。

## 结构与开源许可

- packages/web：Vue 3、Naive UI、DHTMLX Gantt Community、Pinia。
- packages/server：NestJS、TypeORM、SQLite，保留给 Web 部署。
- src-tauri：Rust 本地存储与原生备份对话框。
- scripts：打包、日期适配测试和模拟数据 UI 验证。

DHTMLX Gantt 与 Naive UI 使用 MIT，Lucide 使用 ISC（含来源图标的许可说明）。
对应许可证随前端打包在 public/licenses/，不使用远程 CDN、在线导出服务或商业试用包。
