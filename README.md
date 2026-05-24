# DataVault

A robust DBMS-based web application built to streamline structured data management. DataVault provides a premium, secure interface to organize, monitor, and query relational credential storage data, complete with security audits and an interactive live SQL command console.

---

## Technical Highlights

* **Architecture:** 3-tier design (Client, Server, Database) for clean separation of concerns, scalability, and modular maintainability.
* **Database:** Relational schema design using SQLite with indexed tables (`categories`, `items`, `tags`, `item_tags`) and optimized SQL queries to minimize latency.
* **Features:** End-to-end CRUD capability with foreign key constraints, real-time data consistency checks, transactional database interactions, and secure masking.

---

## Key Features

1. **Dashboard & Analytics:** Real-time data statistics including item counts, favorite tracking, active tag distributions, and dynamic categories distribution.
2. **Security Audit System:** Automated server-side evaluation of password entropy and keys, sorting them into Weak, Medium, or Strong categories for risk assessment.
3. **Structured Vault Management:** Complete CRUD actions over sensitive keys. Support for masking/unmasking credentials, copy-to-clipboard conveniences, favorite pinning, and comma-separated tag updates.
4. **Relational Categories Customization:** Create, modify, and delete categorization rules with custom accent colors and distinct icon cues.
5. **Interactive SQL Command Console:** Execute read-only SQL SELECT queries directly from the UI to preview result sets in a formatted data table, supported by a live schema table inspector.
6. **Robust Transactional Operations:** Implements cascade deletions, constraints validation, and data safety checks, ensuring no orphaned tags or broken linkages remain.

---

## Relational Schema Design

```mermaid
erDiagram
    categories ||--o{ items : "has many"
    items ||--o{ item_tags : "joins"
    tags ||--o{ item_tags : "joins"

    categories {
        int id PK
        string name UNIQUE
        string icon
        string color
        datetime created_at
    }

    items {
        int id PK
        int category_id FK
        string title
        string username
        string secret_value
        string url
        string notes
        int is_favorite
        datetime created_at
        datetime updated_at
    }

    tags {
        int id PK
        string name UNIQUE
    }

    item_tags {
        int item_id PK, FK
        int tag_id PK, FK
    }
```

### Table Structure & Constraint Validations
* **Foreign Keys:** Enabled on database connection (`PRAGMA foreign_keys = ON;`) to enforce relational integrity.
* **Cascading:** Deleting an item triggers cascade deletion of its rows in `item_tags`. Deleting a category updates related items to `NULL` (`ON DELETE SET NULL`) to keep the entries safe.
* **Indexes:** Optimized searching through pre-compiled index keys:
  * `idx_items_category` on `items(category_id)`
  * `idx_item_tags_item` on `item_tags(item_id)`
  * `idx_item_tags_tag` on `item_tags(tag_id)`

---

## Tech Stack

* **Frontend:** HTML5, CSS3 (Vanilla glassmorphism & modern layout flex/grid design), Vanilla JavaScript (ES6+ AJAX, DOM manipulation).
* **Backend:** Node.js, Express.js (REST API, request parsing, middleware routing).
* **Database:** SQLite (Relational embedded store via `sqlite3` library).

---

## How to Run

Follow these simple instructions to install dependencies and start the local dev server:

### Prerequisites
* Ensure you have [Node.js](https://nodejs.org/) installed (v16.x or higher recommended).

### Setup and Installation

1. **Clone the Repository:**
   ```bash
   git clone <your-repository-url>
   cd Datavault
   ```

2. **Install Dependencies:**
   Install backend dependencies from the root directory:
   ```bash
   npm install
   ```

3. **Configure Environment Variables (Optional):**
   A template `.env` is created automatically. You can edit the PORT option:
   ```env
   PORT=5000
   ```

4. **Start the Application:**
   Run the startup script:
   ```bash
   npm start
   ```

5. **Open in Browser:**
   Open your browser and navigate to:
   ```
   http://localhost:5000
   ```
