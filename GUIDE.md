# DataVault - Step-by-Step Development Guide

This development guide breaks down the construction of **DataVault** into 6 distinct, logical phases, explaining the step-by-step modular development of the application.

---

## Phase Outline

| Phase | Purpose | Target Files | Key Git Command |
| :---: | :--- | :--- | :--- |
| **1** | Initialize Repo & structure | `package.json`, `.gitignore`, directory structure | `git commit -m "feat: initialize project structure"` |
| **2** | Set up schema.sql & connection | `database/schema.sql`, `database/connection.js` | `git commit -m "feat: design relational database schema"` |
| **3** | Create backend API routes | `server/server.js`, `server/routes.js` | `git commit -m "feat: implement RESTful API for CRUD"` |
| **4** | Build Frontend UI | `client/index.html`, `client/styles.css` | `git commit -m "feat: build interactive user interface"` |
| **5** | Integrate frontend with API | `client/js/app.js` | `git commit -m "feat: connect frontend to backend services"` |
| **6** | Finalize Documentation | `README.md`, `GUIDE.md` | `git commit -m "docs: add comprehensive README.md"` |

---

## Phase Details

### Phase 1: Initialize Repository & Directory Structure
* **Task:** Establish the workspaces, ignore rules, and declare root-level package dependencies.
* **Commands:**
  ```bash
  git init
  # (Create directories: client/, server/, database/)
  npm install
  git add .
  git commit -m "feat: initialize project structure"
  ```

### Phase 2: Relational Database Schema & Connection Setup
* **Task:** Define relational structure (Tables: `categories`, `items`, `tags`, `item_tags`) with indexes and seed data, then establish Promise-based SQLite connection utilities.
* **Commands:**
  ```bash
  git add database/
  git commit -m "feat: design relational database schema"
  ```

### Phase 3: RESTful Backend API Implementation
* **Task:** Implement Express endpoints covering stats aggregations, CRUD interfaces for credentials and categories, and the console query engine.
* **Commands:**
  ```bash
  git add server/
  git commit -m "feat: implement RESTful API for CRUD"
  ```

### Phase 4: Frontend UI Construction (HTML & CSS Layouts)
* **Task:** Create the single-page application shell, navigation sidebars, CSS glassmorphic designs, responsive grids, modals, and SQL Console layout structure.
* **Commands:**
  ```bash
  git add client/index.html client/styles.css
  git commit -m "feat: build interactive user interface"
  ```

### Phase 5: Client-Server Integration
* **Task:** Code `client/js/app.js` to manage AJAX queries, bindings, DOM formatting, password strength checking, password generation, and raw SQL queries output routing.
* **Commands:**
  ```bash
  git add client/js/app.js
  git commit -m "feat: connect frontend to backend services"
  ```

### Phase 6: Finalize Project Documentation
* **Task:** Write detailed setup instructions, architecture breakdowns, database diagrams, and commit guidelines.
* **Commands:**
  ```bash
  git add README.md GUIDE.md
  git commit -m "docs: add comprehensive README.md"
  ```
