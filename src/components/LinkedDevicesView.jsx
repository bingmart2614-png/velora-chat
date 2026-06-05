import React, { useState } from 'react';
import { ArrowLeft, Monitor, Smartphone, Plus, MonitorSmartphone, X, CheckCircle } from 'lucide-react';
import './LinkedDevicesView.css';

const LinkedDevicesView = ({ onClose, devices = [], socket }) => {
  const [showScanner, setShowScanner] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  const handleLinkDevice = () => {
    setShowScanner(true);
    setScanProgress(0);
    
    // Simulate scanning
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setScanProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          if (socket) {
            socket.emit('add_device', {
              id: Date.now(),
              name: 'Perangkat Web Baru',
              lastActive: 'Baru saja',
              location: 'Lokasi Tidak Diketahui'
            });
          }
          alert('Perangkat Berhasil Ditautkan!');
          setShowScanner(false);
        }, 500);
      }
    }, 200);
  };

  const handleRemoveDevice = (id) => {
    if (window.confirm('Keluar dari perangkat ini?')) {
      if (socket) {
        socket.emit('remove_device', id);
      }
    }
  };

  return (
    <div className="full-overlay animate-fade-in">
      {/* Scanner Modal */}
      {showScanner && (
        <div className="modal-overlay animate-fade-in" style={{zIndex: 300}}>
          <div className="modal-content animate-slide-up" style={{maxWidth: '400px', backgroundColor: 'var(--bg-primary)'}}>
            <div className="modal-header border-b border-gray-700 pb-4">
              <h2 className="text-xl font-bold">Pindai Kode QR</h2>
              <button className="icon-btn" onClick={() => setShowScanner(false)}><X size={24} /></button>
            </div>
            <div className="modal-body p-6 text-center">
              <p className="text-sm text-secondary mb-6">Buka web.velora.chat di komputer Anda dan pindai kode QR yang muncul.</p>
              
              <div className="scanner-frame mx-auto mb-6 relative" style={{width: '250px', height: '250px', border: '2px dashed var(--accent-primary)', borderRadius: '16px', overflow: 'hidden'}}>
                {/* Mock QR Code Pattern */}
                <div className="w-full h-full opacity-10 flex flex-wrap gap-2 p-4">
                  {[...Array(64)].map((_, i) => (
                    <div key={i} style={{width: '20px', height: '20px', backgroundColor: i%3===0 ? 'var(--text-primary)' : 'transparent'}} />
                  ))}
                </div>
                
                {/* Scanning Line */}
                <div className="scanner-line" style={{top: `${scanProgress}%`}}></div>
              </div>
              
              <p className="text-accent font-bold">Memindai... {scanProgress}%</p>
            </div>
          </div>
        </div>
      )}

      <div className="full-overlay-container">
        <div className="full-overlay-header">
          <button className="icon-btn mr-4" onClick={onClose}>
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-xl font-bold">Perangkat Bertaut</h2>
        </div>
        
        <div className="linked-content">
          <div className="linked-hero-banner mb-8 text-center">
            <MonitorSmartphone size={80} className="text-accent mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-2">Gunakan Velora di Web, Desktop, dan Perangkat Lain</h2>
            <p className="text-secondary mb-8 max-w-md mx-auto">
              Tautkan hingga 4 perangkat ke akun Velora Anda. Chat Anda akan selalu tersinkronisasi.
            </p>
            
            <button className="btn-link-device" onClick={handleLinkDevice}>
              <Plus size={20} /> Tautkan Perangkat
            </button>
          </div>

          <div className="linked-list-section max-w-xl mx-auto">
            <h3 className="text-sm font-bold text-accent uppercase tracking-wider mb-4 px-4">Status Perangkat</h3>
            
            <div className="device-list bg-secondary rounded-xl overflow-hidden border border-gray-800">
              {/* Current Device */}
              <div className="device-item flex items-center p-4 border-b border-gray-800">
                <div className="device-icon bg-accent bg-opacity-20 p-3 rounded-full mr-4 text-accent">
                  <Smartphone size={24} />
                </div>
                <div className="device-info flex-1">
                  <h4 className="font-bold text-base">Windows (Saat ini)</h4>
                  <p className="text-xs text-secondary mt-1 flex items-center gap-1">
                    <CheckCircle size={12} className="text-accent" /> Aktif
                  </p>
                </div>
              </div>
              
              {/* Other Devices from Backend */}
              {devices.map(device => (
                <div key={device.id} className="device-item flex items-center p-4 cursor-pointer hover:bg-tertiary transition-colors" onClick={() => handleRemoveDevice(device.id)}>
                  <div className="device-icon bg-tertiary p-3 rounded-full mr-4 text-secondary">
                    <Monitor size={24} />
                  </div>
                  <div className="device-info flex-1">
                    <h4 className="font-bold text-base">{device.name}</h4>
                    <p className="text-xs text-secondary mt-1">Terakhir aktif {device.lastActive} • {device.location}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <p className="text-xs text-center text-muted mt-6">
              Pesan pribadi dan panggilan Anda dienkripsi secara end-to-end (ujung ke ujung) di seluruh perangkat.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LinkedDevicesView;
