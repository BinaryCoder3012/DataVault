const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'datavault.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// Establish Database Connection
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('[-] Error connecting to the SQLite database:', err.message);
        process.exit(1);
    }
    console.log('[+] Connected to the SQLite database at:', DB_PATH);
});

// Configure and Initialize Schema
db.serialize(() => {
    // Enable Foreign Key support
    db.run('PRAGMA foreign_keys = ON;', (err) => {
        if (err) {
            console.error('[-] Failed to enable foreign keys:', err.message);
        } else {
            console.log('[+] Foreign key constraints enabled.');
        }
    });

    // Load and execute schema.sql
    try {
        const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
        db.exec(schema, (err) => {
            if (err) {
                console.error('[-] Error applying schema.sql:', err.message);
            } else {
                console.log('[+] Relational database schema applied and seed data verified.');
            }
        });
    } catch (err) {
        console.error('[-] Error reading schema.sql file:', err.message);
    }
});

// Promise-based wrappers for cleaner async/await code in Express routes
const query = {
    all: (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },
    get: (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    },
    run: (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, changes: this.changes });
            });
        });
    },
    // Execute multiple queries or statements sequentially (e.g. for raw query runner)
    exec: (sql) => {
        return new Promise((resolve, reject) => {
            db.exec(sql, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    },
    // Database instance itself for direct control or advanced operations
    dbInstance: db
};

module.exports = query;
