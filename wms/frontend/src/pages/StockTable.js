import React, { useState, useEffect, useCallback } from 'react';
import { FiDownload, FiSearch, FiPackage, FiBox, FiTrash2 } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { getInventory, deleteAllStockData } from '../services/api';
import * as XLSX from 'xlsx';

const TABS = [
  { id: 'BULK', label: 'Bulk', icon: <FiPackage /> },
  { id: 'CONTAINER_EXTRA', label: 'Container Extra', icon: <FiBox /> }
];

function StockTable() {
  const [activeTab, setActiveTab] = useState('BULK');
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ fish_name: '', location: '', lot_no: '' });

  const isCE = activeTab === 'CONTAINER_EXTRA';

  const fetchInventory = useCallback(async (searchFilters = {}) => {
    try {
      const res = await getInventory({ ...searchFilters, stock_type: activeTab });
      setInventory(res.data);
    } catch (err) {
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    setLoading(true);
    setFilters({ fish_name: '', location: '', lot_no: '' });
    fetchInventory({});
  }, [activeTab, fetchInventory]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setLoading(true);
    fetchInventory(filters);
  };

  const handleDeleteAll = async () => {
    const label = isCE ? 'Container Extra' : 'Bulk';
    if (!window.confirm(`Delete ALL ${label} stock data? (${inventory.length} items)\n\nThis will remove all movements and lots for ${label} stock. Products will remain.`)) return;
    if (!window.confirm('This is irreversible. Confirm again to proceed.')) return;
    try {
      const res = await deleteAllStockData({ stock_type: activeTab });
      toast.success(res.data.message || 'All stock data deleted');
      setLoading(true);
      fetchInventory({});
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete stock data');
    }
  };

  const totalMC = inventory.reduce((sum, r) => sum + Number(r.hand_on_balance_mc), 0);
  const totalKG = inventory.reduce((sum, r) => sum + Number(r.hand_on_balance_kg), 0);
  const totalStacks = new Set(inventory.map(r => `${r.line_place}-${r.stack_no}`)).size;

  const exportExcel = () => {
    let data;
    if (isCE) {
      data = inventory.map((r, i) => ({
        '#': i + 1,
        'Order': r.order_code || '',
        'Fish Name': r.fish_name,
        'Size': r.size,
        'Packed Size (KG)': Number(r.bulk_weight_kg),
        'Production Date': r.production_date || '',
        'Expiration Date': r.expiration_date || '',
        'Line': r.line_place,
        'St No': r.st_no || '',
        'Balance MC': Number(r.hand_on_balance_mc),
        'Total KG': Number(r.hand_on_balance_kg),
        'Remark': r.remark || ''
      }));
      data.push({
        '#': '', 'Order': '', 'Fish Name': 'TOTAL', 'Size': '', 'Packed Size (KG)': '',
        'Production Date': '', 'Expiration Date': '', 'Line': '',
        'St No': '', 'Balance MC': totalMC, 'Total KG': totalKG, 'Remark': ''
      });
    } else {
      data = inventory.map((r, i) => ({
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
      data.push({
        '#': '', 'Fish Name': 'TOTAL', 'Size': '', 'Bulk Weight (KG)': '',
        'Type': '', 'Glazing': '', 'CS In Date': '', 'Sticker': '',
        'Lines / Place': '', 'Stack No': '', 'Stack Total': totalStacks,
        'Old Balance': '', 'New Income': '',
        'Hand On Balance': totalMC, 'Weight (KG)': totalKG
      });
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    const sheetName = isCE ? 'Container Extra Stock' : 'Bulk Stock';
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const prefix = isCE ? 'Container_Extra' : 'Bulk';
    XLSX.writeFile(wb, `WMS_${prefix}_Stock_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Excel file downloaded');
  };

  if (loading) return <div className="loading"><div className="spinner"></div>Loading stock table...</div>;

  return (
    <>
      <div className="page-header">
        <h2>Stock Table</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          {inventory.length > 0 && (
            <button className="btn btn-danger" onClick={handleDeleteAll}>
              <FiTrash2 /> Delete All Data
            </button>
          )}
          <button className="btn btn-success" onClick={exportExcel}>
            <FiDownload /> Export to Excel
          </button>
        </div>
      </div>
      <div className="page-body">
        <div className="stock-type-tabs">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`stock-type-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => handleTabChange(tab.id)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <form className="filter-bar" onSubmit={handleSearch}>
          <input className="form-control" placeholder="Fish Name..." value={filters.fish_name} onChange={e => setFilters({ ...filters, fish_name: e.target.value })} />
          <input className="form-control" placeholder="Location..." value={filters.location} onChange={e => setFilters({ ...filters, location: e.target.value })} />
          {!isCE && <input className="form-control" placeholder="Lot No..." value={filters.lot_no} onChange={e => setFilters({ ...filters, lot_no: e.target.value })} />}
          <button type="submit" className="btn btn-primary"><FiSearch /> Search</button>
        </form>

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

        <div className="table-container" style={{ maxHeight: '65vh', overflow: 'auto' }}>
          {isCE ? (
            /* ── Container Extra Table ── */
            <table className="excel-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>Order</th>
                  <th>Fish Name</th>
                  <th>Size</th>
                  <th>Packed Size (KG)</th>
                  <th>Production Date</th>
                  <th>Expiration Date</th>
                  <th>Total KG</th>
                  <th style={{ background: '#5c1a1a', color: '#f8d7da' }}>Balance MC</th>
                  <th>St No</th>
                  <th>Line</th>
                  <th>Remark</th>
                </tr>
              </thead>
              <tbody>
                {inventory.length === 0 ? (
                  <tr><td colSpan="12" style={{ textAlign: 'center', padding: 60, color: '#999' }}>
                    No Container Extra stock found. Upload data via Excel Upload.
                  </td></tr>
                ) : inventory.map((r, i) => (
                  <tr key={i}>
                    <td className="text-center" style={{ color: '#999' }}>{i + 1}</td>
                    <td><strong>{r.order_code || '-'}</strong></td>
                    <td><strong>{r.fish_name}</strong></td>
                    <td>{r.size}</td>
                    <td className="num-cell">{Number(r.bulk_weight_kg).toFixed(0)} KG</td>
                    <td>{r.production_date || '-'}</td>
                    <td>{r.expiration_date || '-'}</td>
                    <td className="num-cell">{Number(r.hand_on_balance_kg).toFixed(0)} KG</td>
                    <td className="num-cell" style={{ background: '#fef2f2', fontWeight: 700, fontSize: '0.9rem' }}>{r.hand_on_balance_mc}</td>
                    <td>{r.st_no || '-'}</td>
                    <td><strong>{r.line_place}</strong></td>
                    <td>{r.remark || '-'}</td>
                  </tr>
                ))}
              </tbody>
              {inventory.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'right', fontWeight: 700 }}>TOTALS:</td>
                    <td className="num-cell">{totalKG.toFixed(0)} KG</td>
                    <td className="num-cell" style={{ fontSize: '0.95rem' }}>{totalMC}</td>
                    <td colSpan="3"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          ) : (
            /* ── Bulk Table (existing) ── */
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
          )}
        </div>
      </div>
    </>
  );
}

export default StockTable;
