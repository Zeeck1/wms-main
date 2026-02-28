const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET all lots with product info
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT l.*, p.fish_name, p.size, p.type, p.glazing, p.bulk_weight_kg
      FROM lots l
      JOIN products p ON l.product_id = p.id
      ORDER BY l.cs_in_date DESC, l.lot_no
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching lots:', error);
    res.status(500).json({ error: 'Failed to fetch lots' });
  }
});

// GET single lot
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT l.*, p.fish_name, p.size, p.type, p.glazing, p.bulk_weight_kg
      FROM lots l
      JOIN products p ON l.product_id = p.id
      WHERE l.id = ?
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Lot not found' });
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching lot:', error);
    res.status(500).json({ error: 'Failed to fetch lot' });
  }
});

// POST create lot
router.post('/', async (req, res) => {
  try {
    const { lot_no, cs_in_date, sticker, product_id, notes } = req.body;
    if (!lot_no || !cs_in_date || !product_id) {
      return res.status(400).json({ error: 'Lot number, CS In Date, and product are required' });
    }
    const [result] = await pool.query(
      'INSERT INTO lots (lot_no, cs_in_date, sticker, product_id, notes) VALUES (?, ?, ?, ?, ?)',
      [lot_no, cs_in_date, sticker || null, product_id, notes || null]
    );
    const [newLot] = await pool.query('SELECT * FROM lots WHERE id = ?', [result.insertId]);
    res.status(201).json(newLot[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Lot number already exists' });
    }
    console.error('Error creating lot:', error);
    res.status(500).json({ error: 'Failed to create lot' });
  }
});

// PUT update lot
router.put('/:id', async (req, res) => {
  try {
    const { lot_no, cs_in_date, sticker, product_id, notes } = req.body;
    await pool.query(
      'UPDATE lots SET lot_no=?, cs_in_date=?, sticker=?, product_id=?, notes=? WHERE id=?',
      [lot_no, cs_in_date, sticker || null, product_id, notes || null, req.params.id]
    );
    const [updated] = await pool.query('SELECT * FROM lots WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating lot:', error);
    res.status(500).json({ error: 'Failed to update lot' });
  }
});

module.exports = router;
