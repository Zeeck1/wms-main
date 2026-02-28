const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET all products
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM products WHERE is_active = 1 ORDER BY fish_name, size'
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET single product
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// POST create product
router.post('/', async (req, res) => {
  try {
    const { fish_name, size, bulk_weight_kg, type, glazing } = req.body;
    if (!fish_name || !size) {
      return res.status(400).json({ error: 'Fish name and size are required' });
    }
    const [result] = await pool.query(
      'INSERT INTO products (fish_name, size, bulk_weight_kg, type, glazing) VALUES (?, ?, ?, ?, ?)',
      [fish_name, size, bulk_weight_kg || 0, type || null, glazing || null]
    );
    const [newProduct] = await pool.query('SELECT * FROM products WHERE id = ?', [result.insertId]);
    res.status(201).json(newProduct[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Product with this combination already exists' });
    }
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// PUT update product
router.put('/:id', async (req, res) => {
  try {
    const { fish_name, size, bulk_weight_kg, type, glazing } = req.body;

    // Check for duplicate before updating
    const [existing] = await pool.query(
      `SELECT id FROM products WHERE fish_name = ? AND size = ? AND COALESCE(type,'') = COALESCE(?,'') AND COALESCE(glazing,'') = COALESCE(?,'') AND id != ? AND is_active = 1`,
      [fish_name, size, type || '', glazing || '', req.params.id]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Product with this combination already exists' });
    }

    await pool.query(
      'UPDATE products SET fish_name=?, size=?, bulk_weight_kg=?, type=?, glazing=? WHERE id=?',
      [fish_name, size, bulk_weight_kg || 0, type || null, glazing || null, req.params.id]
    );
    const [updated] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Product with this combination already exists' });
    }
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE (soft delete) product
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('UPDATE products SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ message: 'Product deactivated' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// DELETE ALL products (soft delete all)
router.delete('/', async (req, res) => {
  try {
    const [result] = await pool.query('UPDATE products SET is_active = 0 WHERE is_active = 1');
    res.json({ message: `${result.affectedRows} products deactivated` });
  } catch (error) {
    console.error('Error deleting all products:', error);
    res.status(500).json({ error: 'Failed to delete all products' });
  }
});

module.exports = router;
