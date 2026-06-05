import React from 'react';
import { ArrowLeft, Star, ChevronRight } from 'lucide-react';
import './StarredMessagesView.css';

const StarredMessagesView = ({ onClose, starredMessages = [], socket }) => {
  const handleUnstar = (id) => {
    if (socket) {
      socket.emit('unstar_message', id);
    }
  };

  return (
    <div className="full-overlay animate-fade-in">
      <div className="full-overlay-container">
        <div className="full-overlay-header">
          <button className="icon-btn mr-4" onClick={onClose}>
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-xl font-bold">Pesan Berbintang</h2>
        </div>
        
        <div className="starred-content">
          {starredMessages.length === 0 ? (
            <div className="empty-state text-center mt-20">
              <Star size={64} className="mx-auto text-muted mb-4 opacity-30" />
              <h3 className="text-xl font-bold mb-2">Belum ada pesan berbintang</h3>
              <p className="text-secondary">Ketuk dan tahan sebuah pesan di obrolan mana pun untuk membintanginya, sehingga Anda bisa menemukannya dengan mudah nanti.</p>
            </div>
          ) : (
            <div className="starred-list">
              {starredMessages.map(msg => (
                <div key={msg.id} className="starred-item">
                  <div className="starred-header">
                    <div className="flex items-center gap-3">
                      <div className="avatar bg-accent" style={{width: '32px', height: '32px', fontSize: '0.9rem'}}>
                        {msg.avatar}
                      </div>
                      <div>
                        <div className="font-bold text-sm">
                          {msg.isMe ? 'Anda' : msg.sender} <span className="text-muted font-normal mx-1">di</span> {msg.chatName}
                        </div>
                        <div className="text-xs text-secondary">{msg.date}</div>
                      </div>
                    </div>
                    <button className="icon-btn"><ChevronRight size={16} className="text-muted" /></button>
                  </div>
                  
                  <div className="starred-body">
                    <p className="text-sm">{msg.content}</p>
                    <div className="starred-footer mt-2 flex justify-end">
                      <button onClick={() => handleUnstar(msg.id)} title="Hapus Bintang" className="icon-btn" style={{padding: '4px'}}>
                        <Star size={16} className="text-accent inline-block" fill="currentColor" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StarredMessagesView;
