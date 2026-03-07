import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FiSearch, FiPackage, FiBox, FiSave } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { getInventory, adjustInventoryBalance, updateLotCsInDate } from '../services/api';
import { parseLocationCode } from '../config/warehouseConfig';

const rowKey = (r) => `${r.lot_id}-${r.location_id}`;

// Format to date-only YYYY-MM-DD (no time)
const toDateOnly = (d) => {
  if (d == null || d === '') return '';
  if (typeof d === 'string') return d.split('T')[0];
  try { return new Date(d).toISOString().split('T')[0]; } catch { return ''; }
};

const TABS = [
  { id: 'BULK', label: 'Bulk', icon: <FiPackage /> },
  { id: 'CONTAINER_EXTRA', label: 'Container Extra', icon: <FiBox /> }
];

const LINE_OPTIONS = [
  { value: '', label: 'All (L & R)' },
  { value: 'L', label: 'L (Left side)' },
  { value: 'R', label: 'R (Right side)' }
];

function Manual() {
  const [activeTab, setActiveTab] = useState('BULK');
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    fish_name: '',
    line: '',
    line_detail: '',
    stack_no: ''
  });
  const [editedBalances, setEditedBalances] = useState({});
  const [editedCsInDates, setEditedCsInDates] = useState({});
  const [saving, setSaving] = useState(false);

  const isCE = activeTab === 'CONTAINER_EXTRA';

  const getCsInDate = (r) => {
    if (editedCsInDates[r.lot_id] !== undefined) return editedCsInDates[r.lot_id];
    return toDateOnly(r.cs_in_date);
  };

  const setCsInDate = (lotId, value) => {
    const v = value === '' ? '' : value;
    setEditedCsInDates(prev => (v === '' ? (() => { const next = { ...prev }; delete next[lotId]; return next; })() : { ...prev, [lotId]: v }));
  };

  const getBalance = (r) => {
    const key = rowKey(r);
    if (editedBalances[key] !== undefined && editedBalances[key] !== '') return Number(editedBalances[key]);
    return Number(r.hand_on_balance_mc);
  };

  const setBalance = (r, value) => {
    const key = rowKey(r);
    const v = value === '' ? '' : Math.max(0, parseInt(value, 10) || 0);
    setEditedBalances(prev => (v === '' ? (() => { const next = { ...prev }; delete next[key]; return next; })() : { ...prev, [key]: v }));
  };

  const loadInventory = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const p = { stock_type: activeTab, ...params };
      const res = await getInventory(p);
      setInventory(res.data);
    } catch (err) {
      toast.error('Failed to load stock data');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    setFilters(prev => ({ ...prev, fish_name: '', line_detail: '' }));
    loadInventory();
  }, [activeTab, loadInventory]);

  const handleSearch = (e) => {
    e.preventDefault();
    const p = {};
    if (filters.fish_name.trim()) p.fish_name = filters.fish_name.trim();
    if (filters.line_detail.trim()) p.location = filters.line_detail.trim();
    loadInventory(p);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setFilters(prev => ({ ...prev, fish_name: '', line: '', line_detail: '', stack_no: '' }));
    setEditedBalances({});
    setEditedCsInDates({});
  };

  // Client-side filter by Line (L/R) and Stack No
  const filteredInventory = useMemo(() => {
    let list = inventory;
    if (filters.line) {
      list = list.filter(row => {
        const parsed = parseLocationCode(row.line_place);
        return parsed && parsed.side === filters.line;
      });
    }
    if (filters.stack_no !== '' && filters.stack_no != null) {
      const sn = String(filters.stack_no).trim();
      if (sn !== '') {
        list = list.filter(row => String(row.stack_no || '').includes(sn));
      }
    }
    return list;
  }, [inventory, filters.line, filters.stack_no]);

  const totalMC = filteredInventory.reduce((sum, r) => sum + getBalance(r), 0);
  const totalKG = filteredInventory.reduce((sum, r) => {
    const mc = getBalance(r);
    const bulkKg = Number(r.bulk_weight_kg) || 0;
    return sum + mc * bulkKg;
  }, 0);
  const totalStacks = new Set(filteredInventory.map(r => `${r.line_place}-${r.stack_no}`)).size;
  const hasEdits = Object.keys(editedBalances).length > 0 || Object.keys(editedCsInDates).length > 0;

  const handleSaveAll = async () => {
    if (!hasEdits) return;
    setSaving(true);
    try {
      const balancePromises = Object.entries(editedBalances).map(([key, newMc]) => {
        const [lot_id, location_id] = key.split('-').map(Number);
        return adjustInventoryBalance({ lot_id, location_id, new_balance_mc: newMc });
      });
      await Promise.all(balancePromises);

      for (const [lotIdStr, newDate] of Object.entries(editedCsInDates)) {
        await updateLotCsInDate(Number(lotIdStr), newDate);
      }

      toast.success('All changes saved. Stock Table and other pages will show updated data.');
      setEditedBalances({});
      setEditedCsInDates({});
      loadInventory();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading && inventory.length === 0) {
    return <div className="loading"><div className="spinner"></div>Loading manual stock...</div>;
  }

  return (
    <>
      <div className="page-header">
        <h2>Manual</h2>
        {hasEdits && (
          <button type="button" className="btn btn-primary" onClick={handleSaveAll} disabled={saving}>
            <FiSave /> {saving ? 'Saving...' : 'Save all changes'}
          </button>
        )}
      </div>
      <div className="page-body">
        {/* Tabs — editable */}
        <div className="stock-type-tabs">
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              className={`stock-type-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => handleTabChange(tab.id)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Search section — all fields editable */}
        <form className="manual-search-form" onSubmit={handleSearch}>
          <div className="manual-search-row">
            <div className="form-group">
              <label>Fish Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search fish name..."
                value={filters.fish_name}
                onChange={e => setFilters(prev => ({ ...prev, fish_name: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Line (L / R)</label>
              <select
                className="form-control"
                value={filters.line}
                onChange={e => setFilters(prev => ({ ...prev, line: e.target.value }))}
              >
                {LINE_OPTIONS.map(opt => (
                  <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Line Detail</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. A01, CC01, line place..."
                value={filters.line_detail}
                onChange={e => setFilters(prev => ({ ...prev, line_detail: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Stack No</label>
              <input
                type="text"
                className="form-control"
                placeholder="Stack number..."
                value={filters.stack_no}
                onChange={e => setFilters(prev => ({ ...prev, stack_no: e.target.value }))}
              />
            </div>
            <div className="form-group manual-search-actions">
              <button type="submit" className="btn btn-primary">
                <FiSearch /> Search
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setFilters({ fish_name: '', line: '', line_detail: '', stack_no: '' })}
              >
                Clear
              </button>
            </div>
          </div>
        </form>

        {/* Summary */}
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
              <h4>Rows</h4>
              <div className="stat-value" style={{ fontSize: '1.3rem' }}>{filteredInventory.length}</div>
            </div>
          </div>
        </div>

        {/* Table — same as Stock Table, data from Stock Table */}
        <div className="table-container" style={{ maxHeight: '60vh', overflow: 'auto' }}>
          {isCE ? (
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
                  <th>Stack No</th>
                  <th>Remark</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan="13" style={{ textAlign: 'center', padding: 60, color: '#999' }}>
                      No Container Extra stock found. Adjust filters or upload data via Excel Upload.
                    </td>
                  </tr>
                ) : filteredInventory.map((r, i) => (
                  <tr key={rowKey(r)}>
                    <td className="text-center" style={{ color: '#999' }}>{i + 1}</td>
                    <td><strong>{r.order_code || '-'}</strong></td>
                    <td><strong>{r.fish_name}</strong></td>
                    <td>{r.size}</td>
                    <td className="num-cell">{Number(r.bulk_weight_kg).toFixed(0)} KG</td>
                    <td>{r.production_date || '-'}</td>
                    <td>{r.expiration_date || '-'}</td>
                    <td className="num-cell">{Number(r.bulk_weight_kg) * getBalance(r)} KG</td>
                    <td className="num-cell manual-editable-cell" style={{ background: '#fef2f2', fontWeight: 700, fontSize: '0.9rem' }}>
                      <input
                        type="number"
                        min={0}
                        className="manual-balance-input"
                        value={editedBalances[rowKey(r)] !== undefined ? editedBalances[rowKey(r)] : r.hand_on_balance_mc}
                        onChange={e => setBalance(r, e.target.value)}
                      />
                    </td>
                    <td>{r.st_no || '-'}</td>
                    <td><strong>{r.line_place}</strong></td>
                    <td className="num-cell">{r.stack_no}</td>
                    <td>{r.remark || '-'}</td>
                  </tr>
                ))}
              </tbody>
              {filteredInventory.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'right', fontWeight: 700 }}>TOTALS:</td>
                    <td className="num-cell">{totalKG.toFixed(0)} KG</td>
                    <td className="num-cell" style={{ fontSize: '0.95rem' }}>{totalMC}</td>
                    <td colSpan="4"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          ) : (
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
                {filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan="15" style={{ textAlign: 'center', padding: 60, color: '#999' }}>
                      No stock data found. Adjust filters or record Stock IN first.
                    </td>
                  </tr>
                ) : filteredInventory.map((r, i) => (
                  <tr key={rowKey(r)}>
                    <td className="text-center" style={{ color: '#999' }}>{i + 1}</td>
                    <td><strong>{r.fish_name}</strong></td>
                    <td>{r.size}</td>
                    <td className="num-cell">{Number(r.bulk_weight_kg).toFixed(2)}</td>
                    <td>{r.type || '-'}</td>
                    <td>{r.glazing || '-'}</td>
                    <td className="manual-editable-cell">
                      <input
                        type="date"
                        className="manual-date-input"
                        value={getCsInDate(r)}
                        onChange={e => setCsInDate(r.lot_id, e.target.value)}
                      />
                    </td>
                    <td>{r.sticker || '-'}</td>
                    <td><strong>{r.line_place}</strong></td>
                    <td className="num-cell">{r.stack_no}</td>
                    <td className="num-cell">{r.stack_total}</td>
                    <td className="num-cell" style={{ background: '#f0fdf4' }}>{r.old_balance_mc}</td>
                    <td className="num-cell" style={{ background: '#eff6ff', color: '#1d4ed8', fontWeight: 600 }}>{r.new_income_mc || '-'}</td>
                    <td className="num-cell manual-editable-cell" style={{ background: '#fef2f2', fontWeight: 700, fontSize: '0.9rem' }}>
                      <input
                        type="number"
                        min={0}
                        className="manual-balance-input"
                        value={editedBalances[rowKey(r)] !== undefined ? editedBalances[rowKey(r)] : r.hand_on_balance_mc}
                        onChange={e => setBalance(r, e.target.value)}
                      />
                    </td>
                    <td className="num-cell">{Number(r.bulk_weight_kg) * getBalance(r)}</td>
                  </tr>
                ))}
              </tbody>
              {filteredInventory.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan="11" style={{ textAlign: 'right', fontWeight: 700 }}>TOTALS:</td>
                    <td className="num-cell">{filteredInventory.reduce((s, r) => s + Number(r.old_balance_mc), 0)}</td>
                    <td className="num-cell">{filteredInventory.reduce((s, r) => s + Number(r.new_income_mc), 0)}</td>
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

export default Manual;
