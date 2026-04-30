import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const statusColors = { Pending: 'badge-warning', Confirmed: 'badge-success', Cancelled: 'badge-danger' };
const statusHex = { Pending: '#f39c12', Confirmed: '#27ae60', Cancelled: '#e74c3c' };

export default function AdminDashboard() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    if (!user || !isAdmin) navigate('/login');
  }, [user, isAdmin, navigate]);

  const tabs = [
    { key: 'overview', label: '📊 Overview' },
    { key: 'halls', label: '🏛️ Halls' },
    { key: 'bookings', label: '📋 Bookings' },
    { key: 'slots', label: '📅 Slots' },
    { key: 'payments', label: '💰 Payments' },
  ];

  return (
    <div>
      <div className="admin-topbar">
        <h1>Admin Dashboard</h1>
        <p>Welcome back, {user?.username}</p>
      </div>

      <div className="admin-tabs">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`admin-tab-btn ${tab === t.key ? 'active' : ''}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="page">
        {tab === 'overview' && <Overview />}
        {tab === 'halls' && <HallsTab />}
        {tab === 'bookings' && <BookingsTab />}
        {tab === 'slots' && <SlotsTab />}
        {tab === 'payments' && <PaymentsTab />}
      </div>
    </div>
  );
}

// ─── Overview ────────────────────────────────────────────────────────────────
function Overview() {
  const [stats, setStats] = useState({ halls: 0, bookings: 0, pending: 0, confirmed: 0 });

  useEffect(() => {
    Promise.all([api.get('/halls/all'), api.get('/bookings')]).then(([h, b]) => {
      const bookings = b.data;
      setStats({
        halls: h.data.length,
        bookings: bookings.length,
        pending: bookings.filter(b => b.status === 'Pending').length,
        confirmed: bookings.filter(b => b.status === 'Confirmed').length,
      });
    });
  }, []);

  return (
    <div>
      <div className="stats-grid">
        {[
          { label: 'Total Halls', value: stats.halls, icon: '🏛️' },
          { label: 'Total Bookings', value: stats.bookings, icon: '📋' },
          { label: 'Pending', value: stats.pending, icon: '⏳' },
          { label: 'Confirmed', value: stats.confirmed, icon: '✅' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ fontSize: '1.8rem' }}>{s.icon}</div>
            <div className="stat-number">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>
      <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>
        Use the tabs above to manage halls, bookings, slots, and payments.
      </p>
    </div>
  );
}

// ─── Halls Tab ───────────────────────────────────────────────────────────────
function HallsTab() {
  const [halls, setHalls] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', capacity: '', size_sqft: '', price_per_day: '', description: '', location: '', status: 'Active' });
  const [uploadingFor, setUploadingFor] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');

  const load = () => api.get('/halls/all').then(r => setHalls(r.data));
  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm({ name: '', capacity: '', size_sqft: '', price_per_day: '', description: '', location: '', status: 'Active' }); setShowModal(true); };
  const openEdit = async (h) => {
    setEditing(h);
    setForm({ name: h.name, capacity: h.capacity, size_sqft: h.size_sqft, price_per_day: h.price_per_day, description: h.description || '', location: h.location || '', status: h.status });
    // fetch images for this hall
    const r = await api.get(`/halls/${h.hall_id}`);
    setEditImages(r.data.images || []);
    setShowModal(true);
  };

  const save = async () => {
    try {
      if (editing) { await api.put(`/halls/${editing.hall_id}`, form); setMsg('Hall updated!'); }
      else { await api.post('/halls', form); setMsg('Hall created!'); }
      setShowModal(false); load();
    } catch (err) { setMsg(err.response?.data?.message || 'Error'); }
  };

  const del = async (id) => {
    if (!window.confirm('Delete this hall?')) return;
    await api.delete(`/halls/${id}`); load();
  };

  const deleteImage = async (imgId) => {
    if (!window.confirm('Delete this image?')) return;
    await api.delete(`/halls/images/${imgId}`);
    setEditImages(prev => prev.filter(img => img.img_id !== imgId));
    load();
  };

  const openUpload = (hallId) => { setUploadingFor(hallId); setImageFile(null); setPreview(null); };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const uploadImage = async () => {
    if (!imageFile || !uploadingFor) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('is_primary', 'true');
      await api.post(`/halls/${uploadingFor}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMsg('Image uploaded!');
      setUploadingFor(null); setImageFile(null); setPreview(null);
      load();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Upload failed');
    } finally { setUploading(false); }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Manage Halls</h1>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Hall</button>
      </div>
      {msg && <div className="alert alert-success">{msg}</div>}

      <div className="table-wrap card">
        <table>
          <thead><tr><th>Image</th><th>Name</th><th>Capacity</th><th>Price/Day</th><th>Location</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {halls.map(h => (
              <tr key={h.hall_id}>
                <td>
                  {h.primary_image
                    ? <img src={h.primary_image} alt={h.name}
                        style={{ width: '56px', height: '42px', objectFit: 'cover', borderRadius: '6px' }} />
                    : <div style={{ width: '56px', height: '42px', background: 'var(--cream-dark)', borderRadius: '6px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>💒</div>
                  }
                </td>
                <td><strong>{h.name}</strong></td>
                <td>{h.capacity}</td>
                <td>₹{Number(h.price_per_day).toLocaleString()}</td>
                <td>{h.location || '—'}</td>
                <td><span className={`badge ${h.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>{h.status}</span></td>
                <td style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => openEdit(h)}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => del(h.hall_id)}>Delete</button>
                  <button className="btn btn-success btn-sm" onClick={() => openUpload(h.hall_id)}>📷 Image</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Image Upload Modal */}
      {uploadingFor && (
        <div className="modal-overlay" onClick={() => setUploadingFor(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h2>Upload Image</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              For: <strong>{halls.find(h => h.hall_id === uploadingFor)?.name}</strong>
            </p>
            <div style={{ border: '2px dashed var(--cream-dark)', borderRadius: '10px', padding: '1.5rem',
              textAlign: 'center', cursor: 'pointer', marginBottom: '1rem', background: preview ? '#fff' : 'var(--beige)' }}
              onClick={() => document.getElementById('img-file-input').click()}>
              {preview
                ? <img src={preview} alt="preview" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', objectFit: 'cover' }} />
                : <>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📁</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Click to browse image</div>
                    <div style={{ color: '#bbb', fontSize: '0.8rem', marginTop: '0.3rem' }}>JPG, PNG, WEBP up to 5MB</div>
                  </>
              }
            </div>
            <input id="img-file-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
            {preview && (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                ✅ {imageFile?.name}
                <button onClick={() => { setImageFile(null); setPreview(null); }}
                  style={{ marginLeft: '0.5rem', background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer', fontSize: '0.85rem' }}>
                  ✕ Remove
                </button>
              </p>
            )}
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setUploadingFor(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={uploadImage} disabled={!imageFile || uploading}>
                {uploading ? 'Uploading...' : '⬆ Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hall Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editing ? 'Edit Hall' : 'Add New Hall'}</h2>
            <div className="form-group"><label>Name</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="form-row">
              <div className="form-group"><label>Capacity</label><input type="number" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} /></div>
              <div className="form-group"><label>Size (sqft)</label><input type="number" value={form.size_sqft} onChange={e => setForm({ ...form, size_sqft: e.target.value })} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Price per Day (₹)</label><input type="number" value={form.price_per_day} onChange={e => setForm({ ...form, price_per_day: e.target.value })} /></div>
              <div className="form-group"><label>Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option>Active</option><option>Inactive</option>
                </select>
              </div>
            </div>
            <div className="form-group"><label>Location</label><input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
            <div className="form-group"><label>Description</label><textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>

            {editing && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-mid)', display: 'block', marginBottom: '0.5rem' }}>
                  Hall Images
                </label>
                {editImages.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No images uploaded yet.</p>
                ) : (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {editImages.map(img => (
                      <div key={img.img_id} style={{ position: 'relative' }}>
                        <img src={img.image_url} alt=""
                          style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '6px',
                            border: img.is_primary ? '3px solid var(--terracotta)' : '2px solid var(--cream-dark)' }} />
                        {img.is_primary && (
                          <div style={{ position: 'absolute', top: '2px', left: '2px', background: 'var(--terracotta)',
                            color: 'white', fontSize: '0.55rem', padding: '1px 4px', borderRadius: '3px', fontWeight: 700 }}>
                            PRIMARY
                          </div>
                        )}
                        <button onClick={() => deleteImage(img.img_id)}
                          style={{ position: 'absolute', top: '-6px', right: '-6px', width: '18px', height: '18px',
                            background: '#c0392b', color: 'white', border: 'none', borderRadius: '50%',
                            cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, lineHeight: 1 }}>
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button className="btn btn-success btn-sm" style={{ marginTop: '0.75rem' }}
                  onClick={() => { setShowModal(false); openUpload(editing.hall_id); }}>
                  + Upload New Image
                </button>
              </div>
            )}

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Bookings Tab ────────────────────────────────────────────────────────────
function BookingsTab() {
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState('All');
  const [selected, setSelected] = useState(null);
  const [payments, setPayments] = useState([]);
  const [payForm, setPayForm] = useState({ amount: '', payment_type: 'Advance' });
  const [msg, setMsg] = useState('');

  const load = () => api.get('/bookings').then(r => setBookings(r.data));
  useEffect(() => { load(); }, []);

  const updateStatus = async (id, status) => {
    await api.patch(`/bookings/${id}/status`, { status }); load(); setSelected(null);
  };

  const viewBooking = async (b) => {
    setSelected(b); setMsg('');
    const r = await api.get(`/payments/${b.booking_id}`);
    setPayments(r.data);
  };

  const addPayment = async () => {
    if (!payForm.amount) return;
    await api.post('/payments', { booking_id: selected.booking_id, ...payForm });
    setMsg('Payment recorded!');
    const r = await api.get(`/payments/${selected.booking_id}`);
    setPayments(r.data);
    setPayForm({ amount: '', payment_type: 'Advance' });
  };

  const filtered = filter === 'All' ? bookings : bookings.filter(b => b.status === filter);

  return (
    <div>
      <div className="page-header">
        <h1>Manage Bookings</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['All', 'Pending', 'Confirmed', 'Cancelled'].map(s => (
            <button key={s} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(s)}>{s}</button>
          ))}
        </div>
      </div>

      <div className="table-wrap card">
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Customer</th><th>Contact</th><th>Hall</th><th>Date</th><th>Time</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(b => (
              <tr key={b.booking_id}>
                <td>#{b.booking_id}</td>
                <td>
                  <div style={{ fontWeight: 600 }}>{b.username}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{b.email}</div>
                </td>
                <td>
                  {b.contact_name ? (
                    <>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{b.contact_name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>📞 {b.contact_phone}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>✉️ {b.contact_email}</div>
                    </>
                  ) : <span style={{ color: '#bbb', fontSize: '0.8rem' }}>—</span>}
                </td>
                <td>{b.hall_name}</td>
                <td>{b.slot_date?.slice(0, 10)}</td>
                <td>{b.start_time?.slice(0, 5)} – {b.end_time?.slice(0, 5)}</td>
                <td><span className={`badge ${statusColors[b.status]}`}>{b.status}</span></td>
                <td><button className="btn btn-secondary btn-sm" onClick={() => viewBooking(b)}>Manage</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Booking #{selected.booking_id}</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              {/* Booking Info */}
              <div style={{ background: 'var(--beige)', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--espresso)', marginBottom: '0.5rem' }}>📋 Booking Info</div>
                <div style={{ fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div><strong>Hall:</strong> {selected.hall_name}</div>
                  <div><strong>Date:</strong> {selected.slot_date?.slice(0, 10)}</div>
                  <div><strong>Time:</strong> {selected.start_time?.slice(0, 5)} – {selected.end_time?.slice(0, 5)}</div>
                  <div><strong>Status:</strong> <span className={`badge ${statusColors[selected.status]}`}>{selected.status}</span></div>
                  {selected.notes && <div><strong>Notes:</strong> {selected.notes}</div>}
                </div>
              </div>

              {/* Contact Info */}
              <div style={{ background: 'var(--beige)', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--espresso)', marginBottom: '0.5rem' }}>👤 Contact Details</div>
                <div style={{ fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div><strong>Name:</strong> {selected.contact_name || selected.username}</div>
                  <div><strong>Phone:</strong> {selected.contact_phone || '—'}</div>
                  <div><strong>Email:</strong> {selected.contact_email || selected.email}</div>
                  <div><strong>Account:</strong> {selected.username}</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <button className="btn btn-success btn-sm" onClick={() => updateStatus(selected.booking_id, 'Confirmed')}>✅ Confirm</button>
              <button className="btn btn-danger btn-sm" onClick={() => updateStatus(selected.booking_id, 'Cancelled')}>❌ Cancel</button>
            </div>

            <h3 style={{ color: 'var(--espresso)', marginBottom: '0.75rem', fontSize: '1rem' }}>💰 Payments</h3>
            {msg && <div className="alert alert-success">{msg}</div>}
            {payments.length > 0 && (
              <table style={{ marginBottom: '1rem' }}>
                <thead><tr><th>Type</th><th>Amount</th><th>Date</th></tr></thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.payment_id}>
                      <td><span className="badge badge-info">{p.payment_type}</span></td>
                      <td>₹{Number(p.amount).toLocaleString()}</td>
                      <td>{new Date(p.payment_date).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="form-row">
              <div className="form-group">
                <label>Amount (₹)</label>
                <input type="number" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Type</label>
                <select value={payForm.payment_type} onChange={e => setPayForm({ ...payForm, payment_type: e.target.value })}>
                  <option>Advance</option><option>Final</option><option>Refund</option>
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>Close</button>
              <button className="btn btn-primary" onClick={addPayment}>Record Payment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Slots Tab ────────────────────────────────────────────────────────────────
function SlotsTab() {
  const [halls, setHalls] = useState([]);
  const [slots, setSlots] = useState([]);
  const [form, setForm] = useState({ hall_id: '', slot_date: '', start_time: '', end_time: '' });
  const [msg, setMsg] = useState('');

  useEffect(() => { api.get('/halls/all').then(r => setHalls(r.data)); }, []);

  const loadSlots = () => {
    if (!form.hall_id) return;
    api.get(`/slots/${form.hall_id}${form.slot_date ? `?date=${form.slot_date}` : ''}`).then(r => setSlots(r.data));
  };

  useEffect(() => { loadSlots(); }, [form.hall_id, form.slot_date]); // eslint-disable-line

  const addSlot = async () => {
    if (!form.hall_id || !form.slot_date || !form.start_time || !form.end_time)
      return setMsg('All fields required');
    try {
      await api.post('/slots', form);
      setMsg('Slot created!'); loadSlots();
    } catch (err) { setMsg(err.response?.data?.message || 'Error'); }
  };

  const delSlot = async (id) => {
    await api.delete(`/slots/${id}`); loadSlots();
  };

  return (
    <div>
      <div className="page-header"><h1>Manage Time Slots</h1></div>
      {msg && <div className="alert alert-success">{msg}</div>}

      <div className="card card-body" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem', color: 'var(--espresso)' }}>Add New Slot</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Hall</label>
            <select value={form.hall_id} onChange={e => setForm({ ...form, hall_id: e.target.value })}>
              <option value="">Select Hall</option>
              {halls.map(h => <option key={h.hall_id} value={h.hall_id}>{h.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Date</label>
            <input type="date" value={form.slot_date} onChange={e => setForm({ ...form, slot_date: e.target.value })} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>Start Time</label><input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} /></div>
          <div className="form-group"><label>End Time</label><input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} /></div>
        </div>
        <button className="btn btn-primary" onClick={addSlot}>+ Add Slot</button>
      </div>

      {slots.length > 0 && (
        <div className="table-wrap card">
          <table>
            <thead><tr><th>Hall</th><th>Date</th><th>Start</th><th>End</th><th>Available</th><th>Action</th></tr></thead>
            <tbody>
              {slots.map(s => (
                <tr key={s.slot_id}>
                  <td>{halls.find(h => h.hall_id === s.hall_id)?.name || s.hall_id}</td>
                  <td>{s.slot_date?.slice(0, 10)}</td>
                  <td>{s.start_time?.slice(0, 5)}</td>
                  <td>{s.end_time?.slice(0, 5)}</td>
                  <td><span className={`badge ${s.is_available ? 'badge-success' : 'badge-danger'}`}>{s.is_available ? 'Yes' : 'No'}</span></td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => delSlot(s.slot_id)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Payments Tab ─────────────────────────────────────────────────────────────
function PaymentsTab() {
  const [payments, setPayments] = useState([]);
  useEffect(() => { api.get('/payments').then(r => setPayments(r.data)); }, []);
  const total = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div>
      <div className="page-header">
        <h1>Payment Records</h1>
        <div className="stat-card" style={{ padding: '0.75rem 1.5rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Revenue</div>
          <div style={{ fontWeight: 700, color: 'var(--terracotta)', fontSize: '1.2rem' }}>₹{total.toLocaleString()}</div>
        </div>
      </div>
      <div className="table-wrap card">
        <table>
          <thead><tr><th>Booking #</th><th>Customer</th><th>Contact</th><th>Hall</th><th>Type</th><th>Amount</th><th>Date</th><th>Status</th></tr></thead>
          <tbody>
            {payments.map(p => (
              <tr key={p.payment_id}>
                <td>#{p.booking_id}</td>
                <td>{p.username}</td>
                <td>
                  {p.contact_phone ? (
                    <div style={{ fontSize: '0.82rem' }}>
                      <div>📞 {p.contact_phone}</div>
                      <div style={{ color: 'var(--text-muted)' }}>✉️ {p.contact_email}</div>
                    </div>
                  ) : '—'}
                </td>
                <td>{p.hall_name}</td>
                <td><span className="badge badge-info">{p.payment_type}</span></td>
                <td>₹{Number(p.amount).toLocaleString()}</td>
                <td>{new Date(p.payment_date).toLocaleDateString()}</td>
                <td><span className={`badge ${statusColors[p.booking_status]}`}>{p.booking_status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}