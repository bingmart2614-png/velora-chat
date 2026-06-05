import React, { useState } from 'react';
import { Search, MoreVertical, Users, UserPlus, Megaphone, Hash, Plus, ChevronDown, ChevronRight, User } from 'lucide-react';
import './Sidebar.css';

const Sidebar = ({ chats, activeChatId, activeTopicId, onSelectChat, onSelectTopic, onAddGroupClick, onCreateTopic, onStartNewChat, globalUsers, onOpenSettings, onOpenStarred, onOpenLinkedDevices, onOpenWorkspace, onLogout, userRole, onOpenAdmin, currentUserName, currentUserAvatar }) => {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMainMenu, setShowMainMenu] = useState(false);
  
  // State for expanding/collapsing groups
  const [expandedGroups, setExpandedGroups] = useState({});
  const [newTopicInputs, setNewTopicInputs] = useState({}); // { chatId: 'topic name' }

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const handleTopicSubmit = (chatId) => {
    if (newTopicInputs[chatId]) {
      onCreateTopic(chatId, newTopicInputs[chatId]);
      setNewTopicInputs(prev => ({ ...prev, [chatId]: '' }));
    }
  };

  const filteredChats = chats.filter(chat => {
    const matchesSearch = chat.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = 
      activeTab === 'all' || 
      (activeTab === 'personal' && chat.type === 'personal') ||
      (activeTab === 'groups' && chat.type === 'groups') ||
      (activeTab === 'channels' && chat.type === 'channels');
      
    return matchesSearch && matchesTab;
  });

  // Global search logic
  const globalSearchResults = searchQuery.trim() !== '' 
    ? globalUsers.filter(u => {
        if (u.id === 'me') return false; // don't search yourself
        const q = searchQuery.toLowerCase();
        return u.name.toLowerCase().includes(q) ||
               u.phone.includes(q) ||
               (u.userId && u.userId.toLowerCase().includes(q)) ||
               (u.nickname && u.nickname.toLowerCase().includes(q));
      })
    : [];

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="user-profile">
          <div className="avatar bg-accent" style={{ overflow: 'hidden' }}>
            {currentUserAvatar ? <img src={currentUserAvatar} alt="Profile" style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : (currentUserName ? currentUserName.charAt(0).toUpperCase() : 'V')}
          </div>
          <h2 className="font-bold text-lg" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
            {currentUserName || 'Velora Chat'}
          </h2>
        </div>
        <div className="header-actions relative">
          <button className="icon-btn" onClick={onAddGroupClick} title="Buat Grup Baru">
            <Plus size={20} />
          </button>
          <button className="icon-btn" onClick={() => setShowMainMenu(!showMainMenu)}>
            <MoreVertical size={20} />
          </button>
          
          {/* Main Menu Dropdown */}
          {showMainMenu && (
            <div className="attachment-menu animate-slide-up" style={{ 
              top: '40px', bottom: 'auto', left: 'auto', right: '0', 
              backgroundColor: 'var(--bg-secondary)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '8px', 
              width: '200px', 
              padding: '8px 0',
              flexDirection: 'column',
              gap: '0'
            }}>
              <button className="dropdown-item" onClick={() => { setShowMainMenu(false); onOpenStarred(); }}>Pesan Berbintang</button>
              <button className="dropdown-item" onClick={() => { setShowMainMenu(false); onOpenLinkedDevices(); }}>Perangkat Bertaut</button>
              <button className="dropdown-item" onClick={() => { setShowMainMenu(false); onOpenSettings(); }}>Pengaturan</button>
              <div style={{borderTop: '1px solid var(--border-color)', margin: '4px 0'}}></div>
              {userRole !== 'admin' && (
                <>
                  <div style={{borderTop: '1px solid var(--border-color)', margin: '4px 0'}}></div>
                  <button className="dropdown-item" style={{color: '#f87171'}} onClick={() => { setShowMainMenu(false); onLogout(); }}>Keluar (Logout)</button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {userRole === 'admin' && (
        <div style={{ display: 'flex', gap: '8px', padding: '0 16px 12px 16px', borderBottom: '1px solid var(--border-color)' }}>
          <button 
            onClick={onOpenWorkspace} 
            style={{ flex: 1, backgroundColor: 'var(--bg-tertiary)', color: 'var(--accent-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '8px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}>
            Workspace HRIS
          </button>
          <button 
            onClick={onOpenAdmin} 
            style={{ flex: 1, backgroundColor: '#f59e0b', color: '#000', border: 'none', borderRadius: '6px', padding: '8px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}>
            Dasbor Admin
          </button>
          <button 
            onClick={onLogout} 
            style={{ flex: 0.5, backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}>
            Keluar
          </button>
        </div>
      )}

      <div className="search-container">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Cari pesan atau kontak..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="folder-tabs">
        <button className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>Semua</button>
        <button className={`tab-btn ${activeTab === 'personal' ? 'active' : ''}`} onClick={() => setActiveTab('personal')}>Pribadi</button>
        <button className={`tab-btn ${activeTab === 'groups' ? 'active' : ''}`} onClick={() => setActiveTab('groups')}>Grup</button>
      </div>

      <div className="chat-list">
        {/* Global Search Results Section */}
        {searchQuery.trim() !== '' && globalSearchResults.length > 0 && (
          <div className="global-search-section">
            <h4 className="text-xs font-semibold text-secondary px-4 py-2 uppercase tracking-wider">Hasil Pencarian Global</h4>
            {globalSearchResults.map(user => (
              <div 
                key={`global_${user.id}`} 
                className="chat-item animate-fade-in"
                onClick={() => {
                  onStartNewChat(user);
                  setSearchQuery('');
                }}
              >
                <div className="avatar bg-accent">{user.avatar}</div>
                <div className="chat-details">
                  <div className="chat-item-header">
                    <h4 className="font-medium truncate">{user.name}</h4>
                  </div>
                  <div className="chat-item-bottom">
                    <p className="last-message text-xs text-secondary truncate">
                      {user.userId} • {user.phone}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            <div className="divider" style={{margin: '8px 16px', height: '1px', backgroundColor: 'var(--border-color)'}}></div>
            <h4 className="text-xs font-semibold text-secondary px-4 py-2 uppercase tracking-wider">Obrolan Tersimpan</h4>
          </div>
        )}

        {filteredChats.map((chat) => {
          const isGroup = chat.type === 'groups';
          let lastMessageText = '';
          let lastMessageTime = '';
          
          if (!isGroup) {
            const lastMsg = chat.messages?.[chat.messages.length - 1];
            lastMessageText = lastMsg?.text || 'Belum ada pesan';
            lastMessageTime = lastMsg?.time || '';
          } else {
            lastMessageText = `${chat.topics?.length || 0} Topik Tersedia`;
          }

          const isExpanded = expandedGroups[chat.id];

          return (
            <div key={chat.id} className="chat-group-container animate-fade-in">
              <div 
                className={`chat-item ${activeChatId === chat.id && !isGroup ? 'active' : ''}`}
                onClick={() => {
                  onSelectChat(chat.id, isGroup);
                  if (isGroup) toggleGroup(chat.id);
                }}
                style={{ backgroundColor: activeChatId === chat.id && !isGroup ? 'var(--bg-tertiary)' : '' }}
              >
                <div className="avatar">
                  {isGroup ? <Users size={20} /> : chat.name.charAt(0)}
                </div>
                <div className="chat-details">
                  <div className="chat-item-header">
                    <h4 className="font-medium truncate">{chat.name}</h4>
                    <span className="chat-time text-xs text-muted">{lastMessageTime}</span>
                  </div>
                  <div className="chat-item-bottom">
                    <p className="last-message text-sm text-secondary truncate">{lastMessageText}</p>
                    {isGroup && (
                      <span className="text-muted">
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Topics Dropdown for Groups */}
              {isGroup && isExpanded && (
                <div className="topics-list">
                  {chat.topics?.map(topic => (
                    <div 
                      key={topic.id} 
                      className={`topic-item ${activeTopicId === topic.id ? 'active' : ''}`}
                      onClick={() => onSelectTopic(chat.id, topic.id)}
                    >
                      <Hash size={16} className="topic-icon" />
                      <span className="truncate">{topic.name}</span>
                    </div>
                  ))}
                  
                  {/* Add New Topic Input */}
                  <div className="topic-input-container">
                    <Plus size={14} className="text-muted" />
                    <input 
                      type="text" 
                      placeholder="Tambah Topik..."
                      value={newTopicInputs[chat.id] || ''}
                      onChange={(e) => setNewTopicInputs({...newTopicInputs, [chat.id]: e.target.value})}
                      onKeyDown={(e) => e.key === 'Enter' && handleTopicSubmit(chat.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Sidebar;
