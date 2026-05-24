-- Relational schema for DataVault
-- Enable foreign keys support in SQLite (must be run on connection)
PRAGMA foreign_keys = ON;

-- 1. Categories Table (One-to-Many with Items)
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    icon TEXT DEFAULT 'folder',
    color TEXT DEFAULT '#4F46E5',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Items Table
CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    username TEXT DEFAULT '',
    secret_value TEXT NOT NULL, -- The password or secret key
    url TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    is_favorite INTEGER DEFAULT 0 CHECK(is_favorite IN (0, 1)),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tags Table (Many-to-Many with Items)
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

-- 4. Item-Tags Junction Table
CREATE TABLE IF NOT EXISTS item_tags (
    item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (item_id, tag_id)
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id);
CREATE INDEX IF NOT EXISTS idx_item_tags_item ON item_tags(item_id);
CREATE INDEX IF NOT EXISTS idx_item_tags_tag ON item_tags(tag_id);

-- Insert seed categories if not exist
INSERT OR IGNORE INTO categories (id, name, icon, color) VALUES 
(1, 'Logins & Portals', 'key', '#6366f1'),
(2, 'Cloud Infrastructure', 'server', '#0ea5e9'),
(3, 'API & Tokens', 'code', '#10b981'),
(4, 'Personal Notes', 'shield', '#f43f5e');

-- Insert seed tags if not exist
INSERT OR IGNORE INTO tags (id, name) VALUES 
(1, 'production'),
(2, 'development'),
(3, 'finance'),
(4, 'private');

-- Insert seed items if not exist
INSERT OR IGNORE INTO items (id, category_id, title, username, secret_value, url, notes, is_favorite) VALUES
(1, 1, 'Primary GitHub Account', 'dev_lead', 'ghp_PremiumSecurityKey2026', 'https://github.com', 'Main development account for the organization', 1),
(2, 2, 'AWS Production EC2 Console', 'admin_aws', 'AWS_Sec_Pass_398@!90', 'https://aws.amazon.com', 'Access key expires every 90 days', 1),
(3, 3, 'Stripe Gateway Live API Key', 'finance_api', 'sk_live_51N8x...827a', 'https://stripe.com', 'Used for payment gateway integration', 0),
(4, 4, 'Emergency Recovery Seed Phrase', 'backup_vault', 'apple banana cherry dog elephant fox grape horse ink jackal kangaroo lion', '', 'Store in physical safe', 0);

-- Insert seed item tags relation
INSERT OR IGNORE INTO item_tags (item_id, tag_id) VALUES
(1, 1), -- GitHub is production
(1, 2), -- GitHub is development
(2, 1), -- AWS EC2 is production
(3, 1), -- Stripe is production
(3, 3), -- Stripe is finance
(4, 4); -- Emergency is private
