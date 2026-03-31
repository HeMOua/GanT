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
