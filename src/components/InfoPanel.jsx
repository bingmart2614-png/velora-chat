import React, { useState, useRef } from 'react';
import { X, Camera, Edit2, UserPlus, Trash2, Plus, ShieldAlert, Car, Map, Settings, MoreHorizontal, Upload } from 'lucide-react';
import './InfoPanel.css';

const InfoPanel = ({ chat, topic, isTopic, onClose, onUpdate, onDelete, globalUsers }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(isTopic ? (topic?.name || '') : (chat?.name || ''));
  const [editAvatarUrl, setEditAvatarUrl] = useState(isTopic ? (topic?.avatarUrl || '') : (chat?.avatarUrl || ''));
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedMemberMenu, setSelectedMemberMenu] = useState(null); // id of member
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const isFamilyGroup = chat?.id === 101;
  const members = chat?.members || [];
  
  // Check if I am an admin. In family group, my role is inside the object
  const myMemberInfo = isFamilyGroup ? members.find(m => m.id === 'me') : null;
  const isAdmin = isFamilyGroup ? (myMemberInfo?.role === 'admin') : (chat.adminId === 'me');

  const availableUsersToAdd = (globalUsers || []).filter(u => !members.find(m => (isFamilyGroup ? m.id === u.id : m === u.id)));

  const handleSave = () => {
    onUpdate({ name: editName, avatarUrl: editAvatarUrl });
    setIsEditing(false);
  };

  const handleUploadImage = async (e) => {
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
        setEditAvatarUrl(data.url);
      }
    } catch (err) {
      console.error('Error uploading image:', err);
      alert('Gagal mengunggah gambar.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddMember = (userId) => {
    if (isAdmin && !isTopic) {
      if (isFamilyGroup) {
        const user = globalUsers.find(u => u.id === userId);
        onUpdate({ members: [...members, { id: userId, name: user.name, role: 'member' }] });
      } else {
        const user = globalUsers.find(u => u.id === userId);
        onUpdate({ members: [...members, { id: userId, name: user?.name, role: 'member' }] });
      }
      setShowAddMember(false);
    }
  };

  const handleRemoveMember = (userId) => {
    if (isAdmin && !isTopic && userId !== 'me') {
      if (isFamilyGroup) {
        onUpdate({ members: members.filter(m => m.id !== userId) });
      } else {
        onUpdate({ members: members.filter(m => (m.id || m) !== userId) });
      }
      setSelectedMemberMenu(null);
    }
  };

  const handlePromoteAdmin = (userId) => {
    if (isAdmin && isFamilyGroup && userId !== 'me') {
      const updatedMembers = members.map(m => m.id === userId ? { ...m, role: 'admin' } : m);
      onUpdate({ members: updatedMembers });
      setSelectedMemberMenu(null);
      alert('Berhasil menaikkan status menjadi Admin!');
    }
  };

  const currentAvatar = isTopic ? topic?.avatarUrl : chat?.avatarUrl;
  const currentName = isTopic ? topic?.name : chat?.name;
  const initial = currentName ? String(currentName).charAt(0) : '?';

  return (
    <div className="info-panel animate-slide-up">
      <div className="info-header">
        <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        <h3 className="font-semibold text-lg">Info {isTopic ? 'Topik' : (isFamilyGroup ? 'Keluarga' : 'Grup')}</h3>
        <div style={{ width: 36 }}></div>
      </div>

      <div className="info-content">
        <div className="profile-section">
          <div className="profile-image-large">
            <div style={{width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', backgroundColor: 'var(--accent-secondary)'}}>
              {currentAvatar ? (
                <img src={currentAvatar} alt="Profile" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
              ) : (
                <div className="profile-placeholder">{initial}</div>
              )}
            </div>
            {isAdmin && !isEditing && (
              <button className="edit-img-btn" onClick={() => setIsEditing(true)}>
                <Camera size={16} />
              </button>
            )}
          </div>
          
          {isEditing ? (
            <div className="edit-form">
              <input type="text" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Nama..." className="edit-input" />
              <div className="flex gap-2">
                <input type="text" value={editAvatarUrl} onChange={e => setEditAvatarUrl(e.target.value)} placeholder="URL Gambar (opsional)..." className="edit-input flex-1" />
                <button 
                  className="bg-accent text-white p-2 rounded-lg flex items-center justify-center cursor-pointer hover:bg-opacity-80 transition disabled:opacity-50"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  title="Pilih dari Galeri"
                >
                  <Upload size={16} />
                </button>
              </div>
              <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleUploadImage} />
              
              <div className="edit-actions">
                <button className="btn-cancel text-sm" onClick={() => setIsEditing(false)}>Batal</button>
                <button className="btn-primary text-sm" onClick={handleSave}>Simpan</button>
              </div>
            </div>
          ) : (
            <div className="profile-name-display">
              <h2 className="text-xl font-bold">{currentName}</h2>
              {isAdmin && (
                <button className="icon-btn-small" onClick={() => setIsEditing(true)}>
                  <Edit2 size={14} />
                </button>
              )}
            </div>
          )}
          
          <p className="text-secondary text-sm" style={{marginTop: '4px'}}>
            {isTopic ? `Bagian dari ${chat.name}` : `${members.length} anggota`}
          </p>
        </div>

        {/* Life360 Style Driving Reports Section */}
        {isFamilyGroup && !isTopic && (
          <div className="driving-report-section mt-4 mb-4">
            <h4 className="section-title text-sm font-semibold text-secondary px-4 mb-2">Laporan Mengemudi</h4>
            <div className="driving-card mx-4 bg-secondary border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Car size={20} className="text-accent" />
                  <span className="font-bold">Minggu Ini</span>
                </div>
                <button className="text-xs text-accent">Lihat Detail</button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted">Kecepatan Tertinggi</p>
                  <p className="text-lg font-bold text-white">85 <span className="text-xs">km/j</span></p>
                </div>
                <div>
                  <p className="text-xs text-muted">Rem Mendadak</p>
                  <p className="text-lg font-bold text-green-500">0 <span className="text-xs">kali</span></p>
                </div>
                <div>
                  <p className="text-xs text-muted">Penggunaan HP</p>
                  <p className="text-lg font-bold text-yellow-500">2 <span className="text-xs">kali</span></p>
                </div>
                <div>
                  <p className="text-xs text-muted">Total Jarak</p>
                  <p className="text-lg font-bold text-white">124 <span className="text-xs">km</span></p>
                </div>
              </div>
            </div>
          </div>
        )}

        <hr className="divider" />

        {/* Family Circle / Members Section */}
        {chat.type === 'groups' && !isTopic && (
          <div className="members-section">
            <div className="section-header">
              <h4 className="text-sm font-semibold text-secondary">{isFamilyGroup ? 'Lingkaran Keluarga' : 'Anggota Grup'}</h4>
              {isAdmin && (
                <button className="add-member-btn" onClick={() => setShowAddMember(!showAddMember)}>
                  <UserPlus size={16} /> Tambah
                </button>
              )}
            </div>

            {showAddMember && isAdmin && (
              <div className="add-member-dropdown">
                {availableUsersToAdd.length === 0 ? (
                  <p className="text-xs text-muted p-2">Semua pengguna yang tersedia sudah di grup.</p>
                ) : (
                  availableUsersToAdd.map(user => (
                    <div key={user.id} className="add-member-item" onClick={() => handleAddMember(user.id)}>
                      <div className="avatar-small">{user.avatar}</div>
                      <div className="flex-1">
                        <p className="text-sm">{user.name}</p>
                      </div>
                      <Plus size={16} className="text-accent" />
                    </div>
                  ))
                )}
              </div>
            )}

            <div className="members-list relative">
              {members.map(memberObj => {
                const memberId = memberObj.id || memberObj; // fallback to string if it somehow is a string
                const memberRole = memberObj.role || (memberId === chat.adminId ? 'admin' : 'member');
                const memberName = memberObj.name || ((globalUsers || []).find(u => String(u.id) === String(memberId))?.name || memberId);
                const isGroupAdmin = memberRole === 'admin';
                const avatarChar = memberName ? String(memberName).charAt(0).toUpperCase() : '?';
                
                return (
                  <div key={memberId} className="member-item cursor-pointer hover:bg-gray-800" onClick={() => {
                    if (isAdmin && memberId !== 'me') {
                      setSelectedMemberMenu(selectedMemberMenu === memberId ? null : memberId);
                    }
                  }}>
                    <div className="avatar-small">{avatarChar}</div>
                    <div className="member-info flex-1">
                      <p className="text-sm font-medium">{memberName} {memberId === 'me' && '(Anda)'}</p>
                      <p className="text-xs text-muted">{isGroupAdmin ? 'Admin Keluarga' : 'Anggota'}</p>
                    </div>
                    {isGroupAdmin && <span className="admin-badge mr-2">Admin</span>}
                    
                    {isAdmin && memberId !== 'me' && (
                      <MoreHorizontal size={16} className="text-muted" />
                    )}

                    {/* Admin Actions Dropdown */}
                    {selectedMemberMenu === memberId && (
                      <div className="member-actions-popup animate-fade-in">
                        {!isGroupAdmin && (
                          <button onClick={(e) => { e.stopPropagation(); handlePromoteAdmin(memberId); }}>
                            <ShieldAlert size={14} /> Jadikan Admin
                          </button>
                        )}
                        <button className="text-red-400" onClick={(e) => { e.stopPropagation(); handleRemoveMember(memberId); }}>
                          <Trash2 size={14} /> Keluarkan dari Lingkaran
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-8 mb-4 px-4">
          <button 
            className="w-full flex items-center justify-center gap-2 p-3 rounded-lg font-semibold"
            style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', cursor: 'pointer' }}
            onClick={() => {
              if (window.confirm(`Apakah Anda yakin ingin menghapus obrolan ${isTopic ? 'topik' : 'ini'} secara permanen?`)) {
                if (onDelete) {
                  onDelete(isTopic ? topic?.id : chat?.id);
                }
              }
            }}
          >
            <Trash2 size={18} />
            Hapus Obrolan
          </button>
        </div>
      </div>
    </div>
  );
};

export default InfoPanel;
