import React, { useState, useEffect } from 'react';
import { FiDownload, FiSearch } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { getInventory } from '../services/api';
import * as XLSX from 'xlsx';

function StockTable() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ fish_name: '', location: '', lot_no: '' });

  useEffect(() => { fetchInventory(); }, []);

  const fetchInventory = async () => {
    try {
      const res = await getInventory(filters);
      setInventory(res.data);
    } catch (err) {
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setLoading(true);
    fetchInventory();
  };

  // Totals
  const totalMC = inventory.reduce((sum, r) => sum + Number(r.hand_on_balance_mc), 0);
  const totalKG = inventory.reduce((sum, r) => sum + Number(r.hand_on_balance_kg), 0);
  const totalStacks = new Set(inventory.map(r => `${r.line_place}-${r.stack_no}`)).size;

  // Export to Excel
  const exportExcel = () => {
    const data = inventory.map((r, i) => ({
      '#': i + 1,
      'Fish Name': r.fish_name,
      'Size': r.size,
      'Bulk Weight (KG)': Number(r.bulk_weight_kg),
      'Type': r.type || '',
      'Glazing': r.glazing || '',
      'CS In Date': r.cs_in_date,
      'Sticker': r.sticker || '',
      'Lines / Place': r.line_place,
      'Stack No': r.stack_no,
      'Stack Total': r.stack_total,
      'Old Balance': Number(r.old_balance_mc),
      'New Income': Number(r.new_income_mc),
      'Hand On Balance': Number(r.hand_on_balance_mc),
      'Weight (KG)': Number(r.hand_on_balance_kg)
    }));

    // Add summary row
    data.push({
      '#': '',
      'Fish Name': 'TOTAL',
      'Size': '',
      'Bulk Weight (KG)': '',
      'Type': '',
      'Glazing': '',
      'CS In Date': '',
      'Sticker': '',
      'Lines / Place': '',
      'Stack No': '',
      'Stack Total': totalStacks,
      'Old Balance': '',
      'New Income': '',
      'Hand On Balance': totalMC,
      'Weight (KG)': totalKG
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock Table');

    // Set column widths
    ws['!cols'] = [
      { wch: 4 }, { wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 10 },
      { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 10 },
      { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 12 }
    ];

    XLSX.writeFile(wb, `WMS_Stock_Table_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Excel file downloaded');
  };

  if (loading) return <div className="loading"><div className="spinner"></div>Loading stock table...</div>;

  return (
    <>
      <div className="page-header">
        <h2>Stock Table</h2>
        <button className="btn btn-success" onClick={exportExcel}>
          <FiDownload /> Export to Excel
        </button>
      </div>
      <div className="page-body">
        {/* Filter Bar */}
        <form className="filter-bar" onSubmit={handleSearch}>
          <input className="form-control" placeholder="Fish Name..." value={filters.fish_name} onChange={e => setFilters({ ...filters, fish_name: e.target.value })} />
          <input className="form-control" placeholder="Location..." value={filters.location} onChange={e => setFilters({ ...filters, location: e.target.value })} />
          <input className="form-control" placeholder="Lot No..." value={filters.lot_no} onChange={e => setFilters({ ...filters, lot_no: e.target.value })} />
          <button type="submit" className="btn btn-primary"><FiSearch /> Search</button>
        </form>

        {/* Summary Bar */}
        <div className="dashboard-grid" style={{ marginBottom: 16 }}>
          <div className="stat-card">
            <div className="stat-info">
              <h4>Total MC</h4>
              <div className="stat-value" style={{ fontSize: '1.3rem' }}>{totalMC.toLocaleString()}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <h4>Total KG</h4>
              <div className="stat-value" style={{ fontSize: '1.3rem' }}>{totalKG.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <h4>Total Stacks</h4>
              <div className="stat-value" style={{ fontSize: '1.3rem' }}>{totalStacks}</div>
            </div>
          </div>
        </div>

        {/* Excel-like Table */}
        <div className="table-container" style={{ maxHeight: '65vh', overflow: 'auto' }}>
          <table className="excel-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>Fish Name</th>
                <th>Size</th>
                <th>Bulk Wt (KG)</th>
                <th>Type</th>
                <th>Glazing</th>
                <th>CS In Date</th>
                <th>Sticker</th>
                <th>Lines / Place</th>
                <th>Stack No</th>
                <th>Stack Total</th>
                <th style={{ background: '#2d4a1e', color: '#d4edda' }}>Old Balance</th>
                <th style={{ background: '#1a3a5c', color: '#cce5ff' }}>New Income</th>
                <th style={{ background: '#5c1a1a', color: '#f8d7da' }}>Hand On Balance</th>
                <th>KG</th>
              </tr>
            </thead>
            <tbody>
              {inventory.length === 0 ? (
                <tr><td colSpan="15" style={{ textAlign: 'center', padding: 60, color: '#999' }}>
                  No stock data found. Record some Stock IN first or upload an Excel file.
                </td></tr>
              ) : inventory.map((r, i) => (
                <tr key={i}>
                  <td className="text-center" style={{ color: '#999' }}>{i + 1}</td>
                  <td><strong>{r.fish_name}</strong></td>
                  <td>{r.size}</td>
                  <td className="num-cell">{Number(r.bulk_weight_kg).toFixed(2)}</td>
                  <td>{r.type || '-'}</td>
                  <td>{r.glazing || '-'}</td>
                  <td>{r.cs_in_date}</td>
                  <td>{r.sticker || '-'}</td>
                  <td><strong>{r.line_place}</strong></td>
                  <td className="num-cell">{r.stack_no}</td>
                  <td className="num-cell">{r.stack_total}</td>
                  <td className="num-cell" style={{ background: '#f0fdf4' }}>{r.old_balance_mc}</td>
                  <td className="num-cell" style={{ background: '#eff6ff', color: '#1d4ed8', fontWeight: 600 }}>{r.new_income_mc || '-'}</td>
                  <td className="num-cell" style={{ background: '#fef2f2', fontWeight: 700, fontSize: '0.9rem' }}>{r.hand_on_balance_mc}</td>
                  <td className="num-cell">{Number(r.hand_on_balance_kg).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            {inventory.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan="11" style={{ textAlign: 'right', fontWeight: 700 }}>TOTALS:</td>
                  <td className="num-cell">{inventory.reduce((s, r) => s + Number(r.old_balance_mc), 0)}</td>
                  <td className="num-cell">{inventory.reduce((s, r) => s + Number(r.new_income_mc), 0)}</td>
                  <td className="num-cell" style={{ fontSize: '0.95rem' }}>{totalMC}</td>
                  <td className="num-cell">{totalKG.toFixed(2)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </>
  );
}

export default StockTable;
