const express = require('express');
const router = express.Router();
const query = require('../database/connection');

// Password strength analyzer helper
function evaluatePasswordStrength(password) {
    if (!password || password.length === 0) return 'Empty';
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 14) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    
    if (score <= 2) return 'Weak';
    if (score <= 4) return 'Medium';
    return 'Strong';
}

// ----------------------------------------------------
// 1. STATS ROUTE (GET /api/stats)
// ----------------------------------------------------
router.get('/stats', async (req, res, next) => {
    try {
        const itemStats = await query.get('SELECT COUNT(*) as count, SUM(is_favorite) as favorites FROM items');
        const totalItems = itemStats.count || 0;
        const totalFavorites = itemStats.favorites || 0;

        const categoryStats = await query.get('SELECT COUNT(*) as count FROM categories');
        const tagStats = await query.get('SELECT COUNT(*) as count FROM tags');

        // Calculate password strength distribution
        const items = await query.all('SELECT secret_value FROM items');
        const strengthCounts = { Weak: 0, Medium: 0, Strong: 0, Empty: 0 };
        items.forEach(item => {
            const strength = evaluatePasswordStrength(item.secret_value);
            strengthCounts[strength] = (strengthCounts[strength] || 0) + 1;
        });

        // Items per category distribution
        const categoryDistribution = await query.all(`
            SELECT c.name, COUNT(i.id) as count, c.color
            FROM categories c
            LEFT JOIN items i ON c.id = i.category_id
            GROUP BY c.id
        `);

        res.json({
            summary: {
                totalItems,
                totalFavorites,
                totalCategories: categoryStats.count || 0,
                totalTags: tagStats.count || 0
            },
            strengths: strengthCounts,
            categories: categoryDistribution
        });
    } catch (err) {
        next(err);
    }
});

// ----------------------------------------------------
// 2. CATEGORIES ROUTES (CRUD)
// ----------------------------------------------------
// Get all categories with item count
router.get('/categories', async (req, res, next) => {
    try {
        const categories = await query.all(`
            SELECT c.id, c.name, c.icon, c.color, COUNT(i.id) as item_count 
            FROM categories c
            LEFT JOIN items i ON c.id = i.category_id
            GROUP BY c.id
            ORDER BY c.name ASC
        `);
        res.json(categories);
    } catch (err) {
        next(err);
    }
});

// Create Category
router.post('/categories', async (req, res, next) => {
    const { name, icon, color } = req.body;
    if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Category name is required' });
    }
    try {
        const result = await query.run(
            'INSERT INTO categories (name, icon, color) VALUES (?, ?, ?)',
            [name.trim(), icon || 'folder', color || '#4F46E5']
        );
        res.status(201).json({ id: result.id, name, icon, color });
    } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'A category with this name already exists' });
        }
        next(err);
    }
});

// Update Category
router.put('/categories/:id', async (req, res, next) => {
    const { name, icon, color } = req.body;
    const { id } = req.params;
    if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Category name is required' });
    }
    try {
        const result = await query.run(
            'UPDATE categories SET name = ?, icon = ?, color = ? WHERE id = ?',
            [name.trim(), icon || 'folder', color || '#4F46E5', id]
        );
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Category not found' });
        }
        res.json({ id: parseInt(id), name, icon, color });
    } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'A category with this name already exists' });
        }
        next(err);
    }
});

// Delete Category
router.delete('/categories/:id', async (req, res, next) => {
    const { id } = req.params;
    try {
        // Items belonging to this category will have their category_id set to NULL (ON DELETE SET NULL)
        const result = await query.run('DELETE FROM categories WHERE id = ?', [id]);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Category not found' });
        }
        res.json({ success: true, message: 'Category deleted successfully' });
    } catch (err) {
        next(err);
    }
});

// ----------------------------------------------------
// 3. TAGS ROUTE
// ----------------------------------------------------
router.get('/tags', async (req, res, next) => {
    try {
        const tags = await query.all('SELECT * FROM tags ORDER BY name ASC');
        res.json(tags);
    } catch (err) {
        next(err);
    }
});

// ----------------------------------------------------
// 4. ITEMS ROUTES (CRUD with Relational Joins)
// ----------------------------------------------------
// Get items (with search, category, tag, and favorite filtering)
router.get('/items', async (req, res, next) => {
    const { q, category_id, tag_id, favorite } = req.query;
    let sql = `
        SELECT i.id, i.title, i.username, i.secret_value, i.url, i.notes, i.is_favorite, i.created_at, i.updated_at,
               c.name as category_name, c.color as category_color, c.icon as category_icon,
               (SELECT GROUP_CONCAT(t.name) FROM item_tags it JOIN tags t ON it.tag_id = t.id WHERE it.item_id = i.id) as tags_list
        FROM items i
        LEFT JOIN categories c ON i.category_id = c.id
    `;
    const params = [];
    const conditions = [];

    if (category_id) {
        conditions.push('i.category_id = ?');
        params.push(category_id);
    }

    if (favorite !== undefined) {
        conditions.push('i.is_favorite = ?');
        params.push(favorite === '1' || favorite === 'true' ? 1 : 0);
    }

    if (tag_id) {
        conditions.push('i.id IN (SELECT item_id FROM item_tags WHERE tag_id = ?)');
        params.push(tag_id);
    }

    if (q && q.trim() !== '') {
        const searchTerm = `%${q.trim()}%`;
        conditions.push(`(
            i.title LIKE ? OR 
            i.username LIKE ? OR 
            i.notes LIKE ? OR 
            i.url LIKE ? OR 
            c.name LIKE ? OR 
            i.id IN (SELECT it.item_id FROM item_tags it JOIN tags t ON it.tag_id = t.id WHERE t.name LIKE ?)
        )`);
        params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY i.is_favorite DESC, i.updated_at DESC';

    try {
        const rows = await query.all(sql, params);
        // Process tags_list comma-separated string into an array of tags
        const formattedRows = rows.map(row => {
            const tags = row.tags_list ? row.tags_list.split(',') : [];
            const newRow = { ...row, tags };
            delete newRow.tags_list;
            return newRow;
        });
        res.json(formattedRows);
    } catch (err) {
        next(err);
    }
});

// Get Single Item
router.get('/items/:id', async (req, res, next) => {
    const { id } = req.params;
    try {
        const item = await query.get(`
            SELECT i.id, i.category_id, i.title, i.username, i.secret_value, i.url, i.notes, i.is_favorite, i.created_at, i.updated_at,
                   c.name as category_name, c.color as category_color, c.icon as category_icon
            FROM items i
            LEFT JOIN categories c ON i.category_id = c.id
            WHERE i.id = ?
        `, [id]);

        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }

        const tags = await query.all(`
            SELECT t.id, t.name 
            FROM tags t
            JOIN item_tags it ON t.id = it.tag_id
            WHERE it.item_id = ?
        `, [id]);

        item.tags = tags;
        res.json(item);
    } catch (err) {
        next(err);
    }
});

// Helper transaction-based function to handle tags association
async function associateTags(itemId, tagsArray) {
    // Delete existing relations
    await query.run('DELETE FROM item_tags WHERE item_id = ?', [itemId]);
    if (!tagsArray || !Array.isArray(tagsArray) || tagsArray.length === 0) return;

    for (const tagName of tagsArray) {
        const cleanedTag = tagName.trim().toLowerCase();
        if (cleanedTag === '') continue;

        // Upsert tag
        let tag = await query.get('SELECT id FROM tags WHERE name = ?', [cleanedTag]);
        let tagId;
        if (!tag) {
            const insertResult = await query.run('INSERT INTO tags (name) VALUES (?)', [cleanedTag]);
            tagId = insertResult.id;
        } else {
            tagId = tag.id;
        }

        // Link item with tag
        await query.run('INSERT OR IGNORE INTO item_tags (item_id, tag_id) VALUES (?, ?)', [itemId, tagId]);
    }

    // Clean up orphaned tags (tags not linked to any item)
    await query.run('DELETE FROM tags WHERE id NOT IN (SELECT DISTINCT tag_id FROM item_tags)');
}

// Create Item
router.post('/items', async (req, res, next) => {
    const { category_id, title, username, secret_value, url, notes, tags } = req.body;
    if (!title || !secret_value) {
        return res.status(400).json({ error: 'Title and secret value are required fields.' });
    }

    try {
        // Wrap database writes in sequential execution
        const dbInstance = query.dbInstance;
        
        dbInstance.serialize(async () => {
            try {
                // Insert item
                const itemResult = await query.run(`
                    INSERT INTO items (category_id, title, username, secret_value, url, notes)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [category_id || null, title, username || '', secret_value, url || '', notes || '']);
                
                const itemId = itemResult.id;

                // Handle Tag association
                await associateTags(itemId, tags);

                const createdItem = await query.get('SELECT * FROM items WHERE id = ?', [itemId]);
                res.status(201).json(createdItem);
            } catch (err) {
                res.status(500).json({ error: err.message });
            }
        });
    } catch (err) {
        next(err);
    }
});

// Update Item
router.put('/items/:id', async (req, res, next) => {
    const { id } = req.params;
    const { category_id, title, username, secret_value, url, notes, is_favorite, tags } = req.body;

    if (!title || !secret_value) {
        return res.status(400).json({ error: 'Title and secret value are required fields.' });
    }

    try {
        const itemCheck = await query.get('SELECT id FROM items WHERE id = ?', [id]);
        if (!itemCheck) {
            return res.status(404).json({ error: 'Item not found' });
        }

        const dbInstance = query.dbInstance;
        dbInstance.serialize(async () => {
            try {
                // Update item
                await query.run(`
                    UPDATE items 
                    SET category_id = ?, title = ?, username = ?, secret_value = ?, url = ?, notes = ?, is_favorite = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `, [category_id || null, title, username || '', secret_value, url || '', notes || '', is_favorite ? 1 : 0, id]);

                // Update tags
                if (tags !== undefined) {
                    await associateTags(id, tags);
                }

                res.json({ success: true, message: 'Item updated successfully' });
            } catch (err) {
                res.status(500).json({ error: err.message });
            }
        });
    } catch (err) {
        next(err);
    }
});

// Toggle Favorite Status
router.patch('/items/:id/favorite', async (req, res, next) => {
    const { id } = req.params;
    const { is_favorite } = req.body;
    try {
        const result = await query.run(
            'UPDATE items SET is_favorite = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [is_favorite ? 1 : 0, id]
        );
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Item not found' });
        }
        res.json({ success: true, is_favorite: is_favorite ? 1 : 0 });
    } catch (err) {
        next(err);
    }
});

// Delete Item
router.delete('/items/:id', async (req, res, next) => {
    const { id } = req.params;
    try {
        const result = await query.run('DELETE FROM items WHERE id = ?', [id]);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Item not found' });
        }
        
        // Clean up orphaned tags
        await query.run('DELETE FROM tags WHERE id NOT IN (SELECT DISTINCT tag_id FROM item_tags)');
        
        res.json({ success: true, message: 'Item deleted successfully' });
    } catch (err) {
        next(err);
    }
});

// ----------------------------------------------------
// 5. CUSTOM SQL QUERY EXECUTION (SQL CONSOLE)
// ----------------------------------------------------
router.post('/query', async (req, res, next) => {
    const { sql, unsafe } = req.body;
    if (!sql || sql.trim() === '') {
        return res.status(400).json({ error: 'SQL query string is required.' });
    }

    const queryStr = sql.trim();

    // Security check: restrict destructive operations unless explicitly run in "unsafe" mode
    if (!unsafe) {
        const isSelect = /^SELECT\b/i.test(queryStr);
        const hasDestructiveWords = /\b(DROP|DELETE|UPDATE|INSERT|ALTER|CREATE|REPLACE|TRUNCATE|GRANT|REVOKE)\b/i.test(queryStr);
        if (!isSelect || hasDestructiveWords) {
            return res.status(403).json({
                error: 'Security Restriction: Only read-only SELECT queries are allowed in Safe Mode. Toggle Admin/Unsafe Mode to run modify operations.'
            });
        }
    }

    try {
        // Run query using direct SQLite methods to retrieve full rows/metadata
        const dbInstance = query.dbInstance;
        dbInstance.all(queryStr, [], (err, rows) => {
            if (err) {
                return res.status(400).json({ error: err.message });
            }
            res.json({
                success: true,
                rowsCount: rows.length,
                data: rows
            });
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
