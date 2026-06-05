import React from 'react';
import { Shield, Users, Clock, ArrowLeft, Download } from 'lucide-react';
import './AdminDashboard.css';

const AdminDashboard = ({ onClose, attendances = [] }) => {
  const totalEmployees = new Set(attendances.map(a => a.name)).size || 1; // Assuming 1 admin is always there
  const todayClockIns = attendances.filter(a => a.date === new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) && a.type === 'in').length;

  return (
    <div className="admin-dashboard animate-fade-in">
      <div className="admin-header">
        <div className="admin-title">
          <button className="icon-btn" onClick={onClose}>
            <ArrowLeft size={24} />
          </button>
          <Shield size={24} color="#f59e0b" />
          <h2>Dashboard Admin</h2>
        </div>
      </div>

      <div className="admin-content">
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Karyawan Aktif</h3>
            <div className="stat-value">{totalEmployees}</div>
            <div className="stat-label">Pengguna Terdaftar</div>
          </div>
          <div className="stat-card">
            <h3>Kehadiran Hari Ini</h3>
            <div className="stat-value">{todayClockIns}</div>
            <div className="stat-label">Orang Clock In</div>
          </div>
          <div className="stat-card">
            <h3>Pesan Terkirim</h3>
            <div className="stat-value">0</div>
            <div className="stat-label">Bulan Ini</div>
          </div>
        </div>

        <div className="admin-table-container">
          <div className="admin-table-header">
            <h3>Log Kehadiran (Real-time)</h3>
            <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Download size={16} /> Export CSV
            </button>
          </div>
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nama Karyawan</th>
                  <th>Tanggal</th>
                  <th>Waktu</th>
                  <th>Status</th>
                  <th>Lokasi</th>
                </tr>
              </thead>
              <tbody>
                {attendances.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '32px' }}>Belum ada data kehadiran</td>
                  </tr>
                ) : (
                  attendances.map((att, i) => (
                    <tr key={i}>
                      <td>{att.name || 'Karyawan'}</td>
                      <td>{att.date}</td>
                      <td>{att.time}</td>
                      <td>
                        <span className={`badge ${att.type === 'in' ? 'badge-success' : 'badge-danger'}`}>
                          {att.type === 'in' ? 'Clock In' : 'Clock Out'}
                        </span>
                      </td>
                      <td>{att.location}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
