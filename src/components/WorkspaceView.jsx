import React, { useState, useEffect, useRef } from 'react';
import { Camera, MapPin, LayoutDashboard, Clock, FileText, Users, Calendar, DollarSign, X, Settings, Trash2 } from 'lucide-react';
import './WorkspaceView.css';

const WorkspaceView = ({ onClose, onClockIn, requireClockIn, socket, attendances = [], employees = [], userRole = 'admin', shifts = [], payroll = [], settings = {} }) => {
  const [activeTab, setActiveTab] = useState(requireClockIn ? 'attendance' : 'dashboard');
  
  // Attendance States
  const [cameraActive, setCameraActive] = useState(false);
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [photo, setPhoto] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!socket) return;
    
    const handleBackupData = (data) => {
      const backupData = { serverData: data, localData: { ...localStorage } };
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `velora_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    socket.on('backup_data', handleBackupData);
    
    const handleResetDone = () => {
      window.location.reload();
    };
    socket.on('all_reset_done', handleResetDone);
    
    return () => {
      socket.off('backup_data', handleBackupData);
      socket.off('all_reset_done', handleResetDone);
    };
  }, [socket]);

  const handleRestore = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const backup = JSON.parse(event.target.result);
        if (backup.localData) {
          localStorage.clear();
          Object.keys(backup.localData).forEach(key => localStorage.setItem(key, backup.localData[key]));
        }
        if (backup.serverData && socket) {
          socket.emit('restore_backup', backup.serverData);
        } else {
          window.location.reload();
        }
      } catch (err) {
        alert('Berkas cadangan tidak valid!');
      }
    };
    reader.readAsText(file);
  };

  // Add Employee State
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [newEmployee, setNewEmployee] = useState({
    userId: '', name: '', phone: '', password: '', birthDate: '', religion: '', address: '', bankName: '', bankAccount: ''
  });

  // Shift Management States
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [shiftForm, setShiftForm] = useState({ name: '', start: '', end: '', tolerance: 15 });

  const handleOpenShiftModal = (shift = null) => {
    if (shift) {
      setEditingShift(shift.id);
      setShiftForm({ name: shift.name, start: shift.start, end: shift.end, tolerance: shift.tolerance });
    } else {
      setEditingShift(null);
      setShiftForm({ name: '', start: '', end: '', tolerance: 15 });
    }
    setShowShiftModal(true);
  };

  const handleSaveShift = (e) => {
    e.preventDefault();
    const newShift = { ...shiftForm };
    if (editingShift) {
      newShift.id = editingShift;
    } else {
      newShift.id = Date.now();
      newShift.count = 0;
    }
    if (socket) {
      socket.emit('save_shift', newShift);
    }
    setShowShiftModal(false);
  };

  const handleDeleteShift = (shiftId) => {
    if (window.confirm('Yakin ingin menghapus shift ini?')) {
      if (socket) {
        socket.emit('delete_shift', shiftId);
      }
    }
  };

  // Payroll Management States
  const [showPayrollModal, setShowPayrollModal] = useState(false);
  const [editingPayroll, setEditingPayroll] = useState(null);
  const [payrollForm, setPayrollForm] = useState({ employeeName: '', bank: 'BCA', accountNumber: '', jasaService: 0, deduction: 0, status: 'Belum Dibayar' });

  const handleOpenPayrollModal = (payrollItem = null) => {
    if (payrollItem) {
      setEditingPayroll(payrollItem.id);
      setPayrollForm({ employeeName: payrollItem.employeeName, bank: payrollItem.bank || 'BCA', accountNumber: payrollItem.accountNumber || '', jasaService: payrollItem.jasaService, deduction: payrollItem.deduction, status: payrollItem.status });
    } else {
      setEditingPayroll(null);
      setPayrollForm({ employeeName: '', bank: 'BCA', accountNumber: '', jasaService: 0, deduction: 0, status: 'Belum Dibayar' });
    }
    setShowPayrollModal(true);
  };

  const handleSavePayroll = (e) => {
    e.preventDefault();
    const newPayroll = { ...payrollForm };
    if (editingPayroll) {
      newPayroll.id = editingPayroll;
    } else {
      newPayroll.id = Date.now();
    }
    if (socket) {
      socket.emit('save_payroll', newPayroll);
    }
    setShowPayrollModal(false);
  };

  const handleDeletePayroll = (id) => {
    if (window.confirm('Yakin ingin menghapus data penggajian ini?')) {
      if (socket) {
        socket.emit('delete_payroll', id);
      }
    }
  };

  const currentUserName = localStorage.getItem('currentUserName') || '';
  const displayedPayroll = userRole === 'admin' ? payroll : payroll.filter(p => (p.employeeName || '').toLowerCase() === currentUserName.toLowerCase());

  const totalJasaService = displayedPayroll.reduce((acc, curr) => acc + Number(curr.jasaService || 0), 0);
  const totalPotongan = displayedPayroll.reduce((acc, curr) => acc + Number(curr.deduction || 0), 0);
  const totalBersih = displayedPayroll.reduce((acc, curr) => acc + (Number(curr.jasaService || 0) - Number(curr.deduction || 0)), 0);

  // Office Location States
  const globalOffice = settings['global_office'] || {};
  const defaultOfficeLat = globalOffice.officeLat || '-6.196920';
  const defaultOfficeLng = globalOffice.officeLng || '-106.691869';

  const [officeLatInput, setOfficeLatInput] = useState(defaultOfficeLat);
  const [officeLngInput, setOfficeLngInput] = useState(defaultOfficeLng);

  const handleSaveOfficeLocation = () => {
    if (socket) {
      socket.emit('save_settings', { userId: 'global_office', updates: { officeLat: officeLatInput, officeLng: officeLngInput } });
      alert('Titik Koordinat Kantor berhasil disimpan!');
    }
  };

  const [profileNameInput, setProfileNameInput] = useState(currentUserName);
  const [profilePasswordInput, setProfilePasswordInput] = useState('');

  const handleSaveProfile = () => {
    if (!socket) return;
    const currentUserId = localStorage.getItem('currentUserId');
    const emp = employees.find(e => e.id === currentUserId);
    if (emp) {
      const updates = { ...emp };
      if (profileNameInput) updates.name = profileNameInput;
      if (profilePasswordInput) updates.password = profilePasswordInput;
      socket.emit('edit_employee', updates);
      localStorage.setItem('currentUserName', profileNameInput);
      alert('Profil berhasil diperbarui!');
      setProfilePasswordInput('');
    } else {
      alert('Gagal memperbarui profil: Data karyawan tidak ditemukan.');
    }
  };

  const getDistanceFromLatLonInM = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2-lat1) * (Math.PI/180);
    const dLon = (lon2-lon1) * (Math.PI/180); 
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * (Math.PI/180)) * Math.cos(lat2 * (Math.PI/180)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
      ; 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const d = R * c * 1000; // Distance in m
    return d;
  };

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const startCameraAndLocation = async () => {
    setLocationLoading(true);
    setLocationError('');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocationLoading(false);
        },
        (error) => {
          setLocationError('Gagal mendapat lokasi. Pastikan izin GPS aktif.');
          setLocationLoading(false);
        }
      );
    } else {
      setLocationError('Browser tidak mendukung GPS.');
      setLocationLoading(false);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
      setCameraActive(true);
      setPhoto(null);
    } catch (err) {
      console.error("Camera error:", err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = (type) => {
    let dataUrl = null;
    if (videoRef.current && cameraActive) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      dataUrl = canvas.toDataURL('image/jpeg');
      setPhoto(dataUrl);
      stopCamera();
    }
    
    // Validasi Jarak Absensi (Maksimal 50 meter)
    if (location) {
      const dist = getDistanceFromLatLonInM(location.lat, location.lng, parseFloat(defaultOfficeLat), parseFloat(defaultOfficeLng));
      if (dist > 50) {
        alert(`Gagal Absen! Anda berada di luar jangkauan kantor.\nJarak Anda saat ini: ${Math.round(dist)} meter dari kantor.\nMaksimal jarak yang diizinkan adalah 50 meter.`);
        return; // Blokir absensi
      }
    } else {
      alert('Gagal mendapat lokasi. Pastikan GPS aktif dan tunggu hingga lokasi ditemukan sebelum absen.');
      return;
    }

    const typeLabels = {
      in: '✅ Masuk Kerja',
      out: '🚪 Pulang Kerja',
      overtime_in: '🌙 Masuk Lembur',
      overtime_out: '🌛 Keluar Lembur',
      homeservice_in: '🏠 Masuk Home Service',
      homeservice_out: '🔙 Keluar Home Service',
      sick: '🤒 Sakit',
      permit: '📄 Izin',
    };
    const label = typeLabels[type] || type;

    alert(`${label} berhasil dicatat!\nLokasi terverifikasi (${Math.round(getDistanceFromLatLonInM(location.lat, location.lng, parseFloat(defaultOfficeLat), parseFloat(defaultOfficeLng)))} meter dari kantor).`);
    
    const currentUser = localStorage.getItem('currentUserName') || 'Karyawan';
    if (socket) {
      socket.emit('clock_in', {
        type,
        label,
        name: currentUser,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
        location: location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Bypass Lokasi'
      });
    }

    if (type === 'in' && onClockIn) {
      onClockIn();
    }
  };


  const handleAddEmployee = (e) => {
    e.preventDefault();
    if (socket && newEmployee.name && newEmployee.phone && newEmployee.password) {
      if (editingEmployeeId) {
        // Mode Edit
        const updatedEmpData = {
          ...newEmployee,
          id: editingEmployeeId
        };
        socket.emit('edit_employee', updatedEmpData);
        alert('Data karyawan berhasil diperbarui!');
      } else {
        // Mode Tambah Baru
        const empData = {
          ...newEmployee,
          id: 'EMP-' + Math.floor(Math.random() * 10000),
          department: 'Staff',
          position: 'Karyawan',
          shift: 'Shift Pagi (08-17)'
        };
        socket.emit('add_employee', empData);
        alert('Karyawan berhasil ditambahkan!');
      }
      setShowAddEmployee(false);
      setEditingEmployeeId(null);
      setNewEmployee({ userId: '', name: '', phone: '', password: '', birthDate: '', religion: '', address: '' });
    } else {
      alert('Harap isi Nama, No HP, dan Password!');
    }
  };

  const handleEditClick = (emp) => {
    setNewEmployee({
      userId: emp.userId || '',
      name: emp.name || '',
      phone: emp.phone || '',
      password: emp.password || '',
      birthDate: emp.birthDate || '',
      religion: emp.religion || '',
      address: emp.address || ''
    });
    setEditingEmployeeId(emp.id);
    setShowAddEmployee(true);
  };

  const handleDeleteEmployee = (emp) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus data karyawan ${emp.name}?`)) {
      if (socket) {
        socket.emit('delete_employee', { employeeId: emp.id });
        alert('Karyawan berhasil dihapus!');
      }
    }
  };

  useEffect(() => {
    if (activeTab !== 'attendance') {
      stopCamera();
    }
  }, [activeTab]);

  return (
    <div className="workspace-container animate-fade-in" style={{ zIndex: requireClockIn ? 9999 : 100, position: requireClockIn ? 'fixed' : 'relative', inset: 0 }}>
      <div className="workspace-header">
        <div className="header-title">
          <LayoutDashboard className="text-accent mr-3" />
          <h2 className="text-xl font-bold">{requireClockIn ? "Velora HRIS - Wajib Absen" : "Workspace & HRIS"}</h2>
        </div>
        {!requireClockIn && (
          <button className="icon-btn" onClick={onClose}>
            <X size={24} />
          </button>
        )}
      </div>

      <div className="workspace-body">
        {/* Workspace Sidebar (Mini) */}
        <div className="workspace-sidebar" style={{ pointerEvents: requireClockIn ? 'none' : 'auto', opacity: requireClockIn ? 0.5 : 1 }}>
          <button 
            className={`ws-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </button>
          <button 
            className={`ws-tab ${activeTab === 'attendance' ? 'active' : ''}`}
            onClick={() => setActiveTab('attendance')}
            style={{ pointerEvents: 'auto', opacity: 1 }} // Always clickable
          >
            <Camera size={20} />
            <span>Absensi (Selfie)</span>
          </button>
          <button 
            className={`ws-tab ${activeTab === 'log' ? 'active' : ''}`}
            onClick={() => setActiveTab('log')}
          >
            <Clock size={20} />
            <span>Log Absensi</span>
          </button>
          {userRole === 'admin' && (
            <>
              <button 
                className={`ws-tab ${activeTab === 'employees' ? 'active' : ''}`}
                onClick={() => setActiveTab('employees')}
              >
                <Users size={20} />
                <span>Data Karyawan</span>
              </button>
              <button 
                className={`ws-tab ${activeTab === 'shift' ? 'active' : ''}`}
                onClick={() => setActiveTab('shift')}
              >
                <Calendar size={20} />
                <span>Pengaturan Shift</span>
              </button>
            </>
          )}

          <button 
            className={`ws-tab ${activeTab === 'payroll' ? 'active' : ''}`}
            onClick={() => setActiveTab('payroll')}
          >
            <DollarSign size={20} />
            <span>{userRole === 'admin' ? 'Payroll' : 'Slip Gaji Saya'}</span>
          </button>

          <button 
            className={`ws-tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={20} />
            <span>Pengaturan</span>
          </button>
        </div>

        {/* Workspace Content Area */}
        <div className="workspace-content">
          {activeTab === 'dashboard' && (
            <div className="ws-module dashboard-module animate-slide-up">
              <h3>Ringkasan Kehadiran Hari Ini</h3>
              <div className="dashboard-cards">
                <div className="dash-card">
                  <h4>Hadir</h4>
                  <div className="dash-value text-accent">0</div>
                </div>
                <div className="dash-card">
                  <h4>Terlambat</h4>
                  <div className="dash-value text-warning">0</div>
                </div>
                <div className="dash-card">
                  <h4>Absen / Sakit</h4>
                  <div className="dash-value text-danger">0</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="ws-module attendance-module animate-slide-up">
              <h3>Absensi Karyawan</h3>
              <div className="camera-placeholder" style={{ position: 'relative', overflow: 'hidden' }}>
                {photo ? (
                  <img src={photo} alt="Selfie Absensi" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: cameraActive ? 'block' : 'none' }} 
                  />
                )}
                
                {!cameraActive && !photo && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Camera size={48} className="text-muted mb-4" />
                    <p>Kamera akan aktif di sini untuk Selfie</p>
                    <button className="btn-primary mt-4" onClick={startCameraAndLocation}>
                      {locationLoading ? 'Memuat...' : 'Aktifkan Kamera & Lokasi'}
                    </button>
                  </div>
                )}
              </div>
              
              <div className="location-info mt-4">
                <MapPin size={16} className="mr-2" />
                <span>
                  {locationLoading ? 'Menunggu lokasi...' : 
                   locationError ? <span className="text-danger">{locationError}</span> : 
                   location ? `Lokasi: ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}` : 
                   'GPS belum aktif'}
                </span>
              </div>
              
              {photo && (
                <button
                  onClick={() => { setPhoto(null); startCameraAndLocation(); }}
                  style={{ marginTop: '8px', background: 'rgba(0,0,0,0.6)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  📷 Foto Ulang
                </button>
              )}

              <div className="location-info mt-4">
                <MapPin size={16} className="mr-2" />
                <span>
                  {locationLoading ? 'Menunggu lokasi...' : 
                   locationError ? <span className="text-danger">{locationError}</span> : 
                   location ? `✅ Lokasi: ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}` : 
                   'GPS belum aktif'}
                </span>
              </div>

              {/* Attendance Categories */}
              <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* Absen Reguler */}
                <div style={{ background: 'var(--bg-tertiary)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border-color)' }}>
                  <p style={{ fontWeight: 700, marginBottom: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>🏢 Absen Reguler</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button className="btn-success" style={{ padding: '14px', fontSize: '0.95rem', borderRadius: '10px' }} onClick={() => capturePhoto('in')}>✅ Masuk</button>
                    <button className="btn-danger" style={{ padding: '14px', fontSize: '0.95rem', borderRadius: '10px' }} onClick={() => capturePhoto('out')}>🚪 Pulang</button>
                  </div>
                </div>

                {/* Lembur */}
                <div style={{ background: 'var(--bg-tertiary)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border-color)' }}>
                  <p style={{ fontWeight: 700, marginBottom: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>🌙 Lembur</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button style={{ padding: '14px', fontSize: '0.95rem', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600 }} onClick={() => capturePhoto('overtime_in')}>🌙 Masuk Lembur</button>
                    <button style={{ padding: '14px', fontSize: '0.95rem', borderRadius: '10px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600 }} onClick={() => capturePhoto('overtime_out')}>🌛 Keluar Lembur</button>
                  </div>
                </div>

                {/* Home Service */}
                <div style={{ background: 'var(--bg-tertiary)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border-color)' }}>
                  <p style={{ fontWeight: 700, marginBottom: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>🏠 Home Service</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button style={{ padding: '14px', fontSize: '0.95rem', borderRadius: '10px', background: 'linear-gradient(135deg, #0891b2, #0e7490)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600 }} onClick={() => capturePhoto('homeservice_in')}>🏠 Masuk HS</button>
                    <button style={{ padding: '14px', fontSize: '0.95rem', borderRadius: '10px', background: 'linear-gradient(135deg, #0e7490, #155e75)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600 }} onClick={() => capturePhoto('homeservice_out')}>🔙 Keluar HS</button>
                  </div>
                </div>

                {/* Sakit & Izin */}
                <div style={{ background: 'var(--bg-tertiary)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border-color)' }}>
                  <p style={{ fontWeight: 700, marginBottom: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>📋 Sakit & Izin</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button style={{ padding: '14px', fontSize: '0.95rem', borderRadius: '10px', background: 'linear-gradient(135deg, #dc2626, #b91c1c)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600 }} onClick={() => capturePhoto('sick')}>🤒 Sakit</button>
                    <button style={{ padding: '14px', fontSize: '0.95rem', borderRadius: '10px', background: 'linear-gradient(135deg, #d97706, #b45309)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600 }} onClick={() => capturePhoto('permit')}>📄 Izin</button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {activeTab === 'log' && (
            <div className="ws-module log-module animate-slide-up">
              <div className="module-header flex justify-between items-center mb-6">
                <h3>Log Absensi Karyawan</h3>
                <div className="flex gap-2">
                  <input type="date" className="filter-input" defaultValue="2026-06-05" />
                  <button className="btn-primary">Filter</button>
                </div>
              </div>
              
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Nama Karyawan</th>
                      <th>Tanggal</th>
                      <th>Clock In</th>
                      <th>Clock Out</th>
                      <th>Status</th>
                      <th>Lokasi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendances.length === 0 ? (
                      <tr><td colSpan="6" className="text-center">Belum ada data absensi</td></tr>
                    ) : (
                      attendances.map((att, i) => (
                        <tr key={i}>
                          <td>{att.name || 'Karyawan'}</td>
                          <td>{att.date}</td>
                          <td>{att.type === 'in' ? att.time : '-'}</td>
                          <td>{att.type === 'out' ? att.time : '-'}</td>
                          <td><span className="badge badge-success">{att.type === 'in' ? 'Clock In' : 'Clock Out'}</span></td>
                          <td>{att.location}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'employees' && (
            <div className="ws-module employees-module animate-slide-up">
              <div className="module-header flex justify-between items-center mb-6">
                <h3>Direktori Data Karyawan</h3>
                <button className="btn-primary" onClick={() => {
                  setEditingEmployeeId(null);
                  setNewEmployee({ userId: '', name: '', phone: '', password: '', birthDate: '', religion: '', address: '', bankName: '', bankAccount: '' });
                  setShowAddEmployee(true);
                }}>+ Tambah Karyawan</button>
              </div>

              {showAddEmployee && (
                <div className="add-employee-form" style={{ backgroundColor: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ marginBottom: '16px' }}>{editingEmployeeId ? 'Edit Data Karyawan' : 'Form Tambah Karyawan Baru'}</h4>
                  <form onSubmit={handleAddEmployee} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <input type="text" placeholder="User ID (Contoh: EMP001) *" className="search-input" value={newEmployee.userId} onChange={e => setNewEmployee({...newEmployee, userId: e.target.value})} required />
                    <input type="text" placeholder="Nama Lengkap *" className="search-input" value={newEmployee.name} onChange={e => setNewEmployee({...newEmployee, name: e.target.value})} required />
                    <input type="text" placeholder="No Handphone (Misal: 0812...) *" className="search-input" value={newEmployee.phone} onChange={e => setNewEmployee({...newEmployee, phone: e.target.value})} required />
                    <input type="password" placeholder="Password Login *" className="search-input" value={newEmployee.password} onChange={e => setNewEmployee({...newEmployee, password: e.target.value})} required />
                    <input type="date" placeholder="Tanggal Lahir" className="search-input" value={newEmployee.birthDate} onChange={e => setNewEmployee({...newEmployee, birthDate: e.target.value})} />
                    <input type="text" placeholder="Agama" className="search-input" value={newEmployee.religion} onChange={e => setNewEmployee({...newEmployee, religion: e.target.value})} />
                    <input type="text" placeholder="Alamat Lengkap" className="search-input" value={newEmployee.address} onChange={e => setNewEmployee({...newEmployee, address: e.target.value})} />
                    <select className="search-input" value={newEmployee.bankName} onChange={e => setNewEmployee({...newEmployee, bankName: e.target.value})}>
                      <option value="">Pilih Bank / E-Wallet</option>
                      <option value="BCA">BCA</option>
                      <option value="DANA">DANA</option>
                      <option value="GoPay">GoPay</option>
                      <option value="OVO">OVO</option>
                      <option value="SeaBank">SeaBank</option>
                    </select>
                    <input type="text" placeholder="Nomor Rekening / HP" className="search-input" value={newEmployee.bankAccount} onChange={e => setNewEmployee({...newEmployee, bankAccount: e.target.value})} />
                    <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                      <button type="button" className="btn-secondary" onClick={() => setShowAddEmployee(false)}>Batal</button>
                      <button type="submit" className="btn-success">Simpan Karyawan</button>
                    </div>
                  </form>
                </div>
              )}

              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID Karyawan (User ID)</th>
                      <th>Nama & Profil</th>
                      <th>Departemen</th>
                      <th>Jabatan</th>
                      <th>No HP / Rekening</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.length === 0 ? (
                      <tr><td colSpan="6" className="text-center py-4 text-secondary">Belum ada karyawan terdaftar</td></tr>
                    ) : (
                      employees.map((emp, i) => (
                        <tr key={i}>
                          <td><span className="font-bold text-accent">{emp.userId || emp.id}</span></td>
                          <td>
                            <div className="flex items-center gap-3">
                              <div className="avatar bg-accent" style={{width: 32, height: 32, fontSize: '1rem'}}>{emp.name.charAt(0).toUpperCase()}</div>
                              <span className="font-medium">{emp.name}</span>
                            </div>
                          </td>
                          <td>{emp.department}</td>
                          <td>{emp.position}</td>
                          <td>
                            <div>{emp.phone}</div>
                            {emp.bankName && <div className="text-secondary font-medium" style={{fontSize: '0.8rem', marginTop: '4px'}}>{emp.bankName} - {emp.bankAccount}</div>}
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              <button className="text-accent hover:underline text-sm font-medium" onClick={() => handleEditClick(emp)}>Edit</button>
                              <button className="text-danger hover:underline text-sm font-medium" onClick={() => handleDeleteEmployee(emp)}>Hapus</button>
                              {emp.boundDevice && (
                                <button 
                                  className="text-warning hover:underline text-sm font-medium ml-2"
                                  onClick={() => {
                                    if(window.confirm('Yakin ingin mereset pengikatan perangkat karyawan ini? Mereka akan bisa login dari perangkat baru.')) {
                                      if(socket) socket.emit('reset_device', { employeeId: emp.id });
                                    }
                                  }}
                                >
                                  Reset HP
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'shift' && (
            <div className="ws-module shift-module animate-slide-up">
              <div className="module-header flex justify-between items-center mb-6">
                <div>
                  <h3>Pengaturan Jam Kerja & Shift</h3>
                </div>
                <button className="btn-success" onClick={() => handleOpenShiftModal()}>+ Tambah Shift</button>
              </div>

              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>NAMA SHIFT</th>
                      <th>WAKTU MASUK</th>
                      <th>WAKTU KELUAR</th>
                      <th>TOLERANSI KETERLAMBATAN</th>
                      <th>JUMLAH KARYAWAN</th>
                      <th>AKSI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shifts.length === 0 ? (
                      <tr><td colSpan="6" className="text-center py-4 text-secondary">Belum ada data shift kerja</td></tr>
                    ) : (
                      shifts.map(shift => (
                        <tr key={shift.id}>
                          <td className="font-bold text-accent">{shift.name}</td>
                          <td>{shift.start}</td>
                          <td>{shift.end}</td>
                          <td>{shift.tolerance} Menit</td>
                          <td>{shift.count} Orang</td>
                          <td>
                            <button className="btn-edit-small" onClick={() => handleOpenShiftModal(shift)}>Edit</button>
                            <button className="btn-edit-small text-danger ml-2" onClick={() => handleDeleteShift(shift.id)}>Hapus</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'payroll' && (
            <div className="ws-module payroll-module animate-slide-up">
              <div className="module-header flex justify-between items-center mb-6">
                <div>
                  <h3>Sistem Penggajian (Payroll)</h3>
                  <p className="text-sm text-secondary mt-1">Periode: 1 Mei 2026 - 31 Mei 2026</p>
                </div>
                <div className="flex gap-2">
                  {userRole === 'admin' && <button className="btn-secondary" onClick={() => handleOpenPayrollModal()}>Tambah Data</button>}
                  <button className="btn-success" onClick={() => alert('Slip gaji berhasil dibuat! (Simulasi)')}>Generate Slip Gaji</button>
                  {userRole === 'admin' && <button className="btn-primary" onClick={() => alert('Data payroll berhasil diekspor ke Excel/CSV! (Simulasi)')}>Export Data</button>}
                </div>
              </div>

              <div className="dashboard-cards mb-6" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="dash-card">
                  <h4>Total Jasa Service</h4>
                  <div className="text-xl font-bold text-white">Rp {totalJasaService.toLocaleString('id-ID')}</div>
                </div>
                <div className="dash-card">
                  <h4>Total Potongan (Absen/Telat)</h4>
                  <div className="text-xl font-bold text-danger">- Rp {totalPotongan.toLocaleString('id-ID')}</div>
                </div>
                <div className="dash-card">
                  <h4>Total Pembayaran Bersih</h4>
                  <div className="text-xl font-bold text-accent">Rp {totalBersih.toLocaleString('id-ID')}</div>
                </div>
              </div>

              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Nama Karyawan</th>
                      <th>Rekening Tujuan</th>
                      <th>Jasa Service</th>
                      <th>Potongan</th>
                      <th>Gaji Bersih (Net)</th>
                      <th>Status</th>
                      {userRole === 'admin' && <th>Aksi</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {displayedPayroll.length === 0 ? (
                      <tr>
                        <td colSpan={userRole === 'admin' ? "7" : "6"} className="text-center py-4 text-secondary">Belum ada data penggajian untuk periode ini</td>
                      </tr>
                    ) : (
                      displayedPayroll.map(item => (
                        <tr key={item.id}>
                          <td>{item.employeeName}</td>
                          <td>
                            <div className="font-bold">{item.bank || '-'}</div>
                            <div className="text-xs text-secondary">{item.accountNumber || '-'}</div>
                          </td>
                          <td>Rp {Number(item.jasaService || 0).toLocaleString('id-ID')}</td>
                          <td className="text-danger">Rp {Number(item.deduction || 0).toLocaleString('id-ID')}</td>
                          <td className="font-bold text-accent">Rp {(Number(item.jasaService || 0) - Number(item.deduction || 0)).toLocaleString('id-ID')}</td>
                          <td>
                            <span className={`px-2 py-1 rounded-full text-xs ${item.status === 'Sudah Dibayar' ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'}`}>
                              {item.status}
                            </span>
                          </td>
                          {userRole === 'admin' && (
                            <td>
                              <button className="btn-edit-small" onClick={() => handleOpenPayrollModal(item)}>Edit</button>
                              <button className="btn-edit-small text-danger ml-2" onClick={() => handleDeletePayroll(item.id)}>Hapus</button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="ws-module settings-module animate-slide-up">
              <div className="module-header mb-6">
                <h3>Pengaturan Aplikasi</h3>
                <p className="text-secondary text-sm">Kelola data sistem, cadangkan, dan pulihkan aplikasi dari sini.</p>
              </div>

              {userRole === 'admin' && (
                <div className="bg-tertiary p-6 rounded-xl border border-gray-700 mb-6">
                  <h4 className="text-lg font-bold mb-2">Titik Koordinat Lokasi Kantor</h4>
                  <p className="text-secondary text-sm mb-6">Tentukan titik pusat lokasi kantor. Karyawan hanya dapat melakukan absensi jika berada maksimal 50 meter dari titik ini.</p>
                  
                  <div className="flex gap-4 items-end">
                    <div style={{ flex: 1 }}>
                      <label className="block text-sm text-secondary mb-2">Latitude (Garis Lintang)</label>
                      <input 
                        type="text" 
                        className="settings-input w-full"
                        value={officeLatInput}
                        onChange={(e) => setOfficeLatInput(e.target.value)}
                        placeholder="-6.196920"
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label className="block text-sm text-secondary mb-2">Longitude (Garis Bujur)</label>
                      <input 
                        type="text" 
                        className="settings-input w-full"
                        value={officeLngInput}
                        onChange={(e) => setOfficeLngInput(e.target.value)}
                        placeholder="-106.691869"
                      />
                    </div>
                    <button className="btn-primary" onClick={handleSaveOfficeLocation}>Simpan Lokasi</button>
                  </div>
                </div>
              )}

              {userRole !== 'admin' && (
                <div className="bg-tertiary p-6 rounded-xl border border-gray-700 mb-6">
                  <h4 className="text-lg font-bold mb-2">Ubah Profil & Sandi Saya</h4>
                  <p className="text-secondary text-sm mb-6">Perbarui nama tampilan atau kata sandi Anda.</p>
                  
                  <div className="flex gap-4 items-end">
                    <div style={{ flex: 1 }}>
                      <label className="block text-sm text-secondary mb-2">Nama Tampilan Baru</label>
                      <input 
                        type="text" 
                        className="settings-input w-full"
                        value={profileNameInput}
                        onChange={(e) => setProfileNameInput(e.target.value)}
                        placeholder="Masukkan nama baru"
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label className="block text-sm text-secondary mb-2">Password Baru</label>
                      <input 
                        type="password" 
                        className="settings-input w-full"
                        value={profilePasswordInput}
                        onChange={(e) => setProfilePasswordInput(e.target.value)}
                        placeholder="Kosongkan jika tidak ingin mengubah"
                      />
                    </div>
                    <button className="btn-primary" onClick={handleSaveProfile}>Simpan Profil</button>
                  </div>
                </div>
              )}

              <div className="bg-tertiary p-6 rounded-xl border border-gray-700 mb-6">
                <h4 className="text-lg font-bold mb-2">Backup & Restore Data</h4>
                <p className="text-secondary text-sm mb-6">Cadangkan seluruh data karyawan, riwayat obrolan, pengaturan shift, dan log absensi ke dalam satu berkas aman. Anda dapat memulihkannya kembali kapan saja.</p>
                
                <div className="flex gap-4">
                  <button className="btn-success flex items-center gap-2" onClick={() => { if(socket) socket.emit('request_backup'); else alert('Tidak terhubung ke server'); }}>
                    <FileText size={20} />
                    Backup Data Aplikasi
                  </button>
                  <input type="file" accept=".json" style={{display: 'none'}} ref={fileInputRef} onChange={handleRestore} />
                  <button className="btn-primary flex items-center gap-2" onClick={() => fileInputRef.current.click()}>
                    <Clock size={20} />
                    Restore Data
                  </button>
                </div>
              </div>

              <div className="bg-tertiary p-6 rounded-xl border border-red-900 mb-6" style={{ backgroundColor: 'rgba(239, 68, 68, 0.05)' }}>
                <h4 className="text-lg font-bold mb-2 text-danger">Reset Data Aplikasi</h4>
                <p className="text-secondary text-sm mb-6">Peringatan: Tindakan ini akan menghapus semua data! Riwayat obrolan, data karyawan, absensi, dan pengaturan akan dihapus secara permanen dan aplikasi akan kembali ke kondisi awal (kosong).</p>
                
                <button 
                  className="btn-danger flex items-center gap-2 font-bold" 
                  onClick={() => {
                    if(window.confirm('PERINGATAN KRITIS!\n\nApakah Anda benar-benar yakin ingin mereset seluruh aplikasi?\nSemua obrolan dan data karyawan akan HILANG SELAMANYA!')) {
                      localStorage.clear();
                      if (socket) {
                        socket.emit('reset_all');
                      } else {
                        window.location.reload();
                      }
                    }
                  }}
                >
                  <Trash2 size={20} />
                  Reset Seluruh Aplikasi
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Shift Modal */}
      {showShiftModal && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="bg-tertiary p-6 rounded-2xl w-96 animate-slide-up border border-gray-700">
            <h3 className="text-xl font-bold mb-4">{editingShift ? 'Edit Shift' : 'Tambah Shift Baru'}</h3>
            <form onSubmit={handleSaveShift}>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2 text-secondary">Nama Shift</label>
                <input 
                  type="text" 
                  value={shiftForm.name}
                  onChange={e => setShiftForm({...shiftForm, name: e.target.value})}
                  className="w-full bg-secondary border border-gray-600 text-white rounded-lg p-2 outline-none"
                  required
                />
              </div>
              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <label className="block text-sm font-semibold mb-2 text-secondary">Waktu Masuk</label>
                  <input 
                    type="time" 
                    value={shiftForm.start}
                    onChange={e => setShiftForm({...shiftForm, start: e.target.value})}
                    className="w-full bg-secondary border border-gray-600 text-white rounded-lg p-2 outline-none"
                    required
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-semibold mb-2 text-secondary">Waktu Keluar</label>
                  <input 
                    type="time" 
                    value={shiftForm.end}
                    onChange={e => setShiftForm({...shiftForm, end: e.target.value})}
                    className="w-full bg-secondary border border-gray-600 text-white rounded-lg p-2 outline-none"
                    required
                  />
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2 text-secondary">Toleransi Keterlambatan (Menit)</label>
                <input 
                  type="number" 
                  value={shiftForm.tolerance}
                  onChange={e => setShiftForm({...shiftForm, tolerance: e.target.value})}
                  className="w-full bg-secondary border border-gray-600 text-white rounded-lg p-2 outline-none"
                  min="0"
                  required
                />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowShiftModal(false)} className="px-4 py-2 rounded-lg bg-secondary text-white border border-gray-600">Batal</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-accent text-white font-bold">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Input Payroll */}
      {showPayrollModal && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-content animate-slide-up" style={{ width: '400px' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{editingPayroll ? 'Edit Data Penggajian' : 'Tambah Data Penggajian'}</h3>
              <button className="icon-btn" onClick={() => setShowPayrollModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSavePayroll}>
              <div className="mb-4">
                <label className="block text-sm text-secondary mb-2">Nama Karyawan</label>
                <select 
                  required 
                  className="settings-select w-full"
                  value={payrollForm.employeeName}
                  onChange={(e) => {
                    const empName = e.target.value;
                    const emp = employees.find(emp => emp.name === empName);
                    if (emp) {
                      setPayrollForm({...payrollForm, employeeName: empName, bank: emp.bankName || '', accountNumber: emp.bankAccount || ''});
                    } else {
                      setPayrollForm({...payrollForm, employeeName: empName});
                    }
                  }}
                >
                  <option value="">Pilih Karyawan...</option>
                  {employees.map((emp, idx) => (
                    <option key={idx} value={emp.name}>{emp.name}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm text-secondary mb-2">Metode Pembayaran (Bank / E-Wallet)</label>
                <select 
                  className="settings-select w-full"
                  value={payrollForm.bank}
                  onChange={(e) => setPayrollForm({...payrollForm, bank: e.target.value})}
                >
                  <option value="BCA">BCA</option>
                  <option value="DANA">DANA</option>
                  <option value="GoPay">GoPay</option>
                  <option value="OVO">OVO</option>
                  <option value="SeaBank">SeaBank</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm text-secondary mb-2">Nomor Rekening / HP</label>
                <input 
                  type="text" 
                  required 
                  className="settings-input w-full"
                  value={payrollForm.accountNumber}
                  onChange={(e) => setPayrollForm({...payrollForm, accountNumber: e.target.value})}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm text-secondary mb-2">Jasa Service (Rp)</label>
                <input 
                  type="number" 
                  required 
                  className="settings-input w-full"
                  value={payrollForm.jasaService}
                  onChange={(e) => setPayrollForm({...payrollForm, jasaService: e.target.value})}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm text-secondary mb-2">Potongan (Rp)</label>
                <input 
                  type="number" 
                  required 
                  className="settings-input w-full"
                  value={payrollForm.deduction}
                  onChange={(e) => setPayrollForm({...payrollForm, deduction: e.target.value})}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm text-secondary mb-2">Status Pembayaran</label>
                <select 
                  className="settings-select w-full"
                  value={payrollForm.status}
                  onChange={(e) => setPayrollForm({...payrollForm, status: e.target.value})}
                >
                  <option value="Belum Dibayar">Belum Dibayar</option>
                  <option value="Sudah Dibayar">Sudah Dibayar</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" className="btn-cancel" onClick={() => setShowPayrollModal(false)}>Batal</button>
                <button type="submit" className="btn-primary">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default WorkspaceView;
