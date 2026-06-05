import React from 'react';
import { ArrowLeft, Battery, Wifi, ShieldAlert, Navigation } from 'lucide-react';
import './FamilyMapView.css';

const FamilyMapView = ({ onClose, familyMap = [], socket, currentUserId }) => {
  // Use real data or fallback to dummy if empty for preview purposes
  const defaultDummy = [
    { userId: currentUserId, name: "Anda", avatar: "M", top: "50%", left: "50%", battery: 85, status: "Di Rumah", isDriving: false, color: "#00D26A" },
    { userId: 'f1', name: "Ayah", avatar: "A", top: "30%", left: "40%", battery: 60, status: "Mengemudi 45 km/jam", isDriving: true, color: "#3390EC" },
    { userId: 'f2', name: "Ibu", avatar: "I", top: "70%", left: "65%", battery: 92, status: "Di Kantor", isDriving: false, color: "#F59E0B" }
  ];

  const displayData = familyMap.length > 0 ? familyMap : defaultDummy;

  // Simulate updating own location once when opened
  React.useEffect(() => {
    if (socket && familyMap.length === 0) {
      defaultDummy.forEach(d => socket.emit('update_location', d));
    }
  }, [socket, familyMap.length]);

  return (
    <div className="family-map-overlay animate-fade-in">
      <div className="map-header">
        <button className="icon-btn map-back-btn" onClick={onClose}>
          <ArrowLeft size={24} color="#121212" />
        </button>
        <h2 className="map-title">Peta Keluarga</h2>
        <div className="map-actions">
          <button className="icon-btn text-accent bg-white rounded-full p-2 shadow-md">
            <ShieldAlert size={20} />
          </button>
        </div>
      </div>

      {/* Map Background Simulation */}
      <div className="map-container">
        {/* We use a grid/dots pattern to simulate a map surface since we don't have an actual map API */}
        <div className="map-grid-pattern"></div>

        {/* Render Family Member Markers */}
        {displayData.map(member => (
          <div 
            key={member.userId} 
            className={`map-marker ${member.isDriving ? 'driving-animation' : 'pulsing-animation'}`}
            style={{ top: member.top, left: member.left }}
          >
            <div className="marker-tooltip">
              <div className="tooltip-header">
                <strong>{member.name}</strong>
                <span className="flex items-center gap-1 text-xs">
                  <Battery size={12} /> {member.battery}%
                </span>
              </div>
              <div className="tooltip-status">
                {member.isDriving && <Navigation size={12} className="inline mr-1" />}
                {member.status}
              </div>
            </div>
            
            <div className="marker-pin" style={{ backgroundColor: member.color }}>
              <div className="marker-avatar">{member.avatar}</div>
            </div>
            {/* Pulsing ring */}
            <div className="marker-ring" style={{ borderColor: member.color }}></div>
          </div>
        ))}
      </div>

      <div className="map-bottom-panel">
        <h3 className="text-lg font-bold mb-4 text-gray-800">Status Terkini</h3>
        <div className="family-cards-row">
          {displayData.map(member => (
            <div key={member.userId} className="family-status-card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="avatar small bg-accent" style={{ backgroundColor: member.color }}>{member.avatar}</div>
                  <strong className="text-gray-800">{member.name}</strong>
                </div>
                <div className="text-xs font-bold text-gray-500">{member.battery}%</div>
              </div>
              <p className="text-sm text-gray-600">{member.status}</p>
              <p className="text-xs text-gray-400 mt-1">Diperbarui baru saja</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FamilyMapView;
