import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import { FiDownload, FiSearch, FiPackage, FiBox, FiTrash2, FiAnchor, FiChevronDown, FiCheck, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { getInventory, deleteAllStockData } from '../services/api';
import * as XLSX from 'xlsx';

const TABS = [
  { id: 'BULK', label: 'Bulk', icon: <FiPackage /> },
  { id: 'CONTAINER_EXTRA', label: 'Container Extra', icon: <FiBox /> },
  { id: 'IMPORT', label: 'Import', icon: <FiAnchor /> }
];

const BULK_COLUMNS = [
  { key: 'fish_name', label: 'Fish Name' },
  { key: 'size', label: 'Size' },
  { key: 'bulk_weight_kg', label: 'Bulk Wt (KG)' },
  { key: 'type', label: 'Type' },
  { key: 'glazing', label: 'Glazing' },
  { key: 'cs_in_date', label: 'CS In Date' },
  { key: 'sticker', label: 'Sticker' },
  { key: 'line_place', label: 'Lines / Place' },
  { key: 'stack_no', label: 'Stack No' },
  { key: 'stack_total', label: 'Stack Total' },
  { key: 'old_balance_mc', label: 'Old Balance' },
  { key: 'new_income_mc', label: 'New Income' },
  { key: 'hand_on_balance_mc', label: 'Hand On Balance' },
  { key: 'hand_on_balance_kg', label: 'KG' }
];

const CE_IMPORT_COLUMNS = [
  { key: 'order_code', label: null },
  { key: 'fish_name', label: 'Fish Name' },
  { key: 'size', label: 'Size' },
  { key: 'bulk_weight_kg', label: 'KG' },
  { key: 'cs_in_date', label: 'Arrival Date' },
  { key: 'hand_on_balance_kg', label: 'Total KG' },
  { key: 'hand_on_balance_mc', label: 'Balance MC' },
  { key: 'line_place', label: 'Line' },
  { key: 'remark', label: 'Remark' }
];

// ─── Google Sheets–style column filter dropdown ────────────────────────
function ColumnFilterDropdown({ columnKey, allValues, selected, onApply, onClear }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [localSelected, setLocalSelected] = useState(new Set(selected));
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const popupRef = useRef(null);
  const uniqueCount = new Set(allValues.map(v => v != null ? String(v) : '(Blank)')).size;
  const isFiltered = selected.size < uniqueCount;

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (popupRef.current && popupRef.current.contains(e.target)) return;
      if (btnRef.current && btnRef.current.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => { if (open) setLocalSelected(new Set(selected)); }, [open, selected]);

  const handleOpen = () => {
    if (open) { setOpen(false); return; }
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      let left = rect.left;
      const popW = 300;
      if (left + popW > window.innerWidth - 12) left = window.innerWidth - popW - 12;
      if (left < 8) left = 8;
      setPos({ top: rect.bottom + 4, left });
    }
    setOpen(true);
  };

  const uniqueValues = useMemo(() => {
    const vals = [...new Set(allValues.map(v => v != null ? String(v) : '(Blank)'))];
    vals.sort((a, b) => a === '(Blank)' ? 1 : b === '(Blank)' ? -1 : a.localeCompare(b, undefined, { numeric: true }));
    return vals;
  }, [allValues]);

  const displayValues = useMemo(() => {
    if (!search.trim()) return uniqueValues;
    const q = search.toLowerCase();
    return uniqueValues.filter(v => v.toLowerCase().includes(q));
  }, [uniqueValues, search]);

  const allDisplaySelected = displayValues.length > 0 && displayValues.every(v => localSelected.has(v));

  const toggleValue = (val) => {
    setLocalSelected(prev => {
      const next = new Set(prev);
      next.has(val) ? next.delete(val) : next.add(val);
      return next;
    });
  };

  const handleSelectAll = () => {
    setLocalSelected(prev => {
      const next = new Set(prev);
      if (allDisplaySelected) { displayValues.forEach(v => next.delete(v)); }
      else { displayValues.forEach(v => next.add(v)); }
      return next;
    });
  };

  const handleApply = () => { onApply(localSelected); setOpen(false); setSearch(''); };
  const handleClearFilter = () => { onClear(); setOpen(false); setSearch(''); };

  const popup = open ? ReactDOM.createPortal(
    <div className="gs-filter-popup" ref={popupRef} style={{ top: pos.top, left: pos.left }}>
      <div className="gs-filter-search">
        <FiSearch size={13} />
        <input type="text" placeholder="Search..." value={search}
          onChange={e => setSearch(e.target.value)} autoFocus />
        {search && <button className="gs-filter-clear-search" onClick={() => setSearch('')}><FiX size={12} /></button>}
      </div>
      <div className="gs-filter-actions-top">
        <button onClick={handleSelectAll}>{allDisplaySelected ? 'Deselect All' : 'Select All'}</button>
        {isFiltered && <button onClick={handleClearFilter} className="gs-filter-clear-btn">Clear Filter</button>}
      </div>
      <div className="gs-filter-list">
        {displayValues.length === 0 ? (
          <div className="gs-filter-empty">No matches</div>
        ) : displayValues.map(val => (
          <div key={val} className="gs-filter-item" onClick={() => toggleValue(val)}>
            <div className={`gs-checkbox ${localSelected.has(val) ? 'gs-checked' : ''}`}>
              {localSelected.has(val) && <FiCheck size={11} />}
            </div>
            <span className="gs-filter-val">{val}</span>
          </div>
        ))}
      </div>
      <div className="gs-filter-footer">
        <button className="gs-filter-cancel" onClick={() => { setOpen(false); setSearch(''); }}>Cancel</button>
        <button className="gs-filter-ok" onClick={handleApply}>OK</button>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className="gs-filter-wrap">
      <button ref={btnRef}
        className={`gs-filter-btn ${isFiltered ? 'gs-filter-active' : ''}`}
        onClick={handleOpen} title="Filter this column">
        <FiChevronDown size={12} />
      </button>
      {popup}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────
function StockTable() {
  const [activeTab, setActiveTab] = useState('BULK');
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [columnFilters, setColumnFilters] = useState({});

  const isCE = activeTab === 'CONTAINER_EXTRA';
  const isImport = activeTab === 'IMPORT';
  const isNonBulk = isCE || isImport;
  const columns = isNonBulk ? CE_IMPORT_COLUMNS : BULK_COLUMNS;

  const fetchInventory = useCallback(async () => {
    try {
      const res = await getInventory({ stock_type: activeTab });
      setInventory(res.data);
    } catch (err) {
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    setLoading(true);
    setSearchQuery('');
    setColumnFilters({});
    fetchInventory();
  }, [activeTab, fetchInventory]);

  const allColumnValues = useMemo(() => {
    const map = {};
    columns.forEach(({ key }) => {
      map[key] = inventory.map(r => {
        const v = r[key];
        return v != null && v !== '' ? String(v) : null;
      });
    });
    return map;
  }, [inventory, columns]);

  const filteredInventory = useMemo(() => {
    let list = inventory;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(row =>
        columns.some(({ key }) => {
          const v = row[key];
          const str = v != null && v !== '' ? String(v) : '';
          return str.toLowerCase().includes(q);
        })
      );
    }
    return list.filter(row =>
      columns.every(({ key }) => {
        const selected = columnFilters[key];
        if (!selected) return true;
        const v = row[key];
        const str = v != null && v !== '' ? String(v) : '(Blank)';
        return selected.has(str);
      })
    );
  }, [inventory, columnFilters, columns, searchQuery]);

  const applyColumnFilter = (key, selected) => {
    const allVals = new Set(allColumnValues[key].map(v => v != null ? v : '(Blank)'));
    if (selected.size === allVals.size) {
      setColumnFilters(prev => { const next = { ...prev }; delete next[key]; return next; });
    } else {
      setColumnFilters(prev => ({ ...prev, [key]: selected }));
    }
  };

  const clearColumnFilter = (key) => {
    setColumnFilters(prev => { const next = { ...prev }; delete next[key]; return next; });
  };

  const activeFilterCount = Object.keys(columnFilters).length;


  const handleDeleteAll = async () => {
    const label = isCE ? 'Container Extra' : isImport ? 'Import' : 'Bulk';
    if (!window.confirm(`Delete ALL ${label} stock data? (${inventory.length} items)\n\nThis will remove all movements and lots for ${label} stock. Products will remain.`)) return;
    if (!window.confirm('This is irreversible. Confirm again to proceed.')) return;
    try {
      const res = await deleteAllStockData({ stock_type: activeTab });
      toast.success(res.data.message || 'All stock data deleted');
      setLoading(true);
      fetchInventory();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete stock data');
    }
  };

  const handleClearAllFilters = () => { setColumnFilters({}); };

  const totalMC = filteredInventory.reduce((sum, r) => sum + Number(r.hand_on_balance_mc), 0);
  const totalKG = filteredInventory.reduce((sum, r) => sum + Number(r.hand_on_balance_kg), 0);
  const totalStacks = new Set(filteredInventory.map(r => `${r.line_place}-${r.stack_no}`)).size;

  const exportExcel = () => {
    let data;
    const source = filteredInventory;
    if (isNonBulk) {
      const orderLabel = isImport ? 'Invoice No' : 'Order';
      data = source.map((r, i) => ({
        '#': i + 1, [orderLabel]: r.order_code || '', 'Fish Name': r.fish_name,
        'Size': r.size, 'KG': Number(r.bulk_weight_kg), 'Arrival Date': r.cs_in_date || '',
        'Line': r.line_place, 'Balance MC': Number(r.hand_on_balance_mc),
        'Total KG': Number(r.hand_on_balance_kg), 'Remark': r.remark || ''
      }));
      data.push({ '#': '', [orderLabel]: '', 'Fish Name': 'TOTAL', 'Size': '', 'KG': '',
        'Arrival Date': '', 'Line': '', 'Balance MC': totalMC, 'Total KG': totalKG, 'Remark': '' });
    } else {
      data = source.map((r, i) => ({
        '#': i + 1, 'Fish Name': r.fish_name, 'Size': r.size,
        'Bulk Weight (KG)': Number(r.bulk_weight_kg), 'Type': r.type || '', 'Glazing': r.glazing || '',
        'CS In Date': r.cs_in_date, 'Sticker': r.sticker || '', 'Lines / Place': r.line_place,
        'Stack No': r.stack_no, 'Stack Total': r.stack_total,
        'Old Balance': Number(r.old_balance_mc), 'New Income': Number(r.new_income_mc),
        'Hand On Balance': Number(r.hand_on_balance_mc), 'Weight (KG)': Number(r.hand_on_balance_kg)
      }));
      data.push({ '#': '', 'Fish Name': 'TOTAL', 'Size': '', 'Bulk Weight (KG)': '',
        'Type': '', 'Glazing': '', 'CS In Date': '', 'Sticker': '', 'Lines / Place': '',
        'Stack No': '', 'Stack Total': totalStacks, 'Old Balance': '', 'New Income': '',
        'Hand On Balance': totalMC, 'Weight (KG)': totalKG });
    }
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    const sheetName = isCE ? 'Container Extra Stock' : isImport ? 'Import Stock' : 'Bulk Stock';
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const prefix = isCE ? 'Container_Extra' : isImport ? 'Import' : 'Bulk';
    XLSX.writeFile(wb, `WMS_${prefix}_Stock_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Excel file downloaded');
  };

  if (loading) return <div className="loading"><div className="spinner"></div>Loading stock table...</div>;

  const renderHeaderCell = (col, headerLabel, style = {}) => {
    const allVals = allColumnValues[col.key] || [];
    const allUnique = [...new Set(allVals.map(v => v != null ? v : '(Blank)'))];
    const currentSelected = columnFilters[col.key] || new Set(allUnique);
    return (
      <th key={col.key} style={style}>
        <div className="gs-th-inner">
          <span>{headerLabel}</span>
          <ColumnFilterDropdown
            columnKey={col.key}
            allValues={allVals}
            selected={currentSelected}
            onApply={(sel) => applyColumnFilter(col.key, sel)}
            onClear={() => clearColumnFilter(col.key)}
          />
        </div>
      </th>
    );
  };

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
            <button key={tab.id} className={`stock-type-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className="filter-bar">
          <div className="filter-bar-search-single">
            <FiSearch className="filter-bar-search-icon" />
            <input
              type="text"
              className="form-control"
              placeholder="Search all columns..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {activeFilterCount > 0 && (
          <div className="gs-active-filters-bar">
            <span>{activeFilterCount} column filter{activeFilterCount > 1 ? 's' : ''} active</span>
            <span className="gs-filtered-count">{filteredInventory.length} of {inventory.length} rows</span>
            <button className="btn btn-outline btn-sm" onClick={handleClearAllFilters}><FiX /> Clear All Filters</button>
          </div>
        )}

        <div className="dashboard-grid" style={{ marginBottom: 16 }}>
          <div className="stat-card"><div className="stat-info"><h4>Total MC</h4><div className="stat-value" style={{ fontSize: '1.3rem' }}>{totalMC.toLocaleString()}</div></div></div>
          <div className="stat-card"><div className="stat-info"><h4>Total KG</h4><div className="stat-value" style={{ fontSize: '1.3rem' }}>{totalKG.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div></div></div>
          <div className="stat-card"><div className="stat-info"><h4>Total Stacks</h4><div className="stat-value" style={{ fontSize: '1.3rem' }}>{totalStacks}</div></div></div>
        </div>

        <div className="table-container" style={{ maxHeight: '65vh', overflow: 'auto' }}>
          {isNonBulk ? (
            <table className="excel-table gs-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  {renderHeaderCell({ key: 'order_code' }, isImport ? 'Invoice No' : 'Order')}
                  {renderHeaderCell({ key: 'fish_name' }, 'Fish Name')}
                  {renderHeaderCell({ key: 'size' }, 'Size')}
                  {renderHeaderCell({ key: 'bulk_weight_kg' }, 'KG')}
                  {renderHeaderCell({ key: 'cs_in_date' }, 'Arrival Date')}
                  {renderHeaderCell({ key: 'hand_on_balance_kg' }, 'Total KG')}
                  {renderHeaderCell({ key: 'hand_on_balance_mc' }, 'Balance MC', { background: '#5c1a1a', color: '#f8d7da' })}
                  {renderHeaderCell({ key: 'line_place' }, 'Line')}
                  {renderHeaderCell({ key: 'remark' }, 'Remark')}
                </tr>
              </thead>
              <tbody>
                {inventory.length === 0 ? (
                  <tr><td colSpan="10" style={{ textAlign: 'center', padding: 60, color: '#999' }}>
                    No {isImport ? 'Import' : 'Container Extra'} stock found. Upload data via Excel Upload.
                  </td></tr>
                ) : filteredInventory.length === 0 ? (
                  <tr><td colSpan="10" style={{ textAlign: 'center', padding: 40, color: '#999' }}>No rows match the filters</td></tr>
                ) : filteredInventory.map((r, i) => (
                  <tr key={i}>
                    <td className="text-center" style={{ color: '#999' }}>{i + 1}</td>
                    <td><strong>{r.order_code || '-'}</strong></td>
                    <td><strong>{r.fish_name}</strong></td>
                    <td>{r.size}</td>
                    <td className="num-cell">{Number(r.bulk_weight_kg).toFixed(0)} KG</td>
                    <td>{r.cs_in_date || '-'}</td>
                    <td className="num-cell">{Number(r.hand_on_balance_kg).toFixed(0)} KG</td>
                    <td className="num-cell" style={{ background: '#fef2f2', fontWeight: 700, fontSize: '0.9rem' }}>{r.hand_on_balance_mc}</td>
                    <td><strong>{r.line_place}</strong></td>
                    <td>{r.remark || '-'}</td>
                  </tr>
                ))}
              </tbody>
              {filteredInventory.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'right', fontWeight: 700 }}>TOTALS:</td>
                    <td></td>
                    <td className="num-cell">{totalKG.toFixed(0)} KG</td>
                    <td className="num-cell" style={{ fontSize: '0.95rem' }}>{totalMC}</td>
                    <td colSpan="2"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          ) : (
            <table className="excel-table gs-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  {renderHeaderCell({ key: 'fish_name' }, 'Fish Name')}
                  {renderHeaderCell({ key: 'size' }, 'Size')}
                  {renderHeaderCell({ key: 'bulk_weight_kg' }, 'Bulk Wt (KG)')}
                  {renderHeaderCell({ key: 'type' }, 'Type')}
                  {renderHeaderCell({ key: 'glazing' }, 'Glazing')}
                  {renderHeaderCell({ key: 'cs_in_date' }, 'CS In Date')}
                  {renderHeaderCell({ key: 'sticker' }, 'Sticker')}
                  {renderHeaderCell({ key: 'line_place' }, 'Lines / Place')}
                  {renderHeaderCell({ key: 'stack_no' }, 'Stack No')}
                  {renderHeaderCell({ key: 'stack_total' }, 'Stack Total')}
                  {renderHeaderCell({ key: 'old_balance_mc' }, 'Old Balance', { background: '#2d4a1e', color: '#d4edda' })}
                  {renderHeaderCell({ key: 'new_income_mc' }, 'New Income', { background: '#1a3a5c', color: '#cce5ff' })}
                  {renderHeaderCell({ key: 'hand_on_balance_mc' }, 'Hand On Balance', { background: '#5c1a1a', color: '#f8d7da' })}
                  {renderHeaderCell({ key: 'hand_on_balance_kg' }, 'KG')}
                </tr>
              </thead>
              <tbody>
                {inventory.length === 0 ? (
                  <tr><td colSpan="15" style={{ textAlign: 'center', padding: 60, color: '#999' }}>
                    No stock data found. Record some Stock IN first or upload an Excel file.
                  </td></tr>
                ) : filteredInventory.length === 0 ? (
                  <tr><td colSpan="15" style={{ textAlign: 'center', padding: 40, color: '#999' }}>No rows match the filters</td></tr>
                ) : filteredInventory.map((r, i) => (
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

export default StockTable;
