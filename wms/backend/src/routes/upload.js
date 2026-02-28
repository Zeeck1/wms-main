const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const pool = require('../config/db');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) and CSV files are allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

// Helper: find or create product (skip if duplicate)
async function findOrCreateProduct(conn, fishName, size, bulkWeight, type, glazing) {
  // Try to find existing product first
  const [existing] = await conn.query(
    `SELECT id FROM products WHERE fish_name = ? AND size = ? AND COALESCE(type,'') = COALESCE(?,'') AND COALESCE(glazing,'') = COALESCE(?,'') AND is_active = 1`,
    [fishName, size, type || '', glazing || '']
  );
  if (existing.length > 0) {
    return { id: existing[0].id, isNew: false };
  }
  // Create new product
  const [result] = await conn.query(
    'INSERT INTO products (fish_name, size, bulk_weight_kg, type, glazing) VALUES (?, ?, ?, ?, ?)',
    [fishName, size, bulkWeight, type || null, glazing || null]
  );
  return { id: result.insertId, isNew: true };
}

// Helper: find or create location by line_place only (one location code = one location)
// e.g. A03r-2 appears 5 times in Excel for different products, but is ONE location
async function findOrCreateLocation(conn, linePlace, stackNo, stackTotal) {
  const code = linePlace.toUpperCase().trim();
  const [existing] = await conn.query(
    'SELECT id FROM locations WHERE line_place = ? AND is_active = 1',
    [code]
  );
  if (existing.length > 0) {
    return { id: existing[0].id, isNew: false };
  }
  const [result] = await conn.query(
    'INSERT INTO locations (line_place, stack_no, stack_total) VALUES (?, ?, ?)',
    [code, stackNo, stackTotal]
  );
  return { id: result.insertId, isNew: true };
}

// POST upload Excel file
router.post('/', upload.single('file'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    await conn.beginTransaction();

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (data.length === 0) {
      return res.status(400).json({ error: 'Excel file is empty' });
    }

    let imported = 0;
    let skipped = 0;
    let productsCreated = 0;
    let productsReused = 0;
    let locationsCreated = 0;
    let locationsReused = 0;
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        // Map Excel columns to our fields (flexible column name matching)
        const fishName = (row['Fish Name'] || row['fish_name'] || row['Fish'] || '').toString().trim();
        const size = (row['Size'] || row['size'] || '').toString().trim();
        const bulkWeight = parseFloat(row['Bulk Weight (KG)'] || row['bulk_weight_kg'] || row['Bulk Weight'] || 0);
        const type = (row['Type'] || row['type'] || '').toString().trim();
        const glazing = (row['Glazing'] || row['glazing'] || '').toString().trim();
        const csInDate = row['CS In Date'] || row['cs_in_date'] || row['Date'] || '';
        const sticker = (row['Sticker'] || row['sticker'] || '').toString().trim();
        const linePlace = (row['Lines / Place'] || row['line_place'] || row['Location'] || row['Lines/Place'] || '').toString().trim();
        const stackNo = parseInt(row['Stack No'] || row['stack_no'] || 1) || 1;
        const stackTotal = parseInt(row['Stack Total'] || row['stack_total'] || 1) || 1;
        const handOnBalance = parseInt(row['Hand On Balance'] || row['hand_on_balance'] || row['Balance'] || row['Qty'] || 0) || 0;

        if (!fishName || !size) {
          skipped++;
          errors.push(`Row ${i + 2}: Skipped — missing Fish Name or Size`);
          continue;
        }

        // 1. Find or create product (no duplicate error)
        const product = await findOrCreateProduct(conn, fishName, size, bulkWeight, type, glazing);
        if (product.isNew) productsCreated++;
        else productsReused++;

        // 2. Find or create location (no duplicate error)
        const locCode = linePlace || `IMPORT-${i + 1}`;
        const location = await findOrCreateLocation(conn, locCode, stackNo, stackTotal);
        if (location.isNew) locationsCreated++;
        else locationsReused++;

        // 3. Create lot
        const lotNo = `IMP-${Date.now()}-${i}`;
        let parsedDate = null;
        if (csInDate) {
          const d = new Date(csInDate);
          if (!isNaN(d.getTime())) {
            parsedDate = d.toISOString().split('T')[0];
          }
        }
        if (!parsedDate) parsedDate = new Date().toISOString().split('T')[0];

        const [lotResult] = await conn.query(
          'INSERT INTO lots (lot_no, cs_in_date, sticker, product_id) VALUES (?, ?, ?, ?)',
          [lotNo, parsedDate, sticker || null, product.id]
        );
        const lotId = lotResult.insertId;

        // 4. Create IN movement for existing balance
        if (handOnBalance > 0) {
          await conn.query(
            `INSERT INTO movements (lot_id, location_id, quantity_mc, weight_kg, movement_type, reference_no, created_by)
             VALUES (?, ?, ?, ?, 'IN', 'EXCEL-IMPORT', 'excel-import')`,
            [lotId, location.id, handOnBalance, handOnBalance * bulkWeight]
          );
        }

        imported++;
      } catch (rowError) {
        errors.push(`Row ${i + 2}: ${rowError.message}`);
        skipped++;
      }
    }

    await conn.commit();

    res.json({
      message: 'Import completed',
      total_rows: data.length,
      imported,
      skipped,
      products_created: productsCreated,
      products_reused: productsReused,
      locations_created: locationsCreated,
      locations_reused: locationsReused,
      errors: errors.slice(0, 20) // Return first 20 errors max
    });

  } catch (error) {
    await conn.rollback();
    console.error('Error processing upload:', error);
    res.status(500).json({ error: 'Failed to process Excel file: ' + error.message });
  } finally {
    conn.release();
  }
});

module.exports = router;
