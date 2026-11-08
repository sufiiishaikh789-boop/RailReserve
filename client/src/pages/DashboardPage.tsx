// DashboardPage — passenger account dashboard
// Railway Reservation System v3.0 — Team 11, CSE 2271
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api';
import type { ETicket } from '../types';

interface DashboardData {
  summary: { total_bookings: number; upcoming: number; completed: number; cancelled: number };
  upcoming_journeys: ETicket[];
  recent_bookings: ETicket[];
  notifications: Array<{ id: number; type: string; title: string; message: string; booking_id: number | null; is_read: number; created_at: string }>;
  unread_notifications: number;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    CONFIRMED: 'bg-green-100 text-green-800',
    WAITING_LIST: 'bg-yellow-100 text-yellow-800',
    CANCELLED: 'bg-red-100 text-red-800',
    PENDING_PAYMENT: 'bg-blue-100 text-blue-800',
    FAILED: 'bg-gray-100 text-gray-700',
    HOLD_EXPIRED: 'bg-gray-100 text-gray-500',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export function DashboardPage() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'overview' | 'bookings' | 'notifications'>('overview');

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    apiClient.getDashboard(token)
      .then(res => setData(res))
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, [token, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={() => navigate('/')} className="text-blue-600 hover:underline">Go Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">My Dashboard</h1>
            <p className="text-sm text-gray-500">Welcome, {user?.full_name}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/')}
              className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100"
            >
              🚂 Book Train
            </button>
            <button
              onClick={() => navigate('/profile')}
              className="text-sm text-blue-600 hover:text-blue-800 px-3 py-2 rounded-lg hover:bg-blue-50"
            >
              ⚙ Profile
            </button>
            <button
              onClick={() => { logout(); navigate('/'); }}
              className="text-sm text-red-600 hover:text-red-800 px-3 py-2 rounded-lg hover:bg-red-50"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Summary Cards */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Bookings', value: data.summary.total_bookings, color: 'blue' },
              { label: 'Upcoming', value: data.summary.upcoming, color: 'green' },
              { label: 'Completed', value: data.summary.completed, color: 'gray' },
              { label: 'Cancelled', value: data.summary.cancelled, color: 'red' },
            ].map(card => (
              <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <div className={`text-3xl font-bold text-${card.color}-600`}>{card.value}</div>
                <div className="text-xs text-gray-500 mt-1">{card.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
          {(['overview', 'bookings', 'notifications'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${tab === t ? 'bg-white shadow text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}
            >
              {t === 'notifications' && data && data.unread_notifications > 0
                ? `Notifications (${data.unread_notifications})`
                : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === 'overview' && data && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-800">Upcoming Journeys</h2>
            {data.upcoming_journeys.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
                <p className="text-lg mb-2">No upcoming journeys</p>
                <button onClick={() => navigate('/')} className="text-blue-600 hover:underline text-sm">
                  Search and book a train
                </button>
              </div>
            ) : (
              data.upcoming_journeys.map(b => (
                <div key={b.pnr_number} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="font-semibold text-gray-900">{b.train_name}</span>
                      <span className="text-gray-500 text-sm ml-2">{b.train_number}</span>
                    </div>
                    <StatusBadge status={b.booking_status} />
                  </div>
                  <div className="mt-2 text-sm text-gray-700">
                    {b.source_station} → {b.dest_station}
                    <span className="ml-3 text-gray-500">{b.journey_date}</span>
                  </div>
                  <div className="mt-2 flex gap-3 text-xs text-gray-500">
                    <span>PNR: <span className="font-mono font-semibold text-gray-800">{b.pnr_number}</span></span>
                    <span>Passengers: {b.total_passengers}</span>
                    <span>Fare: ₹{b.fare_breakdown?.total_fare?.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'bookings' && data && (
          <div className="space-y-3">
            <h2 className="font-semibold text-gray-800">All Bookings</h2>
            {data.recent_bookings.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
                No bookings yet.
              </div>
            ) : (
              data.recent_bookings.map(b => (
                <div key={b.pnr_number} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="font-semibold text-gray-900">{b.train_name}</span>
                      <span className="font-mono text-xs ml-3 text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        PNR: {b.pnr_number}
                      </span>
                    </div>
                    <StatusBadge status={b.booking_status} />
                  </div>
                  <div className="mt-2 text-sm text-gray-700">
                    {b.source_station} → {b.dest_station}
                    <span className="ml-3 text-gray-500">{b.journey_date}</span>
                    <span className="ml-3 text-gray-500">{b.class_name}</span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    ₹{b.fare_breakdown?.total_fare?.toLocaleString('en-IN')} · {b.total_passengers} passenger(s)
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'notifications' && data && (
          <div className="space-y-3">
            <h2 className="font-semibold text-gray-800">Notifications</h2>
            {data.notifications.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
                No notifications yet.
              </div>
            ) : (
              data.notifications.map(n => (
                <div key={n.id} className={`bg-white rounded-xl border p-4 ${n.is_read === 0 ? 'border-blue-200 bg-blue-50' : 'border-gray-200'}`}>
                  <div className="font-medium text-sm text-gray-900">{n.title}</div>
                  <div className="text-sm text-gray-600 mt-1">{n.message}</div>
                  <div className="text-xs text-gray-400 mt-2">{new Date(n.created_at).toLocaleString('en-IN')}</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
