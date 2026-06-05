import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Key, Lock, MessageSquare, Bell, Database, Globe, UserPlus, HelpCircle, MonitorSmartphone, Star, ChevronRight, CheckCircle, AlertTriangle, X, Copy, DownloadCloud, PieChart, Camera, Edit2 } from 'lucide-react';
import './SettingsView.css';

const SettingsView = ({ onClose, theme, onThemeChange, currentUserName, currentUserId, onAvatarChange, settings = {}, socket }) => {
  const [activeTab, setActiveTab] = useState('account');
  const [activeModal, setActiveModal] = useState(null); // 'email', 'phone', 'delete', 'pin', 'backup', 'invite', 'status'
  
  // Profile States
  const [profileAvatar, setProfileAvatar] = useState(settings[currentUserId]?.profileAvatar || localStorage.getItem(`avatar_${currentUserId}`) || null);
  const [profileStatus, setProfileStatus] = useState(settings[currentUserId]?.status || localStorage.getItem(`status_${currentUserId}`) || 'Sedang sibuk coding 🚀');
  const [profileName, setProfileName] = useState(currentUserName || '');
  const [profileNameInput, setProfileNameInput] = useState(currentUserName || '');
  const fileInputRef = useRef(null);
  const profileFileRef = useRef(null);
  const [profileSaving, setProfileSaving] = useState(false);
  
  // Modal states
  const [emailInput, setEmailInput] = useState('');
  const [phoneOld, setPhoneOld] = useState('');
  const [phoneNew, setPhoneNew] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [appLockEnabled, setAppLockEnabled] = useState(false);
  const [appLanguage, setAppLanguage] = useState(settings[currentUserId]?.appLanguage || localStorage.getItem('appLanguage') || 'Bahasa Indonesia (Default Perangkat)');
  const [statusInput, setStatusInput] = useState(profileStatus);

  const [isUploading, setIsUploading] = useState(false);

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';
      const response = await fetch(`${serverUrl}/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.url) {
        setProfileAvatar(data.url);
        localStorage.setItem(`avatar_${currentUserId}`, data.url);
        if (socket) {
          socket.emit('save_settings', { userId: currentUserId, updates: { profileAvatar: data.url } });
        }
        if (onAvatarChange) onAvatarChange(data.url);
        alert('Foto profil berhasil diperbarui!');
      }
    } catch (err) {
      console.error('Error uploading avatar:', err);
      alert('Gagal mengunggah foto profil.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    // Save name
    if (profileNameInput.trim()) {
      setProfileName(profileNameInput.trim());
      localStorage.setItem('currentUserName', profileNameInput.trim());
      if (socket) {
        socket.emit('save_settings', { userId: currentUserId, updates: { displayName: profileNameInput.trim() } });
      }
    }
    // Save status
    setProfileStatus(statusInput);
    localStorage.setItem(`status_${currentUserId}`, statusInput);
    if (socket) {
      socket.emit('save_settings', { userId: currentUserId, updates: { status: statusInput } });
    }
    setTimeout(() => {
      setProfileSaving(false);
      alert('Profil berhasil diperbarui!');
    }, 500);
  };

  const handleStatusChange = () => {
    setProfileStatus(statusInput);
    localStorage.setItem(`status_${currentUserId}`, statusInput);
    if (socket) {
      socket.emit('save_settings', { userId: currentUserId, updates: { status: statusInput } });
    }
    closeModal();
    alert('Status berhasil diperbarui!');
  };
  
  const handleLanguageChange = (lang) => {
    setAppLanguage(lang);
    localStorage.setItem('appLanguage', lang);
    if (socket) {
      socket.emit('save_settings', { userId: currentUserId, updates: { appLanguage: lang } });
    }
  };
  
  // Formats
  const currentEmail = 'user@velora.chat';

  // Handle Backup Animation
  useEffect(() => {
    let interval;
    if (activeModal === 'backup') {
      setBackupProgress(0);
      interval = setInterval(() => {
        setBackupProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => setActiveModal(null), 1000);
            return 100;
          }
          return prev + 5;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [activeModal]);

  const openModal = (modalName) => setActiveModal(modalName);
  const closeModal = () => setActiveModal(null);

  const renderProfileTab = () => (
    <div className="settings-content-body animate-fade-in">
      <h2>Profil Saya</h2>
      <div className="settings-card">
        {/* Avatar Section */}
        <div className="flex flex-col items-center py-6 gap-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div
            className="relative group cursor-pointer"
            style={{ width: '100px', height: '100px', borderRadius: '50%', overflow: 'hidden', backgroundColor: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', color: 'white' }}
            onClick={() => profileFileRef.current.click()}
            title="Klik untuk ganti foto profil"
          >
            {profileAvatar
              ? <img src={profileAvatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : (profileName ? profileName.charAt(0).toUpperCase() : 'U')}
            <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera size={24} className="text-white" />
              <span className="text-white text-xs mt-1">{isUploading ? 'Uploading...' : 'Ubah Foto'}</span>
            </div>
          </div>
          <input type="file" accept="image/*" ref={profileFileRef} style={{ display: 'none' }} onChange={handleAvatarChange} />
          <p className="text-secondary text-sm">Klik foto untuk menggantinya</p>
        </div>

        {/* Name */}
        <div className="p-6" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <label className="block text-sm text-secondary mb-2 font-bold">Nama Tampilan</label>
          <input
            type="text"
            className="settings-input w-full"
            value={profileNameInput}
            onChange={(e) => setProfileNameInput(e.target.value)}
            maxLength={40}
            placeholder="Masukkan nama Anda..."
          />
          <p className="text-xs text-secondary mt-2">Nama ini akan tampil di obrolan dan profil Anda.</p>
        </div>

        {/* Status */}
        <div className="p-6">
          <label className="block text-sm text-secondary mb-2 font-bold">Status / Bio</label>
          <input
            type="text"
            className="settings-input w-full"
            value={statusInput}
            onChange={(e) => setStatusInput(e.target.value)}
            maxLength={50}
            placeholder="Tulis status Anda..."
          />
          <p className="text-xs text-right text-secondary mt-2">{statusInput.length}/50 karakter</p>
        </div>
      </div>

      <div className="flex justify-end mt-4">
        <button
          className="btn-success px-8"
          onClick={handleSaveProfile}
          disabled={profileSaving}
        >
          {profileSaving ? 'Menyimpan...' : '✓ Simpan Perubahan'}
        </button>
      </div>
    </div>
  );

  const GenericModal = ({ title, children, onSubmit, submitText = 'Simpan', submitClass = 'btn-primary' }) => (
    <div className="modal-overlay animate-fade-in" style={{zIndex: 300}}>
      <div className="modal-content animate-slide-up" style={{maxWidth: '400px'}}>
        <div className="modal-header">
          <h2 className="text-xl font-bold">{title}</h2>
          <button className="icon-btn" onClick={closeModal}><X size={24} /></button>
        </div>
        <div className="modal-body" style={{padding: '24px'}}>
          {children}
        </div>
        <div className="modal-actions" style={{justifyContent: 'flex-end', gap: '12px'}}>
          <button className="btn-cancel" onClick={closeModal}>Batal</button>
          {onSubmit && <button className={submitClass} onClick={onSubmit}>{submitText}</button>}
        </div>
      </div>
    </div>
  );

  const renderModals = () => {
    switch(activeModal) {
      case 'email':
        return (
          <GenericModal title="Ubah Alamat Email" onSubmit={() => { alert('Email diperbarui ke: ' + emailInput); closeModal(); }}>
            <p className="text-sm text-secondary mb-4">Email saat ini: {currentEmail}</p>
            <input type="email" placeholder="Masukkan email baru" className="settings-input" value={emailInput} onChange={e => setEmailInput(e.target.value)} />
          </GenericModal>
        );
      case 'phone':
        return (
          <GenericModal title="Ganti Nomor Telepon" onSubmit={() => { alert('Nomor berhasil diganti!'); closeModal(); }}>
            <p className="text-sm text-secondary mb-4">Pastikan nomor baru Anda dapat menerima SMS.</p>
            <input type="text" placeholder="Nomor Lama" className="settings-input mb-3" value={phoneOld} onChange={e => setPhoneOld(e.target.value)} />
            <input type="text" placeholder="Nomor Baru" className="settings-input" value={phoneNew} onChange={e => setPhoneNew(e.target.value)} />
          </GenericModal>
        );
      case 'delete':
        return (
          <GenericModal title="Hapus Akun Permanen" submitText="Hapus Permanen" submitClass="btn-danger" onSubmit={() => { if(deleteConfirm) alert('Akun dihapus.'); closeModal(); }}>
            <div className="flex items-center gap-3 mb-4 text-danger">
              <AlertTriangle size={32} />
              <p className="text-sm">Tindakan ini tidak dapat dibatalkan. Semua data Anda akan lenyap.</p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={deleteConfirm} onChange={e => setDeleteConfirm(e.target.checked)} />
              <span className="text-sm">Saya mengerti dan ingin menghapus akun.</span>
            </label>
          </GenericModal>
        );
      case 'pin':
        return (
          <GenericModal title="Atur PIN Kunci Aplikasi" onSubmit={() => { setAppLockEnabled(true); alert('PIN berhasil diatur'); closeModal(); }}>
            <p className="text-sm text-secondary mb-4">Masukkan 6 digit PIN untuk mengunci Velora Chat.</p>
            <input type="password" placeholder="• • • • • •" className="settings-input text-center text-xl tracking-widest" maxLength="6" />
          </GenericModal>
        );
      case 'backup':
        return (
          <div className="modal-overlay animate-fade-in" style={{zIndex: 300}}>
            <div className="modal-content animate-slide-up" style={{maxWidth: '350px', padding: '32px', textAlign: 'center'}}>
              <DownloadCloud size={48} className="text-accent mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Mencadangkan Chat</h2>
              <p className="text-sm text-secondary mb-6">Mengunggah ke Google Drive...</p>
              <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{width: `${backupProgress}%`}}></div>
              </div>
              <p className="text-xs font-bold mt-2">{backupProgress}% Selesai</p>
            </div>
          </div>
        );
      case 'invite':
        return (
          <GenericModal title="Undang Teman" submitText="Salin Tautan" onSubmit={() => { alert('Tautan disalin!'); closeModal(); }}>
            <div className="invite-link-box">
              https://velora.chat/invite/xyz123
              <Copy size={16} />
            </div>
            <p className="text-xs text-secondary mt-2 text-center">Bagikan tautan ini ke teman Anda</p>
          </GenericModal>
        );
      case 'status':
        return (
          <GenericModal title="Update Status" submitText="Simpan" onSubmit={handleStatusChange}>
            <p className="text-sm text-secondary mb-4">Tambahkan status atau info bio untuk profil Anda.</p>
            <input type="text" className="settings-input" value={statusInput} onChange={e => setStatusInput(e.target.value)} maxLength="50" autoFocus />
            <p className="text-xs text-right text-secondary mt-2">{statusInput.length}/50 karakter</p>
          </GenericModal>
        );
      case 'passkey':
        return (
          <GenericModal title="Kunci Sandi (Passkeys)" submitText="Buat Passkey" onSubmit={() => { alert('Passkey berhasil dibuat dan disimpan di perangkat Anda!'); closeModal(); }}>
            <div className="flex flex-col items-center mb-4 text-center">
              <Key size={48} className="text-accent mb-4" />
              <p className="text-sm text-secondary">Passkey memungkinkan Anda login menggunakan sidik jari, wajah, atau kunci layar perangkat Anda dengan aman tanpa perlu mengingat kata sandi.</p>
            </div>
          </GenericModal>
        );
      case 'requestInfo':
        return (
          <GenericModal title="Minta Info Akun" submitText="Minta Laporan" onSubmit={() => { alert('Permintaan dikirim. Laporan akan siap dalam 3 hari kerja.'); closeModal(); }}>
            <div className="flex flex-col items-center mb-4 text-center">
              <Database size={48} className="text-accent mb-4" />
              <p className="text-sm text-secondary">Buat laporan mengenai informasi dan pengaturan akun Anda. Laporan tidak mencakup pesan atau media.</p>
            </div>
          </GenericModal>
        );
      default: return null;
    }
  };

  const renderAccountTab = () => (
    <div className="settings-content-body animate-fade-in">
      <h2>Akun</h2>
      <div className="settings-card">
        <div className="settings-list-item cursor-pointer" onClick={() => openModal('passkey')}>
          <div className="item-text">
            <h4>Kunci Sandi (Passkeys)</h4>
            <p>Kelola kunci sandi untuk login aman tanpa kata sandi</p>
          </div>
          <ChevronRight size={20} className="text-muted" />
        </div>
        <div className="settings-list-item" onClick={() => openModal('email')}>
          <div className="item-text">
            <h4>Alamat Email</h4>
            <p>{currentEmail}</p>
          </div>
          <button className="btn-secondary">Ubah</button>
        </div>
        <div className="settings-list-item cursor-pointer" onClick={() => openModal('phone')}>
          <div className="item-text">
            <h4>Ganti Nomor Telepon</h4>
            <p>Pindahkan info akun, grup, & setelan Anda</p>
          </div>
          <ChevronRight size={20} className="text-muted" />
        </div>
        <div className="settings-list-item cursor-pointer" onClick={() => openModal('requestInfo')}>
          <div className="item-text">
            <h4>Minta Info Akun</h4>
            <p>Buat laporan informasi & pengaturan akun Anda</p>
          </div>
          <ChevronRight size={20} className="text-muted" />
        </div>
        <div className="settings-list-item cursor-pointer text-danger" onClick={() => openModal('delete')}>
          <div className="item-text">
            <h4>Hapus Akun Permanen</h4>
            <p>Hapus akun dan semua riwayat pesan secara permanen</p>
          </div>
          <ChevronRight size={20} />
        </div>
      </div>
    </div>
  );

  const renderPrivacyTab = () => (
    <div className="settings-content-body animate-fade-in">
      <h2>Privasi</h2>
      <div className="settings-card">
        <h3 className="section-title">Siapa yang bisa melihat info pribadi saya</h3>
        
        {['Terakhir Dilihat & Online', 'Foto Profil', 'Tentang Saya', 'Status Saya'].map(title => (
          <div className="settings-list-item" key={title}>
            <div className="item-text"><h4>{title}</h4></div>
            <select className="settings-select">
              <option>Semua Orang</option>
              <option>Kontak Saya</option>
              <option>Kecuali...</option>
              <option>Tidak Ada</option>
            </select>
          </div>
        ))}

        <div className="settings-list-item">
          <div className="item-text">
            <h4>Laporan Baca</h4>
            <p>Jika dimatikan, Anda tidak bisa melihat laporan baca orang lain.</p>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" defaultChecked />
            <span className="slider"></span>
          </label>
        </div>
      </div>

      <div className="settings-card mt-4">
        <h3 className="section-title">Keamanan</h3>
        <div className="settings-list-item">
          <div className="item-text">
            <h4>Kunci Aplikasi</h4>
            <p>Minta Pola, PIN, atau Sidik Jari untuk membuka Velora</p>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" checked={appLockEnabled} onChange={(e) => {
              if (e.target.checked) openModal('pin');
              else setAppLockEnabled(false);
            }} />
            <span className="slider"></span>
          </label>
        </div>
        <div className="settings-list-item cursor-default">
          <div className="item-text">
            <h4>Kunci Obrolan (Chat Lock)</h4>
            <p>Pindahkan obrolan ke folder terkunci khusus</p>
          </div>
          <span className="text-xs bg-tertiary px-2 py-1 rounded">Akan Datang</span>
        </div>
      </div>
    </div>
  );

  const renderChatTab = () => (
    <div className="settings-content-body animate-fade-in">
      <h2>Chat</h2>
      <div className="settings-card">
        <h3 className="section-title">Tampilan</h3>
        <div className="settings-list-item">
          <div className="item-text">
            <h4>Tema</h4>
            <p>Ubah warna keseluruhan aplikasi</p>
          </div>
          <select className="settings-select" value={theme} onChange={(e) => {
            const newTheme = e.target.value;
            onThemeChange(newTheme);
            if (socket) {
              socket.emit('save_settings', { userId: currentUserId, updates: { theme: newTheme } });
            }
          }}>
            <option value="dark">Gelap (Dark Mode)</option>
            <option value="light">Terang (Light Mode)</option>
          </select>
        </div>
      </div>

      <div className="settings-card mt-4">
        <h3 className="section-title">Pengaturan Chat</h3>
        <div className="settings-list-item">
          <div className="item-text">
            <h4>Enter untuk mengirim</h4>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" defaultChecked />
            <span className="slider"></span>
          </label>
        </div>
        <div className="settings-list-item">
          <div className="item-text">
            <h4>Visibilitas Media</h4>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" defaultChecked />
            <span className="slider"></span>
          </label>
        </div>
      </div>

      <div className="settings-card mt-4">
        <h3 className="section-title">Riwayat</h3>
        <div className="settings-list-item cursor-pointer" onClick={() => openModal('backup')}>
          <div className="item-text">
            <h4>Cadangkan Chat</h4>
            <p>Cadangkan riwayat ke Google Drive</p>
          </div>
          <DownloadCloud size={20} className="text-muted" />
        </div>
      </div>
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="settings-content-body animate-fade-in">
      <h2>Notifikasi</h2>
      <div className="settings-card">
        <div className="settings-list-item">
          <div className="item-text"><h4>Nada Dering Pesan</h4></div>
          <select className="settings-select">
            <option>Default (Ting)</option>
            <option>Kaca Pecah</option>
            <option>Puitis</option>
          </select>
        </div>
        <div className="settings-list-item">
          <div className="item-text"><h4>Getar</h4></div>
          <select className="settings-select">
            <option>Default</option>
            <option>Pendek</option>
            <option>Panjang</option>
          </select>
        </div>
        <div className="settings-list-item">
          <div className="item-text">
            <h4>Gunakan Notifikasi Prioritas</h4>
            <p>Tampilkan pratinjau pesan di bagian atas layar</p>
          </div>
          <label className="toggle-switch"><input type="checkbox" defaultChecked /><span className="slider"></span></label>
        </div>
      </div>
    </div>
  );

  const renderStorageTab = () => (
    <div className="settings-content-body animate-fade-in">
      <h2>Penyimpanan dan Data</h2>
      
      <div className="storage-chart-container mb-6 mt-4">
        <div className="storage-bar">
          <div className="storage-segment media" style={{width: '60%'}}></div>
          <div className="storage-segment docs" style={{width: '15%'}}></div>
          <div className="storage-segment other" style={{width: '10%'}}></div>
          <div className="storage-segment free" style={{width: '15%'}}></div>
        </div>
        <div className="storage-legend mt-4 flex gap-4 text-sm justify-center flex-wrap">
          <div className="flex items-center gap-2"><span className="legend-dot" style={{background: '#00D26A'}}></span>Media (2.4 GB)</div>
          <div className="flex items-center gap-2"><span className="legend-dot" style={{background: '#3390EC'}}></span>Dokumen (600 MB)</div>
          <div className="flex items-center gap-2"><span className="legend-dot" style={{background: '#F59E0B'}}></span>Lainnya (400 MB)</div>
          <div className="flex items-center gap-2"><span className="legend-dot" style={{background: '#31313A'}}></span>Kosong (600 MB)</div>
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-list-item cursor-default">
          <div className="item-text">
            <h4>Kelola Penyimpanan</h4>
            <p>2.4 GB digunakan</p>
          </div>
          <span className="text-xs bg-tertiary px-2 py-1 rounded">Akan Datang</span>
        </div>
        <div className="settings-list-item">
          <div className="item-text">
            <h4>Kurangi Penggunaan Data Panggilan</h4>
          </div>
          <label className="toggle-switch"><input type="checkbox" /><span className="slider"></span></label>
        </div>
      </div>
    </div>
  );

  const renderLanguageTab = () => (
    <div className="settings-content-body animate-fade-in">
      <h2>Bahasa Aplikasi</h2>
      <div className="settings-card">
        {['Bahasa Indonesia (Default Perangkat)', 'English', 'Jawa', 'Sunda', 'Español'].map(lang => (
          <div className="settings-list-item cursor-pointer" key={lang} onClick={() => handleLanguageChange(lang)}>
            <div className="item-text"><h4>{lang}</h4></div>
            {lang === appLanguage && <CheckCircle size={20} className="text-accent" />}
          </div>
        ))}
      </div>
    </div>
  );

  const renderHelpTab = () => (
    <div className="settings-content-body animate-fade-in text-center pt-10">
      <div className="avatar-huge mx-auto mb-4 bg-accent" style={{width: '80px', height: '80px', borderRadius: '24px'}}>
        <MessageSquare size={40} color="white" />
      </div>
      <h2 className="text-2xl font-bold">Velora Chat</h2>
      <p className="text-secondary mb-8">Versi 1.0.0 (Build 2026)</p>
      
      <div className="settings-card text-left">
        <div className="settings-list-item cursor-pointer" onClick={() => {}}>
          <div className="item-text"><h4>Pusat Bantuan</h4></div>
          <ChevronRight size={20} className="text-muted" />
        </div>
        <div className="settings-list-item cursor-pointer" onClick={() => {}}>
          <div className="item-text"><h4>Hubungi Kami</h4><p>Pertanyaan? Butuh bantuan?</p></div>
          <ChevronRight size={20} className="text-muted" />
        </div>
        <div className="settings-list-item cursor-pointer">
          <div className="item-text"><h4>Syarat dan Kebijakan Privasi</h4></div>
          <ChevronRight size={20} className="text-muted" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="settings-overlay animate-fade-in">
      {renderModals()}
      <div className="settings-container">
        {/* Left Sidebar */}
        <div className="settings-sidebar">
          <div className="settings-header">
            <button className="icon-btn" onClick={onClose}><ArrowLeft size={24} /></button>
            <h2 className="text-xl font-bold ml-4">Pengaturan</h2>
          </div>
          
          <div className="settings-menu-list">
            <div className="user-profile-header relative group">
              <div 
                className="avatar-huge cursor-pointer relative overflow-hidden" 
                style={{width: '64px', height: '64px', borderRadius: '50%', fontSize: '1.5rem', backgroundColor: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'}}
                onClick={() => fileInputRef.current.click()}
                title="Ganti Foto Profil"
              >
                {profileAvatar ? <img src={profileAvatar} alt="Profile" style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%'}} /> : (currentUserName ? currentUserName.charAt(0).toUpperCase() : 'V')}
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {isUploading ? <span className="text-white text-xs">Uploading...</span> : <Camera size={24} className="text-white" />}
                </div>
              </div>
              <input type="file" accept="image/*" ref={fileInputRef} style={{display: 'none'}} onChange={handleAvatarChange} />
              
              <div className="user-info-brief flex-1">
                <h3 className="font-bold text-lg" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                  {currentUserName || 'Anda'}
                </h3>
                <div className="flex items-center gap-2 cursor-pointer group-status" onClick={() => openModal('status')} title="Edit Status">
                  <p className="text-sm text-secondary">{profileStatus}</p>
                  <Edit2 size={12} className="text-secondary opacity-0 group-hover:opacity-100" />
                </div>
              </div>
            </div>

            <div className="divider" style={{margin: '8px 16px', height: '1px', backgroundColor: 'var(--border-color)'}}></div>

            <button className={`settings-tab-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}><Camera size={20} /> Profil Saya</button>
            <button className={`settings-tab-btn ${activeTab === 'account' ? 'active' : ''}`} onClick={() => setActiveTab('account')}><Key size={20} /> Akun</button>
            <button className={`settings-tab-btn ${activeTab === 'privacy' ? 'active' : ''}`} onClick={() => setActiveTab('privacy')}><Lock size={20} /> Privasi</button>
            <button className={`settings-tab-btn ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}><MessageSquare size={20} /> Chat</button>
            <button className={`settings-tab-btn ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => setActiveTab('notifications')}><Bell size={20} /> Notifikasi</button>
            <button className={`settings-tab-btn ${activeTab === 'storage' ? 'active' : ''}`} onClick={() => setActiveTab('storage')}><Database size={20} /> Penyimpanan dan Data</button>
            <button className={`settings-tab-btn ${activeTab === 'language' ? 'active' : ''}`} onClick={() => setActiveTab('language')}><Globe size={20} /> Bahasa Aplikasi</button>
            <button className={`settings-tab-btn ${activeTab === 'invite' ? 'active' : ''}`} onClick={() => openModal('invite')}><UserPlus size={20} /> Undang Teman</button>
            <button className={`settings-tab-btn ${activeTab === 'help' ? 'active' : ''}`} onClick={() => setActiveTab('help')}><HelpCircle size={20} /> Pembaruan & Bantuan</button>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="settings-content">
          {activeTab === 'profile' && renderProfileTab()}
          {activeTab === 'account' && renderAccountTab()}
          {activeTab === 'privacy' && renderPrivacyTab()}
          {activeTab === 'chat' && renderChatTab()}
          {activeTab === 'notifications' && renderNotificationsTab()}
          {activeTab === 'storage' && renderStorageTab()}
          {activeTab === 'language' && renderLanguageTab()}
          {activeTab === 'help' && renderHelpTab()}
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
