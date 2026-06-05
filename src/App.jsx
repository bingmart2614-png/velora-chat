import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import InfoPanel from './components/InfoPanel';
import CallRoom from './components/CallRoom';
import SettingsView from './components/SettingsView';
import LoginScreen from './components/LoginScreen';
import StarredMessagesView from './components/StarredMessagesView';
import LinkedDevicesView from './components/LinkedDevicesView';
import FamilyMapView from './components/FamilyMapView';
import WorkspaceView from './components/WorkspaceView';
import AdminDashboard from './components/AdminDashboard';
import './index.css';

export const GLOBAL_USERS = [
  { id: 'u1', userId: '@budis', nickname: 'BudiS', name: 'Budi Santoso', phone: '+62 812-3456-7890', avatar: 'B' },
  { id: 'u2', userId: '@siska_mkt', nickname: 'Siska', name: 'Siska Marketing', phone: '+62 857-1122-3344', avatar: 'S' },
  { id: 'u3', userId: '@jokow', nickname: 'Joko', name: 'Joko Widodo', phone: '+62 811-9988-7766', avatar: 'J' },
  { id: 'u4', userId: '@andi_dev', nickname: 'Andi', name: 'Andi Developer', phone: '+62 813-5555-4444', avatar: 'A' },
  { id: 'u5', userId: '@ratna_hr', nickname: 'Ratna', name: 'Ratna HRD', phone: '+62 819-1234-5678', avatar: 'R' },
  { id: 'me', userId: '@admin_velora', nickname: 'Admin', name: 'Anda (Admin)', phone: '+62 899-0000-1111', avatar: 'M' }
];

const INITIAL_CHATS = [];

function App() {
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [activeTopicId, setActiveTopicId] = useState(null);
  const [socket, setSocket] = useState(null);

  // Setup Socket.io connection when app mounts
  const [attendances, setAttendances] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [settings, setSettings] = useState({});
  const [shifts, setShifts] = useState([]);
  const [starredMessages, setStarredMessages] = useState([]);
  const [devices, setDevices] = useState([]);
  const [familyMap, setFamilyMap] = useState([]);
  const [payroll, setPayroll] = useState([]);

  useEffect(() => {
    const serverUrl = import.meta.env.VITE_SERVER_URL || (import.meta.env.PROD ? undefined : 'http://localhost:3000');
    const newSocket = io(serverUrl);
    setSocket(newSocket);

    newSocket.on('initial_data', (data) => {
      setChats(data);
      if(data.length > 0) {
        setActiveChatId(prev => prev || data[0].id);
      }
    });

    newSocket.on('chat_info_updated', (data) => {
      setChats(prevChats => prevChats.map(chat => {
        if (String(chat.id) === String(data.chatId)) {
          if (data.topicId) {
            return {
              ...chat,
              topics: chat.topics ? chat.topics.map(t => String(t.id) === String(data.topicId) ? { ...t, ...data.updates } : t) : []
            };
          } else {
            return { ...chat, ...data.updates };
          }
        }
        return chat;
      }));
    });

    newSocket.on('initial_attendances', (data) => {
      setAttendances(data || []);
    });

    newSocket.on('new_attendance', (data) => {
      setAttendances(prev => [data, ...prev]);
    });

    newSocket.on('initial_employees', (data) => {
      setEmployees(data || []);
    });

    newSocket.on('new_employee', (data) => {
      setEmployees(prev => [...prev, data]);
    });

    newSocket.on('employee_updated', (updatedData) => {
      setEmployees(prev => prev.map(emp => emp.id === updatedData.id ? updatedData : emp));
    });

    newSocket.on('employee_deleted', (deletedId) => {
      setEmployees(prev => prev.filter(emp => emp.id !== deletedId));
    });

    newSocket.on('new_group', (data) => {
      setChats(prev => [data, ...prev]);
    });

    newSocket.on('new_topic', (data) => {
      setChats(prevChats => prevChats.map(chat => {
        if (chat.id === data.chatId) {
          return { ...chat, topics: [...(chat.topics || []), data.topic] };
        }
        return chat;
      }));
    });

    newSocket.on('chat_deleted', (data) => {
      const safeTargetId = String(data.targetId);
      setChats(prevChats => prevChats.map(chat => {
        if (chat.topics && chat.topics.find(t => String(t.id) === safeTargetId)) {
          return {
            ...chat,
            topics: chat.topics.filter(t => String(t.id) !== safeTargetId)
          };
        }
        return chat;
      }).filter(c => String(c.id) !== safeTargetId));

      setActiveChatId(prevChatId => {
        if (String(prevChatId) === safeTargetId) return null;
        return prevChatId;
      });
      setActiveTopicId(prevTopicId => {
        if (String(prevTopicId) === safeTargetId) return null;
        return prevTopicId;
      });
    });

    // Permanent Data Listeners
    newSocket.on('initial_settings', (data) => {
      setSettings(data || {});
      const currentUserId = localStorage.getItem('currentUserId') || 'me';
      const mySettings = (data || {})[currentUserId];
      if (mySettings) {
        if (mySettings.theme) {
          setTheme(mySettings.theme);
          localStorage.setItem('theme', mySettings.theme);
        }
        if (mySettings.profileAvatar) {
          setCurrentUserAvatar(mySettings.profileAvatar);
          localStorage.setItem(`avatar_${currentUserId}`, mySettings.profileAvatar);
        }
      }
    });

    newSocket.on('settings_updated', (data) => {
      setSettings(prev => ({ ...prev, [data.userId]: data.settings }));
      const currentUserId = localStorage.getItem('currentUserId') || 'me';
      if (data.userId === currentUserId) {
        if (data.settings.theme) {
          setTheme(data.settings.theme);
          localStorage.setItem('theme', data.settings.theme);
        }
        if (data.settings.profileAvatar) {
          setCurrentUserAvatar(data.settings.profileAvatar);
          localStorage.setItem(`avatar_${data.userId}`, data.settings.profileAvatar);
        }
      }
    });

    newSocket.on('initial_shifts', (data) => setShifts(data || []));
    newSocket.on('initial_starred', (data) => setStarredMessages(data || []));
    newSocket.on('initial_devices', (data) => setDevices(data || []));
    newSocket.on('initial_family_map', (data) => setFamilyMap(data || []));
    newSocket.on('initial_payroll', (data) => setPayroll(data || []));

    // Listen for incoming messages
    newSocket.on('receive_message', (data) => {
      setChats(prevChats => prevChats.map(chat => {
        if (chat.id === data.chatId) {
          if (chat.type === 'groups' && data.topicId) {
            return {
              ...chat,
              topics: chat.topics.map(t => t.id === data.topicId ? { ...t, messages: [...t.messages, data.message] } : t)
            };
          } else {
            return { ...chat, messages: [...(chat.messages || []), data.message] };
          }
        }
        return chat;
      }));
    });

    return () => newSocket.close();
  }, []);

  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState(localStorage.getItem('isLoggedIn') === 'true');
  const [userRole, setUserRole] = useState(localStorage.getItem('userRole') || null);
  const [currentUserId, setCurrentUserId] = useState(localStorage.getItem('currentUserId') || 'me');
  const [currentUserName, setCurrentUserName] = useState(localStorage.getItem('currentUserName') || 'Anda (Admin)');

  // WebRTC Incoming Call Listener
  useEffect(() => {
    if (!socket || !isLoggedIn) return;

    const handleIncomingCall = (data) => {
      // Ensure the call is directed to the current user (using their phone number as ID in this mockup)
      const currentPhone = localStorage.getItem('userPhone') || 'me';
      if (data.to === currentPhone || data.to === 'all') { // Fallback 'all' for mockup
        setIncomingCall(data);
      }
    };

    const handleCallEnded = () => {
      setIncomingCall(null);
      setActiveCall(null);
    };

    socket.on('incoming_call', handleIncomingCall);
    socket.on('call_ended', handleCallEnded);
    socket.on('call_rejected', handleCallEnded);

    return () => {
      socket.off('incoming_call', handleIncomingCall);
      socket.off('call_ended', handleCallEnded);
      socket.off('call_rejected', handleCallEnded);
    };
  }, [socket, isLoggedIn]);
  
  // Right Sidebar State
  const [showInfoPanel, setShowInfoPanel] = useState(false);

  // Settings View State
  const [showSettingsView, setShowSettingsView] = useState(false);
  const [showStarredMessages, setShowStarredMessages] = useState(false);
  const [showLinkedDevices, setShowLinkedDevices] = useState(false);
  const [showFamilyMap, setShowFamilyMap] = useState(false);
  const [showWorkspace, setShowWorkspace] = useState(false);

  // Call State
  const [activeCall, setActiveCall] = useState(null); // { chatId, type: 'audio' | 'video', isIncoming: boolean, peerId: string }
  const [incomingCall, setIncomingCall] = useState(null);

  const currentPhone = localStorage.getItem('userPhone') || 'me';

  const handleAcceptCall = () => {
    setActiveCall({
      chatId: incomingCall.from,
      chat: { id: incomingCall.from, name: incomingCall.fromName, type: 'personal' },
      type: incomingCall.type,
      isIncoming: true,
      remotePeerId: incomingCall.peerId
    });
    setIncomingCall(null);
  };

  const handleRejectCall = () => {
    if (socket) {
      socket.emit('reject_call', { to: incomingCall.from });
    }
    setIncomingCall(null);
  };

  const [hasClockedIn, setHasClockedIn] = useState(localStorage.getItem('hasClockedIn') === 'true');

  // Theme State
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [currentUserAvatar, setCurrentUserAvatar] = useState(localStorage.getItem(`avatar_${localStorage.getItem('currentUserId') || 'me'}`) || null);

  const [showAdminDashboard, setShowAdminDashboard] = useState(false);

  const handleLoginSuccess = (role, userData) => {
    setIsLoggedIn(true);
    setUserRole(role);
    if (userData) {
      setCurrentUserId(userData.id);
      setCurrentUserName(userData.name);
      localStorage.setItem('currentUserId', userData.id);
      localStorage.setItem('currentUserName', userData.name);
      localStorage.setItem('userPhone', userData.phone || 'me');
    }
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userRole', role || 'user');
  };

  const handleClockIn = () => {
    setHasClockedIn(true);
    localStorage.setItem('hasClockedIn', 'true');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setHasClockedIn(false);
    setShowAdminDashboard(false);
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('hasClockedIn');
    localStorage.removeItem('userRole');
    localStorage.removeItem('currentUserId');
    localStorage.removeItem('currentUserName');
    localStorage.removeItem('userPhone');
    window.location.reload(); // clear cache
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  // Modal states for New Group
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupType, setNewGroupType] = useState('biasa'); // 'biasa' | 'keluarga'

  const activeChat = chats.find(c => c.id === activeChatId);
  
  // If user is not admin, check if activeChat is allowed
  const isChatAllowed = userRole === 'admin' || (activeChat && (
    activeChat.type === 'personal' ? (activeChat.id === currentUserId || activeChat.members?.some(m => m.id === currentUserId)) :
    (activeChat.members?.some(m => m.id === currentUserId || m.name === currentUserName || m === currentUserId))
  ));
  
  const displayedActiveChat = isChatAllowed ? activeChat : null;

  let activeMessages = [];
  let chatTitle = '';
  let chatSubtitle = '';
  let chatAvatar = '';
  let isTopic = false;
  let currentTopic = null;
  
  if (activeChat) {
    if (activeChat.type === 'groups' && activeTopicId) {
      currentTopic = activeChat.topics?.find(t => t.id === activeTopicId);
      activeMessages = currentTopic?.messages || [];
      chatTitle = `# ${currentTopic?.name}`;
      chatSubtitle = `Topik dari grup ${activeChat.name}`;
      chatAvatar = currentTopic?.avatarUrl || activeChat.avatarUrl;
      isTopic = true;
    } else {
      activeMessages = activeChat.messages || [];
      chatTitle = activeChat.name;
      chatSubtitle = activeChat.type === 'groups' ? `${activeChat.members?.length || 0} anggota` : activeChat.lastSeen;
      chatAvatar = activeChat.avatarUrl;
    }
  }

  const handleSendMessage = (payload) => {
    if (!activeChat) return;
    
    // If payload is a string (from old text sending logic)
    const isTextString = typeof payload === 'string';
    if (isTextString && !payload.trim()) return;

    let newMessage;
    if (isTextString) {
      newMessage = {
        id: Date.now(),
        type: 'text',
        text: payload,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isSentByMe: true
      };
    } else {
      // It's an attachment object
      newMessage = {
        id: Date.now(),
        ...payload, // contains type, url, text, etc.
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isSentByMe: true
      };
    }

    setChats(prevChats => prevChats.map(chat => {
      if (chat.id === activeChatId) {
        if (chat.type === 'groups' && activeTopicId) {
          return {
            ...chat,
            topics: chat.topics.map(t => t.id === activeTopicId ? { ...t, messages: [...t.messages, newMessage] } : t)
          };
        } else {
          return { ...chat, messages: [...(chat.messages || []), newMessage] };
        }
      }
      return chat;
    }));

    // Broadcast message to server
    if (socket) {
      const broadcastMessage = { ...newMessage, isSentByMe: false }; // It will be received as not sent by me for others
      socket.emit('send_message', {
        chatId: activeChatId,
        topicId: activeTopicId,
        message: broadcastMessage
      });
    }
  };

  const handleCreateGroup = (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    
    if (userRole !== 'admin') {
      const myGroupsCount = chats.filter(c => c.type === 'groups' && c.adminId === currentUserId).length;
      if (myGroupsCount >= 1) {
        alert('Akses Ditolak: Karyawan hanya diperbolehkan membuat maksimal 1 grup biasa saja.');
        return;
      }
    }
    
    const newGroupId = Date.now();
    const newGroup = {
      id: newGroupId,
      name: newGroupType === 'keluarga' ? `👨‍👩‍👧‍👦 ${newGroupName}` : newGroupName,
      type: 'groups',
      avatar: newGroupName.charAt(0).toUpperCase(),
      lastMessage: 'Grup baru telah dibuat',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      unread: 0,
      adminId: currentUserId,
      members: newGroupType === 'keluarga' 
        ? [{ id: currentUserId, name: currentUserName, role: 'admin' }] 
        : [{ id: currentUserId, name: currentUserName, role: 'admin' }],
      topics: []
    };
    
    setChats([newGroup, ...chats]);
    setShowNewGroupModal(false);
    setNewGroupName('');
    setNewGroupType('biasa');
    setActiveChatId(newGroupId);

    if (socket) {
      socket.emit('create_group', newGroup);
    }
  };

  const handleCreateTopic = (chatId, topicName) => {
    if (!topicName.trim()) return;
    const newTopic = { id: `t_${Date.now()}`, name: topicName, avatarUrl: '', messages: [] };
    
    setChats(prevChats => prevChats.map(chat => {
      if (chat.id === chatId) {
        return { ...chat, topics: [...(chat.topics || []), newTopic] };
      }
      return chat;
    }));

    if (socket) {
      socket.emit('create_topic', { chatId, topic: newTopic });
    }
  };

  const updateChatInfo = (chatId, topicId, updates) => {
    if (socket) {
      socket.emit('update_chat_info', { chatId, topicId, updates });
    }
    
    setChats(prevChats => prevChats.map(chat => {
      if (String(chat.id) === String(chatId)) {
        if (topicId) {
          // Update Topic
          return {
            ...chat,
            topics: chat.topics.map(t => String(t.id) === String(topicId) ? { ...t, ...updates } : t)
          };
        } else {
          // Update Group/Personal
          return { ...chat, ...updates };
        }
      }
      return chat;
    }));
  };

  const handleDeleteChat = (targetId) => {
    const safeTargetId = String(targetId);
    
    // Opt-out if user cancels, wait we already have window.confirm in InfoPanel
    // Let's force execution
    
    if (socket) {
      socket.emit('delete_chat', { targetId: safeTargetId });
    }
    
    setChats(prevChats => {
      const newChats = prevChats.map(chat => {
        if (chat.topics && chat.topics.find(t => String(t.id) === safeTargetId)) {
          return {
            ...chat,
            topics: chat.topics.filter(t => String(t.id) !== safeTargetId)
          };
        }
        return chat;
      }).filter(c => String(c.id) !== safeTargetId);
      
      return newChats;
    });

    if (String(activeChatId) === safeTargetId || String(activeTopicId) === safeTargetId) {
      setActiveChatId(null);
      setActiveTopicId(null);
      setShowInfoPanel(false);
    }
    
    // Force UI refresh by reloading state if local logic gets stuck
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const toggleInfoPanel = () => setShowInfoPanel(!showInfoPanel);

  const handleStartNewChat = (user) => {
    const existingChat = chats.find(c => c.type === 'personal' && c.id === user.id);
    if (existingChat) {
      setActiveChatId(existingChat.id);
      setActiveTopicId(null);
    } else {
      // Create new chat
      const newChat = {
        id: user.id,
        name: user.name,
        type: 'personal',
        lastSeen: 'Online',
        unread: 0,
        avatarUrl: '',
        messages: []
      };
      setChats([newChat, ...chats]);
      setActiveChatId(newChat.id);
      setActiveTopicId(null);
    }
  };

  if (!isLoggedIn) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} employees={employees} socket={socket} />;
  }

  const visibleChats = userRole === 'admin' ? chats : chats.filter(chat => {
    if (chat.type === 'personal') {
      return chat.id === currentUserId || chat.members?.some(m => m.id === currentUserId);
    } else if (chat.type === 'groups' || chat.type === 'channels') {
      return chat.members?.some(m => m.id === currentUserId || m.name === currentUserName || m === currentUserId);
    }
    return false;
  });

  return (
    <div className={`app-container ${theme === 'light' ? 'light-theme' : ''}`}>
      <Sidebar 
        chats={visibleChats} 
        currentUserName={currentUserName}
        activeChatId={activeChatId} 
        activeTopicId={activeTopicId}
        onSelectChat={(id, isGroup) => {
          setActiveChatId(id);
          if (!isGroup) setActiveTopicId(null);
          setShowInfoPanel(false); 
        }} 
        onSelectTopic={(chatId, topicId) => {
          setActiveChatId(chatId);
          setActiveTopicId(topicId);
          setShowInfoPanel(false);
        }}
        onAddGroupClick={() => setShowNewGroupModal(true)}
        onCreateTopic={handleCreateTopic}
        onStartNewChat={handleStartNewChat}
        globalUsers={GLOBAL_USERS}
        onOpenSettings={() => setShowSettingsView(true)}
        onOpenStarred={() => setShowStarredMessages(true)}
        onOpenLinkedDevices={() => setShowLinkedDevices(true)}
        onOpenWorkspace={() => setShowWorkspace(true)}
        onLogout={handleLogout}
        userRole={userRole}
        onOpenAdmin={() => setShowAdminDashboard(true)}
        currentUserAvatar={currentUserAvatar}
      />
      
      {showAdminDashboard ? (
        <AdminDashboard onClose={() => setShowAdminDashboard(false)} attendances={attendances} employees={employees} />
      ) : showWorkspace ? (
        <WorkspaceView onClose={() => setShowWorkspace(false)} socket={socket} attendances={attendances} employees={employees} userRole={userRole} shifts={shifts} payroll={payroll} settings={settings} />
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
          {!hasClockedIn && userRole !== 'admin' && (
            <div style={{ backgroundColor: '#f59e0b', color: '#000', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem', fontWeight: 500, zIndex: 10 }}>
              <span>⚠️ Anda belum melakukan absensi masuk hari ini. Akses obrolan terbuka, namun jangan lupa absen.</span>
              <button onClick={() => setShowWorkspace(true)} style={{ backgroundColor: '#000', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
                Absen Sekarang
              </button>
            </div>
          )}
          <div className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
            {displayedActiveChat && (displayedActiveChat.type !== 'groups' || activeTopicId) ? (
              <ChatArea 
                chat={displayedActiveChat} 
                activeTopicId={activeTopicId}
                onSendMessage={handleSendMessage}
                onHeaderClick={toggleInfoPanel}
                onStartCall={(type) => setActiveCall({ chatId: displayedActiveChat.id, chat: displayedActiveChat, type, isIncoming: false })}
                onOpenFamilyMap={() => setShowFamilyMap(true)}
              />
            ) : displayedActiveChat?.type === 'groups' ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-secondary)' }}>
                <div style={{ width: '100px', height: '100px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', fontWeight: 'bold', marginBottom: '16px', overflow: 'hidden' }}>
                  {displayedActiveChat.avatarUrl ? <img src={displayedActiveChat.avatarUrl} alt="Group" style={{width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover'}} /> : displayedActiveChat.name.charAt(0).toUpperCase()}
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '8px' }}>{displayedActiveChat.name}</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{displayedActiveChat.topics?.length || 0} Topik Tersedia</p>
                <button 
                  onClick={() => setShowInfoPanel(true)}
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}
                  onMouseOver={(e) => e.target.style.backgroundColor = 'var(--border-color)'}
                  onMouseOut={(e) => e.target.style.backgroundColor = 'var(--bg-tertiary)'}
                >
                  Pengaturan Grup
                </button>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)' }}>
                Pilih obrolan untuk mulai mengirim pesan
              </div>
            )}
          </div>
        </div>
      )}

      {/* Right Info Panel */}
      {showInfoPanel && displayedActiveChat && (
        <InfoPanel 
          chat={displayedActiveChat} 
          topic={displayedActiveChat.topics ? displayedActiveChat.topics.find(t => t.id === activeTopicId) : null}
          isTopic={!!activeTopicId}
          onClose={() => setShowInfoPanel(false)}
          onUpdate={(updates) => updateChatInfo(displayedActiveChat.id, activeTopicId, updates)}
          onDelete={handleDeleteChat}
          globalUsers={GLOBAL_USERS}
        />
      )}

      {/* New Group Modal */}
      {showNewGroupModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-slide-up">
            <h2 className="font-bold text-xl mb-4">Buat Grup Baru</h2>
            <form onSubmit={handleCreateGroup}>
              {userRole === 'admin' && (
                <div className="mb-4">
                  <label className="block text-sm font-semibold mb-2 text-secondary">Tipe Grup</label>
                  <select 
                    className="w-full bg-tertiary border border-gray-700 text-white rounded-lg p-3 outline-none"
                    value={newGroupType}
                    onChange={(e) => setNewGroupType(e.target.value)}
                  >
                    <option value="biasa">Grup Biasa (Komunitas, Pekerjaan)</option>
                    <option value="keluarga">Grup Privasi Pelacakan (Khusus Keluarga)</option>
                  </select>
                </div>
              )}
              {userRole !== 'admin' && (
                <div className="mb-4">
                  <label className="block text-sm font-semibold mb-2 text-secondary">Tipe Grup</label>
                  <div className="w-full bg-tertiary border border-gray-700 text-gray-400 rounded-lg p-3">
                    Grup Biasa
                  </div>
                </div>
              )}
              <input 
                type="text" 
                placeholder="Nama Grup..." 
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="w-full bg-tertiary border border-gray-700 text-white rounded-lg p-3 outline-none mb-4"
                autoFocus
              />
              <div className="modal-actions" style={{display: 'flex', justifyContent: 'flex-end', gap: '8px'}}>
                <button type="button" onClick={() => setShowNewGroupModal(false)} className="btn-cancel px-4 py-2 rounded-lg border border-gray-600 text-gray-300">Batal</button>
                <button type="submit" className="btn-primary px-4 py-2 rounded-lg bg-accent text-white font-semibold">Buat Grup</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Render Incoming Call Notification */}
      {incomingCall && (
        <div className="modal-overlay" style={{ zIndex: 100 }}>
          <div className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center animate-slide-up w-80 text-black">
            <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center text-white text-3xl font-bold mb-4 animate-pulse">
              {incomingCall.fromName.charAt(0)}
            </div>
            <h3 className="text-xl font-bold mb-1">{incomingCall.fromName}</h3>
            <p className="text-gray-500 mb-8">
              Panggilan {incomingCall.type === 'video' ? 'Video' : 'Suara'} Masuk...
            </p>
            <div className="flex gap-6 w-full justify-center">
              <button 
                onClick={handleRejectCall}
                style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#ef4444', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
              >
                Tolak
              </button>
              <button 
                onClick={handleAcceptCall}
                style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#10b981', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
              >
                Terima
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Call Room Overlay */}
      {activeCall && (
        <CallRoom 
          chat={activeCall.chat || chats.find(c => c.id === activeCall.chatId)}
          callType={activeCall.type}
          isIncoming={activeCall.isIncoming}
          remotePeerId={activeCall.remotePeerId}
          socket={socket}
          currentPhone={currentPhone}
          onClose={() => setActiveCall(null)}
        />
      )}

      {/* Settings View Overlay */}
      {showSettingsView && (
        <SettingsView 
          onClose={() => setShowSettingsView(false)} 
          theme={theme}
          onThemeChange={handleThemeChange}
          currentUserName={currentUserName}
          currentUserId={currentUserId}
          onAvatarChange={setCurrentUserAvatar}
          settings={settings}
          socket={socket}
        />
      )}

      {/* Starred Messages Overlay */}
      {showStarredMessages && (
        <StarredMessagesView 
          onClose={() => setShowStarredMessages(false)} 
          starredMessages={starredMessages}
          socket={socket}
        />
      )}

      {/* Linked Devices Overlay */}
      {showLinkedDevices && (
        <LinkedDevicesView 
          onClose={() => setShowLinkedDevices(false)} 
          devices={devices}
          socket={socket}
        />
      )}

      {/* Family Map Overlay */}
      {showFamilyMap && (
        <FamilyMapView 
          onClose={() => setShowFamilyMap(false)} 
          familyMap={familyMap}
          socket={socket}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
}

export default App;
