const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET inventory (stock table - mirrors Excel view)
router.get('/', async (req, res) => {
  try {
    const { fish_name, location, lot_no } = req.query;
    let sql = 'SELECT * FROM inventory_view WHERE 1=1';
    const params = [];

    if (fish_name) { sql += ' AND fish_name LIKE ?'; params.push(`%${fish_name}%`); }
    if (location) { sql += ' AND line_place LIKE ?'; params.push(`%${location}%`); }
    if (lot_no) { sql += ' AND lot_no LIKE ?'; params.push(`%${lot_no}%`); }

    sql += ' ORDER BY line_place, stack_no, fish_name';

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

// GET dashboard summary
router.get('/dashboard', async (req, res) => {
  try {
    const [summary] = await pool.query('SELECT * FROM dashboard_summary');
    
    // Get recent movements
    const [recentMovements] = await pool.query(`
      SELECT m.*, l.lot_no, p.fish_name, loc.line_place
      FROM movements m
      JOIN lots l ON m.lot_id = l.id
      JOIN products p ON l.product_id = p.id
      JOIN locations loc ON m.location_id = loc.id
      ORDER BY m.created_at DESC
      LIMIT 10
    `);

    // Check for stock errors (negative balances)
    const [errors] = await pool.query(`
      SELECT lot_id, location_id, 
        SUM(CASE WHEN movement_type='IN' THEN quantity_mc ELSE 0 END) -
        SUM(CASE WHEN movement_type='OUT' THEN quantity_mc ELSE 0 END) AS balance
      FROM movements
      GROUP BY lot_id, location_id
      HAVING balance < 0
    `);

    res.json({
      ...summary[0],
      stock_status: errors.length === 0 ? 'Correct' : `Error (${errors.length} issues)`,
      recent_movements: recentMovements,
      error_count: errors.length
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

module.exports = router;
