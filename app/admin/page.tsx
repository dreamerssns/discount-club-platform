'use client';

import { useState, useEffect, useCallback } from 'react';

// ─── Types ─────────────────────────────────────────────────────────────────────

type BookingStatus = 'pending' | 'approved' | 'rejected' | 'contacted' | 'completed';

interface Booking {
  _id: string;
  email: string;
  domain: string;
  name: string;
  phoneNumber: string;
  bnbName: string;
  checkInDate: string;
  checkOutDate: string;
  vehicle?: string;
  priceExpectation?: string;
  comments?: string;
  status: BookingStatus;
  notes: string;
  createdAt: string;
  statusHistory: { status: string; changedAt: string; notes: string }[];
  confirmedBnbId?: string;
  confirmedPropertyAddress?: string;
  confirmedOperatorName?: string;
  confirmedPrice?: string;
  confirmedCheckInTime?: string;
  confirmedCheckOutTime?: string;
  confirmationSentAt?: string;
}

type BnbStatus = 'pending' | 'approved' | 'rejected';

interface Bnb {
  _id: string;
  ownerName: string;
  bnbName: string;
  address: string;
  email: string;
  domain: string;
  status: BnbStatus;
  verified: boolean;
  createdAt: string;
}

interface Stats { total: number; pending: number; approved: number; contacted: number }

const BNB_STATUS_CONFIG: Record<BnbStatus, { label: string; bg: string; text: string }> = {
  pending:  { label: 'Pending',  bg: 'bg-yellow-100', text: 'text-yellow-800' },
  approved: { label: 'Approved', bg: 'bg-green-100',  text: 'text-green-800' },
  rejected: { label: 'Rejected', bg: 'bg-red-100',     text: 'text-red-800'  },
};

// ─── Constants ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<BookingStatus, { label: string; bg: string; text: string }> = {
  pending:   { label: 'Pending',   bg: 'bg-yellow-100', text: 'text-yellow-800' },
  approved:  { label: 'Approved',  bg: 'bg-green-100',  text: 'text-green-800'  },
  rejected:  { label: 'Rejected',  bg: 'bg-red-100',    text: 'text-red-800'    },
  contacted: { label: 'Contacted', bg: 'bg-blue-100',   text: 'text-blue-800'   },
  completed: { label: 'Completed', bg: 'bg-gray-100',   text: 'text-gray-700'   },
};

// ─── Login Screen ──────────────────────────────────────────────────────────────

function LoginScreen({ onAuthenticated }: { onAuthenticated: (email: string) => void }) {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setInfo(''); setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? 'Error'); return; }
      setInfo(data.message);
      setStep('code');
    } catch { setError('Network error.'); }
    finally { setLoading(false); }
  }

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) { setError(data.message ?? 'Invalid code'); return; }
      onAuthenticated(email);
    } catch { setError('Network error.'); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Admin Dashboard</h1>
        <p className="text-gray-500 text-sm mb-6">Discount Club Platform</p>

        {step === 'email' ? (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com" required autoFocus className="input" />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-[#0052CC] hover:bg-[#003D99] disabled:opacity-50
                text-white font-semibold py-3 rounded-lg transition-colors text-sm">
              {loading ? 'Sending code…' : 'Send Verification Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCodeSubmit} className="space-y-4">
            {info && <p className="text-green-700 text-sm bg-green-50 rounded-lg px-3 py-2">{info}</p>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Verification Code</label>
              <input type="text" inputMode="numeric" value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456" maxLength={6} autoFocus className="input text-center text-2xl tracking-widest" />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button type="submit" disabled={loading || code.length !== 6}
              className="w-full bg-[#0052CC] hover:bg-[#003D99] disabled:opacity-50
                text-white font-semibold py-3 rounded-lg transition-colors text-sm">
              {loading ? 'Verifying…' : 'Verify & Log In'}
            </button>
            <button type="button" onClick={() => { setStep('email'); setCode(''); setError(''); }}
              className="w-full text-sm text-gray-500 hover:text-gray-700 underline">
              Use a different email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: BookingStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

function BnbStatusBadge({ status }: { status: BnbStatus }) {
  const cfg = BNB_STATUS_CONFIG[status] ?? BNB_STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

// ─── Booking Detail Panel ──────────────────────────────────────────────────────

function BookingPanel({
  booking, approvedBnbs, onClose, onSaved,
}: { booking: Booking; approvedBnbs: Bnb[]; onClose: () => void; onSaved: (b: Booking) => void }) {
  const [status, setStatus] = useState<BookingStatus>(booking.status);
  const [notes, setNotes] = useState(booking.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const domainBnbs = approvedBnbs.filter((b) => b.domain === booking.domain);
  const matchingBnb = domainBnbs.find(
    (b) => b.bnbName.trim().toLowerCase() === booking.bnbName.trim().toLowerCase()
  );

  const [bnbId, setBnbId] = useState(booking.confirmedBnbId ?? matchingBnb?._id ?? '');
  const [finalPrice, setFinalPrice] = useState(booking.confirmedPrice ?? '');
  const [checkInTime, setCheckInTime] = useState(booking.confirmedCheckInTime ?? '4 pm');
  const [checkOutTime, setCheckOutTime] = useState(booking.confirmedCheckOutTime ?? '10 am');

  const needsConfirmationFields = status === 'approved' && booking.status !== 'approved';
  const confirmationIncomplete =
    needsConfirmationFields && (!bnbId || !finalPrice.trim() || !checkInTime.trim() || !checkOutTime.trim());

  async function handleSave() {
    setSaving(true); setError('');
    try {
      const res = await fetch(`/api/admin/bookings/${booking._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status, notes,
          ...(needsConfirmationFields ? { bnbId, finalPrice, checkInTime, checkOutTime } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) { setError(data.message ?? 'Save failed'); return; }
      onSaved(data.booking as Booking);
    } catch { setError('Network error.'); }
    finally { setSaving(false); }
  }

  const row = (label: string, value?: string) => value ? (
    <div key={label} className="flex gap-2 py-1.5 border-b border-gray-50">
      <span className="text-gray-500 text-sm w-36 shrink-0">{label}</span>
      <span className="text-gray-900 text-sm break-all">{value}</span>
    </div>
  ) : null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{booking.name}</h2>
            <p className="text-sm text-gray-500">{booking.email} · {booking.domain}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl ml-4">✕</button>
        </div>

        {/* Details */}
        <div className="overflow-y-auto px-6 py-4 space-y-1">
          {row('Phone', booking.phoneNumber)}
          {row('BNB Name', booking.bnbName)}
          {row('Check-in', booking.checkInDate)}
          {row('Check-out', booking.checkOutDate)}
          {row('Vehicle', booking.vehicle)}
          {row('Price Expectation', booking.priceExpectation)}
          {row('Comments', booking.comments)}
          {row('Submitted', new Date(booking.createdAt).toLocaleString())}

          {/* Status history */}
          {booking.statusHistory.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Status History</p>
              {booking.statusHistory.map((h, i) => (
                <div key={i} className="flex gap-2 text-xs text-gray-500 py-1">
                  <span>{new Date(h.changedAt).toLocaleString()}</span>
                  <span>→</span>
                  <StatusBadge status={h.status as BookingStatus} />
                  {h.notes && <span className="text-gray-400">"{h.notes}"</span>}
                </div>
              ))}
            </div>
          )}

          {/* Confirmation snapshot, once sent */}
          {booking.confirmationSentAt && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-800 space-y-0.5">
              <p className="font-semibold">Confirmation sent {new Date(booking.confirmationSentAt).toLocaleString()}</p>
              <p>{booking.confirmedPropertyAddress} · operated by {booking.confirmedOperatorName}</p>
              <p>{booking.confirmedPrice} · check-in after {booking.confirmedCheckInTime}, check-out by {booking.confirmedCheckOutTime}</p>
            </div>
          )}

          {/* Edit section */}
          <div className="pt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as BookingStatus)}
                className="input">
                {(Object.keys(STATUS_CONFIG) as BookingStatus[]).map((s) => (
                  <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                ))}
              </select>
            </div>

            {needsConfirmationFields && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-3">
                <p className="text-xs font-semibold text-blue-900">
                  Approving sends the full booking confirmation to the guest and the BNB owner. Fill in:
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Registered BNB *</label>
                  <select value={bnbId} onChange={(e) => setBnbId(e.target.value)} className="input">
                    <option value="">Select a registered BNB…</option>
                    {domainBnbs.map((b) => (
                      <option key={b._id} value={b._id}>{b.bnbName} — {b.ownerName}</option>
                    ))}
                  </select>
                  {domainBnbs.length === 0 && (
                    <p className="text-xs text-amber-700 mt-1">
                      No approved BNBs registered for {booking.domain} yet. Approve one in the BNB Registry tab first.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Final Price *</label>
                  <input type="text" value={finalPrice} onChange={(e) => setFinalPrice(e.target.value)}
                    placeholder="$700" className="input" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Check-in time *</label>
                    <input type="text" value={checkInTime} onChange={(e) => setCheckInTime(e.target.value)}
                      placeholder="4 pm" className="input" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Check-out time *</label>
                    <input type="text" value={checkOutTime} onChange={(e) => setCheckOutTime(e.target.value)}
                      placeholder="10 am" className="input" />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                rows={3} placeholder="Add notes here…"
                className="input resize-none" />
            </div>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex gap-3">
          <button onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg hover:bg-gray-50 text-sm">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || confirmationIncomplete}
            className="flex-1 bg-[#0052CC] hover:bg-[#003D99] disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm">
            {saving ? 'Saving…' : needsConfirmationFields ? 'Approve & Send Confirmation' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── BNB Registry Table ────────────────────────────────────────────────────────

function BnbTable({ bnbs, loading, onChanged }: { bnbs: Bnb[]; loading: boolean; onChanged: () => void }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function setStatus(id: string, status: BnbStatus) {
    setBusyId(id); setError('');
    try {
      const res = await fetch(`/api/admin/bnbs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) { setError(data.message ?? 'Update failed'); return; }
      onChanged();
    } catch { setError('Network error.'); }
    finally { setBusyId(null); }
  }

  async function handleDelete(id: string, bnbName: string) {
    if (!window.confirm(`Delete "${bnbName}"? This cannot be undone.`)) return;
    setBusyId(id); setError('');
    try {
      const res = await fetch(`/api/admin/bnbs/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) { setError(data.message ?? 'Delete failed'); return; }
      onChanged();
    } catch { setError('Network error.'); }
    finally { setBusyId(null); }
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div className="bg-white rounded-xl border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">Loading…</div>
        ) : bnbs.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-gray-400">No BNB registrations found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Owner', 'BNB Name', 'Address', 'Email', 'Domain', 'Verified', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bnbs.map((b) => (
                  <tr key={b._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{b.ownerName}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[160px] truncate">{b.bnbName}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">{b.address}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate">{b.email}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{b.domain}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs">
                      {b.verified ? (
                        <span className="text-green-700">✓ Verified</span>
                      ) : (
                        <span className="text-gray-400">Unverified</span>
                      )}
                    </td>
                    <td className="px-4 py-3"><BnbStatusBadge status={b.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 flex-wrap">
                        <button onClick={() => setStatus(b._id, 'approved')} disabled={busyId === b._id || b.status === 'approved'}
                          className="text-green-700 hover:underline text-xs font-medium disabled:opacity-40 disabled:no-underline">
                          Approve
                        </button>
                        <button onClick={() => setStatus(b._id, 'pending')} disabled={busyId === b._id || b.status === 'pending'}
                          className="text-yellow-700 hover:underline text-xs font-medium disabled:opacity-40 disabled:no-underline">
                          Pending
                        </button>
                        <button onClick={() => handleDelete(b._id, b.bnbName)} disabled={busyId === b._id}
                          className="text-red-600 hover:underline text-xs font-medium disabled:opacity-40">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────

function Dashboard({ adminEmail }: { adminEmail: string }) {
  const [tab, setTab] = useState<'bookings' | 'bnbs'>('bookings');

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, approved: 0, contacted: 0 });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDomain, setFilterDomain] = useState('');
  const [search, setSearch] = useState('');

  const [bnbs, setBnbs] = useState<Bnb[]>([]);
  const [bnbsLoading, setBnbsLoading] = useState(true);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      if (filterDomain) params.set('domain', filterDomain);
      if (search) params.set('search', search);

      const res = await fetch(`/api/admin/bookings?${params}`);
      const data = await res.json();
      if (data.success) {
        setBookings(data.bookings);
        setStats({ total: data.total, pending: data.pending, approved: data.approved, contacted: data.contacted });
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [filterStatus, filterDomain, search]);

  const fetchBnbs = useCallback(async () => {
    setBnbsLoading(true);
    try {
      const res = await fetch('/api/admin/bnbs');
      const data = await res.json();
      if (data.success) setBnbs(data.bnbs);
    } catch { /* silent */ }
    finally { setBnbsLoading(false); }
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);
  useEffect(() => { fetchBnbs(); }, [fetchBnbs]);

  const approvedBnbs = bnbs.filter((b) => b.status === 'approved');

  function handleLogout() {
    fetch('/api/admin/session', { method: 'DELETE' }).then(() => window.location.reload());
  }

  function handleSaved(updated: Booking) {
    setBookings((prev) => prev.map((b) => (b._id === updated._id ? updated : b)));
    setSelected(updated);
    // Refresh stats
    fetchBookings();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-xs text-gray-400">Discount Club Platform</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500 hidden sm:block">{adminEmail}</span>
          <button onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-700 underline">Sign out</button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-white border rounded-xl p-1 w-fit">
          {([
            { key: 'bookings', label: 'Bookings' },
            { key: 'bnbs',     label: 'BNB Registry' },
          ] as const).map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === key ? 'bg-[#0052CC] text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'bookings' ? (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Total Bookings', value: stats.total, color: 'text-gray-900' },
                { label: 'Pending',        value: stats.pending,   color: 'text-yellow-700' },
                { label: 'Approved',       value: stats.approved,  color: 'text-green-700'  },
                { label: 'Contacted',      value: stats.contacted, color: 'text-blue-700'   },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white rounded-xl border p-5">
                  <p className="text-sm text-gray-500">{label}</p>
                  <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border p-4 flex flex-wrap gap-3">
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email…"
                className="input flex-1 min-w-48" />
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                className="input w-auto">
                <option value="">All statuses</option>
                {(Object.keys(STATUS_CONFIG) as BookingStatus[]).map((s) => (
                  <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                ))}
              </select>
              <select value={filterDomain} onChange={(e) => setFilterDomain(e.target.value)}
                className="input w-auto">
                <option value="">All domains</option>
                <option value="discountbnbclub.com">discountbnbclub.com</option>
                <option value="homestayclub.ca">homestayclub.ca</option>
              </select>
              <button onClick={() => { setSearch(''); setFilterStatus(''); setFilterDomain(''); }}
                className="text-sm text-gray-500 hover:text-gray-700 underline px-2">
                Clear
              </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-16 text-gray-400">Loading…</div>
              ) : bookings.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-gray-400">No bookings found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        {['Name', 'Email', 'Domain', 'BNB', 'Check-in', 'Check-out', 'Status', ''].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {bookings.map((b) => (
                        <tr key={b._id} className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => setSelected(b)}>
                          <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{b.name}</td>
                          <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate">{b.email}</td>
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{b.domain}</td>
                          <td className="px-4 py-3 text-gray-600 max-w-[140px] truncate">{b.bnbName}</td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{b.checkInDate}</td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{b.checkOutDate}</td>
                          <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                          <td className="px-4 py-3 text-right">
                            <button className="text-[#0052CC] hover:underline text-xs font-medium">Edit</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          <BnbTable bnbs={bnbs} loading={bnbsLoading} onChanged={fetchBnbs} />
        )}
      </div>

      {selected && (
        <BookingPanel
          booking={selected}
          approvedBnbs={approvedBnbs}
          onClose={() => setSelected(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

// ─── Page root ─────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch('/api/admin/session')
      .then((r) => r.json())
      .then((d) => { if (d.authenticated) setAdminEmail(d.email); })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-[#0052CC] rounded-full animate-spin" />
      </div>
    );
  }

  if (!adminEmail) return <LoginScreen onAuthenticated={setAdminEmail} />;
  return <Dashboard adminEmail={adminEmail} />;
}
