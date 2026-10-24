# GanT - Professional Gantt Chart & Project Management System

**GanT** is a high-performance, professional-grade project management system built with Vue 3 and NestJS. It features a unique hybrid rendering architecture (Canvas + DOM) to provide a smooth, interactive Gantt chart experience with deep hierarchical task management capabilities.

## 🚀 Key Features

-   **Interactive Gantt Chart**: Performance-optimized Canvas rendering for timelines, task bars, dependencies, and progress tracking.
-   **Hierarchical Task Management**: Intelligent task tree supporting unlimited nesting, sorting, and real-time synchronization.
-   **Collaborative Visualization**: Dual-visualization strategy for task assignments, including colored sub-segments for time-based handoffs and mini avatar circles for collaborative tasks.
-   **Flexible Viewport Navigation**: Seamless zooming (Year, Quarter, Month, Week, Day) and intuitive vertical/horizontal scrolling.
-   **Rich Tooltips**: Comprehensive task information at a glance, featuring assignee-specific timeline bars.
-   **Work Log System**: Integrated work logging for accurate time tracking and progress auditing.
-   **Team Management**: Advanced user role management and activity tracking.

## 🛠️ Tech Stack

### Frontend (`packages/web`)
-   **Framework**: [Vue 3 (Latest)](https://vuejs.org/)
-   **Build Tool**: [Vite](https://vite.dev/)
-   **State Management**: [Pinia](https://pinia.vuejs.org/)
-   **Routing**: [Vue Router](https://router.vuejs.org/)
-   **HTTP Client**: [Axios](https://axios-http.com/)
-   **Styling**: Vanilla CSS with modern design tokens.

### Backend (`packages/server`)
-   **Framework**: [NestJS](https://nestjs.com/)
-   **Database**: SQLite (via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) and [TypeORM](https://typeorm.io/))
-   **Authentication**: JWT, Passport, and Bcrypt for secure access control.
-   **Validation**: `class-validator` and `class-transformer` for robust API input handling.

## 📂 Project Structure

This project is a monorepo managed by `pnpm`.

```text
.
├── packages/
│   ├── web/      # Vue 3 Frontend
│   └── server/   # NestJS Backend
├── package.json  # Root workspace configuration
├── pnpm-workspace.yaml
└── README.md     # You are here
```

## 🚥 Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/) (Version ^20.19.0 or >=22.12.0)
-   [pnpm](https://pnpm.io/) (Recommended)

### Installation

```bash
pnpm install
```

### Development

Run both the frontend and backend in parallel:

```bash
pnpm run dev
```

-   **Frontend**: Usually starts at [http://localhost:5173](http://localhost:5173)
-   **Backend**: Usually starts at [http://localhost:3000](http://localhost:3000)

### Production Build

```bash
# Build the entire workspace
pnpm run build

# Or build specific packages
pnpm run build:web
pnpm run build:server
```

## 🗺️ Architecture Overview

GanT utilizes a **Hybrid Rendering Strategy** for maximum performance and flexibility:
-   **Canvas Rendering**: Used for the time-scrolling area (Gantt chart bars, background grid, dependencies) to handle thousands of elements with smooth 60FPS interaction.
-   **DOM Rendering**: Used for the task tree (left-side list) and UI components (dialogs, menus) to leverage standard browser accessibility, styling, and event handling.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## Tauri 独立离线桌面版（1.1.0 / build 1）

桌面版内置 Vue 界面与 Rust + SQLite 数据层，不需要 Node、后台服务或账户。
Web 模式仍使用原 NestJS API；桌面模式通过 Tauri IPC 完成项目、任务、成员、依赖与负责人管理。
本地 SQLite 使用事务保存，非法日期、任务层级循环与依赖循环会被拒绝。

```bash
pnpm install
pnpm dev:desktop
# Universal macOS Release、ad-hoc 签名、DMG 和 ZIP，以及产物验证
bash scripts/package-app.sh
# 自动化存储验证（全部使用模拟数据）
cargo test --manifest-path src-tauri/Cargo.toml
```

构建要求：Rust、Xcode Command Line Tools、arm64 和 x86_64 Rust targets。
发布版本在 `src-tauri/tauri.conf.json`、`src-tauri/Cargo.toml` 与根 `package.json` 同步维护；
构建号在 `bundle.macOS.bundleVersion` 中递增。产物位于 `releases/`，脚本拒绝覆盖既有版本目录。
未配置开发者证书与公证时使用 ad-hoc 签名，首次启动可能需要在系统隐私与安全性设置中允许。

macOS 工作区数据保存在 `~/Library/Application Support/com.gant.desktop/gant.sqlite3`。
侧栏“备份数据…”通过系统保存窗口导出一致的 SQLite 快照；取消不会创建文件，也不会覆盖已有文件。
恢复备份时先退出 GanT，将当前数据文件及同目录的 `-wal`、`-shm` 文件整体移到另一个备份目录，
再将选定备份复制为 `gant.sqlite3` 后启动。保留原数据目录以便回退。
不要只在应用运行时复制主数据库文件，也不要将业务数据文件提交至 Git。

离线成员只表示任务负责人，不创建远程账户，不保存成员密码。桌面数据与现有服务端数据库独立，
不会自动迁移或同步。当前没有自动更新、云同步或安装包公证。
