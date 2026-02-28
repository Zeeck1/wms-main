import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiSearch } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { getProducts, createProduct, updateProduct, deleteProduct, deleteAllProducts } from '../services/api';

function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ fish_name: '', size: '', bulk_weight_kg: '', type: '', glazing: '' });

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    try {
      const res = await getProducts();
      setProducts(res.data);
    } catch (err) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ fish_name: '', size: '', bulk_weight_kg: '', type: '', glazing: '' });
    setShowModal(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({
      fish_name: p.fish_name,
      size: p.size,
      bulk_weight_kg: p.bulk_weight_kg || '',
      type: p.type || '',
      glazing: p.glazing || ''
    });
    setShowModal(true);
  };

  // Check if a product with the same key fields already exists
  const isDuplicate = (formData, editingId) => {
    return products.find(p => {
      if (editingId && p.id === editingId) return false; // skip self when editing
      return (
        p.fish_name.toLowerCase() === formData.fish_name.trim().toLowerCase() &&
        p.size.toLowerCase() === formData.size.trim().toLowerCase() &&
        (p.type || '').toLowerCase() === (formData.type || '').trim().toLowerCase() &&
        (p.glazing || '').toLowerCase() === (formData.glazing || '').trim().toLowerCase()
      );
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fish_name || !form.size) {
      toast.warning('Fish name and size are required');
      return;
    }

    // Frontend duplicate check
    const dup = isDuplicate(form, editing?.id);
    if (dup) {
      toast.error(`This product already exists: "${dup.fish_name} - ${dup.size}" (${dup.type || 'no type'}, ${dup.glazing || 'no glazing'})`);
      return;
    }

    try {
      if (editing) {
        await updateProduct(editing.id, form);
        toast.success('Product updated');
      } else {
        await createProduct(form);
        toast.success('Product created');
      }
      setShowModal(false);
      fetchProducts();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to save product';
      if (msg.includes('already exists')) {
        toast.error('A product with this exact combination (Fish Name + Size + Type + Glazing) already exists.');
      } else {
        toast.error(msg);
      }
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deactivate this product?')) return;
    try {
      await deleteProduct(id);
      toast.success('Product deactivated');
      fetchProducts();
    } catch (err) {
      toast.error('Failed to delete product');
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm(`Are you sure you want to delete ALL ${products.length} products?\n\nThis action will deactivate every product.`)) return;
    if (!window.confirm('This is irreversible. Confirm again to proceed.')) return;
    try {
      const res = await deleteAllProducts();
      toast.success(res.data.message || 'All products deleted');
      fetchProducts();
    } catch (err) {
      toast.error('Failed to delete all products');
    }
  };

  // Filter products by search text
  const filtered = products.filter(p => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.fish_name.toLowerCase().includes(q) ||
      p.size.toLowerCase().includes(q) ||
      (p.type || '').toLowerCase().includes(q) ||
      (p.glazing || '').toLowerCase().includes(q)
    );
  });

  if (loading) return <div className="loading"><div className="spinner"></div>Loading products...</div>;

  return (
    <>
      <div className="page-header">
        <h2>Product Master</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          {products.length > 0 && (
            <button className="btn btn-danger" onClick={handleDeleteAll}><FiTrash2 /> Delete All</button>
          )}
          <button className="btn btn-primary" onClick={openAdd}><FiPlus /> Add Product</button>
        </div>
      </div>
      <div className="page-body">
        {/* Search Bar */}
        <div className="filter-bar">
          <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
            <FiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
            <input
              className="form-control"
              style={{ paddingLeft: 36 }}
              placeholder="Search by fish name, size, type, glazing..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <span style={{ color: 'var(--gray-400)', fontSize: '0.82rem' }}>
            {filtered.length} of {products.length} products
          </span>
        </div>

        <div className="table-container">
          <table className="excel-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Fish Name</th>
                <th>Size</th>
                <th>Bulk Weight (KG)</th>
                <th>Type</th>
                <th>Glazing</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                  {search ? 'No products match your search.' : 'No products found. Click "Add Product" to create one.'}
                </td></tr>
              ) : filtered.map((p, i) => (
                <tr key={p.id}>
                  <td className="text-center">{i + 1}</td>
                  <td><strong>{p.fish_name}</strong></td>
                  <td>{p.size}</td>
                  <td className="num-cell">{Number(p.bulk_weight_kg).toFixed(2)}</td>
                  <td>{p.type || '-'}</td>
                  <td>{p.glazing || '-'}</td>
                  <td>
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(p)}><FiEdit2 /></button>
                    {' '}
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}><FiTrash2 /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? 'Edit Product' : 'Add Product'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Fish Name *</label>
                    <input className="form-control" value={form.fish_name} onChange={e => setForm({ ...form, fish_name: e.target.value })} placeholder="e.g. Pangasius" required />
                  </div>
                  <div className="form-group">
                    <label>Size *</label>
                    <input className="form-control" value={form.size} onChange={e => setForm({ ...form, size: e.target.value })} placeholder="e.g. 800-1000g" required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Bulk Weight (KG)</label>
                    <input className="form-control" type="number" step="0.01" value={form.bulk_weight_kg} onChange={e => setForm({ ...form, bulk_weight_kg: e.target.value })} placeholder="0.00" />
                  </div>
                  <div className="form-group">
                    <label>Type</label>
                    <input className="form-control" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} placeholder="e.g. Frozen" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Glazing</label>
                  <input className="form-control" value={form.glazing} onChange={e => setForm({ ...form, glazing: e.target.value })} placeholder="e.g. 20%" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default Products;
