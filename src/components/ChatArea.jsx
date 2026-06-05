import React, { useState, useRef, useEffect } from 'react';
import { Phone, Video as VideoIcon, Search, MoreVertical, Paperclip, Smile, Send, Mic, Image as ImageIcon, MapPin, FileText, User as UserIcon, Sticker, Map } from 'lucide-react';
import { GLOBAL_USERS } from '../App';
import './ChatArea.css';

const ChatArea = ({ chat, onSendMessage, onHeaderClick, groupMembers, onStartCall, onOpenFamilyMap }) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);
  
  // Tagging / Mention state
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionIndex, setMentionIndex] = useState(-1);

  // Attachment state
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chat.messages]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputText(val);

    const lastWordMatch = val.match(/@(\w*)$/);
    if (lastWordMatch) {
      setShowMentionMenu(true);
      setMentionFilter(lastWordMatch[1].toLowerCase());
      setMentionIndex(val.lastIndexOf('@'));
    } else {
      setShowMentionMenu(false);
    }
  };

  const handleSendText = () => {
    onSendMessage({ type: 'text', text: inputText });
    setInputText('');
    setShowMentionMenu(false);
    setShowAttachmentMenu(false);
  };

  const handleSendAttachment = (type) => {
    if (type === 'image' || type === 'video' || type === 'document') {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
      return;
    }

    let payload = { type, text: '' };
    switch(type) {
      case 'location':
        payload = { type: 'location', lat: -6.2088, lng: 106.8456, text: 'Lokasi meeting kita' };
        break;
      case 'contact':
        payload = { type: 'contact', name: 'Joko Widodo', phone: '+62 811-9988-7766' };
        break;
      case 'sticker':
        payload = { type: 'sticker', url: 'https://cdn-icons-png.flaticon.com/512/4710/4710986.png' };
        break;
      default:
        break;
    }
    
    onSendMessage(payload);
    setShowAttachmentMenu(false);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    let type = 'document';
    if (file.type.startsWith('image/')) type = 'image';
    else if (file.type.startsWith('video/')) type = 'video';

    // Optimistic UI for uploading (bisa diperbaiki lagi dengan UI loading sesungguhnya)
    const formData = new FormData();
    formData.append('file', file);

    try {
      const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';
      const response = await fetch(`${serverUrl}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const payload = {
          type,
          url: data.url, // URL asli dari server, bukan base64
          filename: data.filename,
          size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
          text: ''
        };
        onSendMessage(payload);
      } else {
        alert('Gagal mengunggah file!');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Terjadi kesalahan saat mengunggah file.');
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
    setShowAttachmentMenu(false);
  };

  const handleKeyDown = (e) => {
    if (showMentionMenu && filteredMentionUsers.length > 0 && e.key === 'Escape') {
      setShowMentionMenu(false);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendText();
    }
  };

  const insertMention = (username) => {
    const newValue = inputText.substring(0, mentionIndex) + `@${username.replace(/\s+/g, '')} ` ;
    setInputText(newValue);
    setShowMentionMenu(false);
  };

  const renderMessageText = (text) => {
    if (!text) return null;
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return <span key={i} className="mention-tag">{part}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  const renderMediaContent = (msg) => {
    switch(msg.type) {
      case 'image':
        return (
          <div className="media-attachment">
            <img src={msg.url} alt="Attachment" className="attachment-img" />
            {msg.text && <p className="mt-2">{renderMessageText(msg.text)}</p>}
          </div>
        );
      case 'video':
        return (
          <div className="media-attachment video-attachment">
            <img src={msg.url} alt="Video thumbnail" className="attachment-img" />
            <div className="play-overlay"><VideoIcon size={32} color="white" /></div>
            {msg.text && <p className="mt-2">{renderMessageText(msg.text)}</p>}
          </div>
        );
      case 'location':
        return (
          <div className="media-attachment location-attachment">
            <div className="map-placeholder">
              <MapPin size={32} color="#ea4335" />
            </div>
            <p className="mt-2 text-sm font-medium">{msg.text}</p>
          </div>
        );
      case 'document':
        return (
          <div className="media-attachment document-attachment">
            <div className="doc-icon"><FileText size={24} /></div>
            <div className="doc-info">
              <span className="doc-name">{msg.filename}</span>
              <span className="doc-size">{msg.size} • PDF</span>
            </div>
          </div>
        );
      case 'contact':
        return (
          <div className="media-attachment contact-attachment">
            <div className="contact-icon"><UserIcon size={24} /></div>
            <div className="contact-info">
              <span className="contact-name">{msg.name}</span>
              <span className="contact-phone">{msg.phone}</span>
            </div>
          </div>
        );
      case 'sticker':
        return (
          <div className="media-attachment sticker-attachment">
            <img src={msg.url} alt="Sticker" className="attachment-sticker" />
          </div>
        );
      default: // text or legacy
        return <p style={{ wordBreak: 'break-word' }}>{renderMessageText(msg.text)}</p>;
    }
  };

  const initial = chat.name ? chat.name.charAt(0) : '?';
  const chatAvatar = chat.avatarUrl || null;

  const usersToMention = groupMembers && groupMembers.length > 0 
    ? GLOBAL_USERS.filter(u => groupMembers.includes(u.id))
    : GLOBAL_USERS;
    
  const filteredMentionUsers = usersToMention.filter(u => 
    u.name.toLowerCase().includes(mentionFilter) || 
    u.name.replace(/\s+/g, '').toLowerCase().includes(mentionFilter)
  );

  return (
    <div className="chat-area">
      <div className="chat-header">
        <div className="chat-header-info" onClick={onHeaderClick}>
          <div className="avatar">
            {chatAvatar ? <img src={chatAvatar} alt="Avatar" style={{width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover'}} /> : initial}
          </div>
          <div>
            <h3 className="font-semibold text-base">{chat.name}</h3>
            <span className="text-xs text-secondary">{chat.lastSeen}</span>
          </div>
        </div>
        <div className="header-actions">
          {chat.id === 101 && (
            <button className="icon-btn text-accent" onClick={onOpenFamilyMap} title="Peta Keluarga">
              <Map size={20} />
            </button>
          )}
          <button className="icon-btn"><Search size={20} /></button>
          <button className="icon-btn" onClick={() => onStartCall('audio')}><Phone size={20} /></button>
          <button className="icon-btn" onClick={() => onStartCall('video')}><VideoIcon size={20} /></button>
          <button className="icon-btn" onClick={onHeaderClick}><MoreVertical size={20} /></button>
        </div>
      </div>

      <div className="chat-messages-container" onClick={() => {setShowAttachmentMenu(false); setShowMentionMenu(false);}}>
        <div className="chat-date-separator"><span>Hari ini</span></div>
        
        {chat.messages && chat.messages.map((msg, idx) => (
          <div 
            key={msg.id} 
            className={`message animate-slide-up ${msg.isSentByMe ? 'sent' : 'received'}`} 
            style={{ animationDelay: `${Math.min(idx * 0.05, 0.5)}s` }}
          >
            <div className={`message-content ${msg.type === 'sticker' ? 'transparent-bg' : ''}`}>
              {msg.sender && !msg.isSentByMe && msg.type !== 'sticker' && (
                <div className="text-xs font-semibold text-accent" style={{marginBottom: '4px'}}>{msg.sender}</div>
              )}
              
              {renderMediaContent(msg)}

              <span className={`message-time ${msg.type === 'sticker' ? 'floating-time' : ''}`}>
                {msg.time} {msg.isSentByMe && <span className="read-receipt text-accent">✓✓</span>}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <button className="icon-btn" onClick={() => handleSendAttachment('sticker')}><Smile size={24} /></button>
        
        <div className="relative" style={{ display: 'flex' }}>
          <button 
            className={`icon-btn ${showAttachmentMenu ? 'active-icon' : ''}`} 
            onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
          >
            <Paperclip size={24} />
          </button>
          
          {/* Attachment Menu Popup */}
          {showAttachmentMenu && (
            <div className="attachment-menu animate-slide-up">
              <button className="attach-item bg-purple" onClick={() => handleSendAttachment('document')}>
                <FileText size={20} /> <span className="tooltip">Dokumen</span>
              </button>
              <button className="attach-item bg-blue" onClick={() => handleSendAttachment('contact')}>
                <UserIcon size={20} /> <span className="tooltip">Kontak</span>
              </button>
              <button className="attach-item bg-red" onClick={() => handleSendAttachment('location')}>
                <MapPin size={20} /> <span className="tooltip">Lokasi</span>
              </button>
              <button className="attach-item bg-pink" onClick={() => handleSendAttachment('video')}>
                <VideoIcon size={20} /> <span className="tooltip">Video</span>
              </button>
              <button className="attach-item bg-orange" onClick={() => handleSendAttachment('image')}>
                <ImageIcon size={20} /> <span className="tooltip">Galeri</span>
              </button>
            </div>
          )}
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            onChange={handleFileChange} 
            accept="image/*,video/*,.pdf,.doc,.docx,.txt"
          />
        </div>
        
        <div className="input-container relative">
          {showMentionMenu && (
            <div className="mention-menu">
              {filteredMentionUsers.length === 0 ? (
                <div className="mention-item text-muted">Tidak ditemukan</div>
              ) : (
                filteredMentionUsers.map(user => (
                  <div key={user.id} className="mention-item" onClick={() => insertMention(user.name)}>
                    <div className="avatar-xs">{user.avatar}</div>
                    <span className="text-sm">{user.name}</span>
                    <span className="text-xs text-muted ml-auto">{user.phone}</span>
                  </div>
                ))
              )}
            </div>
          )}

          <input 
            type="text" 
            placeholder="Ketik pesan..." 
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>
        
        {inputText.trim() ? (
          <button className="send-btn bg-accent" onClick={handleSendText}><Send size={20} color="white" /></button>
        ) : (
          <button className="icon-btn mic-btn"><Mic size={24} /></button>
        )}
      </div>
    </div>
  );
};

export default ChatArea;
