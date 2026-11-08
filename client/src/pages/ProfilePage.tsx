// ProfilePage — passenger profile management
// Railway Reservation System v3.0 — Team 11, CSE 2271
// DISCLAIMER: Academic demonstration only. No real accounts or data.

import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api';

export function ProfilePage() {
  const { user, token, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  const [curPwd, setCurPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdMsg, setPwdMsg] = useState('');
  const [pwdErr, setPwdErr] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  const [savedPassengers, setSavedPassengers] = useState<
    Array<{ id: number; passenger_name: string; age: number; gender: string; berth_preference: string }>
  >([]);
  const [spLoading, setSpLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    setSpLoading(true);
    apiClient
      .getSavedPassengers(token)
      .then((res) => setSavedPassengers(res.passengers))
      .catch(() => {
        /* silent — not critical */
      })
      .finally(() => setSpLoading(false));
  }, [token, navigate]);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setProfileMsg('');
    setProfileErr('');
    setProfileLoading(true);
    try {
      const res = await apiClient.updateProfile(token!, { full_name: fullName, phone });
      updateUser({ ...res.user, unread_notifications: user?.unread_notifications });
      setProfileMsg('Profile updated successfully!');
    } catch (err) {
      setProfileErr(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setProfileLoading(false);
    }
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    setPwdMsg('');
    setPwdErr('');
    setPwdLoading(true);
    try {
      await apiClient.changePassword(token!, {
        current_password: curPwd,
        new_password: newPwd,
        confirm_new_password: confirmPwd,
      });
      setPwdMsg('Password changed successfully!');
      setCurPwd('');
      setNewPwd('');
      setConfirmPwd('');
    } catch (err) {
      setPwdErr(err instanceof Error ? err.message : 'Password change failed');
    } finally {
      setPwdLoading(false);
    }
  }

  async function removeSavedPassenger(id: number) {
    if (!token) return;
    try {
      await apiClient.deleteSavedPassenger(token, id);
      setSavedPassengers((ps) => ps.filter((p) => p.id !== id));
    } catch {
      /* silent */
    }
  }

  if (!token) return null; // redirect handled by useEffect

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Header bar */}
      <div
        style={{
          background: '#fff',
          borderBottom: '1px solid #e2e8f0',
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>
          Profile Settings
        </h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn btn-ghost"
            style={{ fontSize: '0.83rem' }}
          >
            ← Dashboard
          </button>
          <button
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="btn btn-ghost"
            style={{ color: '#ef4444', fontSize: '0.83rem' }}
          >
            Sign Out
          </button>
        </div>
      </div>

      <div
        style={{
          maxWidth: '720px',
          margin: '2rem auto',
          padding: '0 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
        }}
      >
        {/* Profile Form */}
        <div
          className="card"
          style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff' }}
        >
          <h2 style={{ margin: '0 0 0.25rem', fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>
            Personal Information
          </h2>
          <p style={{ margin: '0 0 1rem', fontSize: '0.82rem', color: '#64748b' }}>
            Email:{' '}
            <strong style={{ color: '#1e293b' }}>{user?.email}</strong> (cannot be changed)
          </p>
          <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 500, color: '#374151', marginBottom: '0.4rem' }}>
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="input"
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 500, color: '#374151', marginBottom: '0.4rem' }}>
                Mobile Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="input"
                style={{ width: '100%' }}
              />
            </div>
            {profileMsg && (
              <div style={{ color: '#16a34a', fontSize: '0.85rem', fontWeight: 500 }}>{profileMsg}</div>
            )}
            {profileErr && (
              <div style={{ color: '#dc2626', fontSize: '0.85rem' }}>{profileErr}</div>
            )}
            <div>
              <button
                type="submit"
                disabled={profileLoading}
                className="btn btn-primary"
                style={{ fontSize: '0.85rem' }}
              >
                {profileLoading ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Password Change */}
        <div
          className="card"
          style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff' }}
        >
          <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>
            Change Password
          </h2>
          <form onSubmit={changePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { label: 'Current Password', val: curPwd, set: setCurPwd, auto: 'current-password' },
              { label: 'New Password', val: newPwd, set: setNewPwd, auto: 'new-password' },
              { label: 'Confirm New Password', val: confirmPwd, set: setConfirmPwd, auto: 'new-password' },
            ].map((f) => (
              <div key={f.label}>
                <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 500, color: '#374151', marginBottom: '0.4rem' }}>
                  {f.label}
                </label>
                <input
                  type="password"
                  value={f.val}
                  onChange={(e) => f.set(e.target.value)}
                  required
                  autoComplete={f.auto}
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>
            ))}
            {pwdMsg && (
              <div style={{ color: '#16a34a', fontSize: '0.85rem', fontWeight: 500 }}>{pwdMsg}</div>
            )}
            {pwdErr && (
              <div style={{ color: '#dc2626', fontSize: '0.85rem' }}>{pwdErr}</div>
            )}
            <div>
              <button
                type="submit"
                disabled={pwdLoading}
                className="btn btn-primary"
                style={{ fontSize: '0.85rem', background: '#1e293b' }}
              >
                {pwdLoading ? 'Changing…' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>

        {/* Saved Passengers */}
        <div
          className="card"
          style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff' }}
        >
          <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>
            Saved Passengers
          </h2>
          {spLoading ? (
            <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Loading…</p>
          ) : savedPassengers.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
              No saved passengers yet. Passengers from future bookings can be saved here for quick re-use.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {savedPassengers.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#1e293b' }}>
                      {p.passenger_name}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', marginLeft: '0.75rem' }}>
                      Age {p.age} · {p.gender} · {p.berth_preference}
                    </span>
                  </div>
                  <button
                    onClick={() => removeSavedPassenger(p.id)}
                    className="btn btn-ghost"
                    style={{ color: '#ef4444', fontSize: '0.78rem', padding: '0.25rem 0.6rem' }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

