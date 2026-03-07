import React, { useState, useEffect, useCallback } from 'react';
import { FiArrowUpCircle, FiPackage, FiBox } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { getInventory, stockOut } from '../services/api';

const TABS = [
  { id: 'BULK', label: 'Bulk', icon: <FiPackage /> },
  { id: 'CONTAINER_EXTRA', label: 'Container Extra', icon: <FiBox /> }
];

function StockOut() {
  const [activeTab, setActiveTab] = useState('BULK');
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const [form, setForm] = useState({
    quantity_mc: '',
    weight_kg: '',
    reference_no: '',
    notes: ''
  });

  const isCE = activeTab === 'CONTAINER_EXTRA';

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

  useEffect(() => { setLoading(true); fetchInventory(); }, [activeTab, fetchInventory]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSelectedRow(null);
    setForm({ quantity_mc: '', weight_kg: '', reference_no: '', notes: '' });
  };

  const selectItem = (item) => {
    setSelectedRow(item);
    setForm({ quantity_mc: '', weight_kg: '', reference_no: '', notes: '' });
  };

  const handleQtyChange = (qty) => {
    const autoWeight = selectedRow ? (parseInt(qty) || 0) * Number(selectedRow.bulk_weight_kg) : '';
    setForm({ ...form, quantity_mc: qty, weight_kg: autoWeight ? autoWeight.toFixed(2) : '' });
  };

  const handleStockOut = async (e) => {
    e.preventDefault();
    if (!selectedRow || !form.quantity_mc) {
      toast.warning('Select an item and enter quantity');
      return;
    }
    if (parseInt(form.quantity_mc) > selectedRow.hand_on_balance_mc) {
      toast.error(`Cannot stock out more than Hand On balance (${selectedRow.hand_on_balance_mc} MC)`);
      return;
    }

    setSubmitting(true);
    try {
      await stockOut({
        lot_id: selectedRow.lot_id,
        location_id: selectedRow.location_id,
        quantity_mc: parseInt(form.quantity_mc),
        weight_kg: parseFloat(form.weight_kg) || 0,
        reference_no: form.reference_no,
        notes: form.notes
      });
      toast.success(`Stock OUT recorded: ${form.quantity_mc} MC`);
      setSelectedRow(null);
      setForm({ quantity_mc: '', weight_kg: '', reference_no: '', notes: '' });
      fetchInventory();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to record stock out');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading"><div className="spinner"></div>Loading...</div>;

  return (
    <>
      <div className="page-header">
        <h2><FiArrowUpCircle style={{ color: 'var(--danger)' }} /> Stock OUT (Loading)</h2>
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

        {selectedRow && (
          <div className="card" style={{ marginBottom: 20, maxWidth: 720 }}>
            <div className="card-header">
              <h3>Remove Stock From Location</h3>
              <button className="btn btn-outline btn-sm" onClick={() => setSelectedRow(null)}>Cancel</button>
            </div>
            <div className="card-body">
              <div className="alert alert-warning">
                {isCE && selectedRow.order_code && <><strong>{selectedRow.order_code}</strong> — </>}
                <strong>{selectedRow.fish_name}</strong> ({selectedRow.size}) |
                {!isCE && <> Lot: {selectedRow.lot_no} |</>}
                {' '}Location: {selectedRow.line_place} |
                <strong> Hand On: {selectedRow.hand_on_balance_mc} MC</strong>
              </div>
              <form onSubmit={handleStockOut}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Quantity OUT (MC) *</label>
                    <input className="form-control" type="number" min="1" max={selectedRow.hand_on_balance_mc} value={form.quantity_mc} onChange={e => handleQtyChange(e.target.value)} placeholder={`Max: ${selectedRow.hand_on_balance_mc}`} required />
                  </div>
                  <div className="form-group">
                    <label>Weight (KG)</label>
                    <input className="form-control" type="number" step="0.01" value={form.weight_kg} onChange={e => setForm({ ...form, weight_kg: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Reference No</label>
                    <input className="form-control" value={form.reference_no} onChange={e => setForm({ ...form, reference_no: e.target.value })} placeholder="Invoice number" />
                  </div>
                  <div className="form-group">
                    <label>Notes</label>
                    <input className="form-control" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Loading notes" />
                  </div>
                </div>
                <button type="submit" className="btn btn-danger" disabled={submitting}>
                  <FiArrowUpCircle /> {submitting ? 'Recording...' : 'Record Stock OUT'}
                </button>
              </form>
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-header">
            <h3>Select Item to Stock Out ({isCE ? 'Container Extra' : 'Bulk'})</h3>
          </div>
          <div className="table-container">
            <table className="excel-table">
              <thead>
                <tr>
                  {isCE && <th>Order</th>}
                  <th>Fish Name</th>
                  <th>Size</th>
                  {!isCE && <th>Lot No</th>}
                  <th>Location</th>
                  <th>Hand On (MC)</th>
                  <th>Hand On (KG)</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {inventory.length === 0 ? (
                  <tr><td colSpan={isCE ? 7 : 7} style={{ textAlign: 'center', padding: 40, color: '#999' }}>No stock available</td></tr>
                ) : inventory.map((item, i) => (
                  <tr key={i} style={{ background: selectedRow === item ? '#dbeafe' : undefined, cursor: 'pointer' }} onClick={() => selectItem(item)}>
                    {isCE && <td><strong>{item.order_code || '-'}</strong></td>}
                    <td><strong>{item.fish_name}</strong></td>
                    <td>{item.size}</td>
                    {!isCE && <td>{item.lot_no}</td>}
                    <td>{item.line_place}</td>
                    <td className="num-cell"><strong>{item.hand_on_balance_mc}</strong></td>
                    <td className="num-cell">{Number(item.hand_on_balance_kg).toFixed(2)}</td>
                    <td>
                      <button className="btn btn-danger btn-sm" onClick={(e) => { e.stopPropagation(); selectItem(item); }}>
                        <FiArrowUpCircle /> OUT
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

export default StockOut;
