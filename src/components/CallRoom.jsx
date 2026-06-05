import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Users, Settings, Maximize } from 'lucide-react';
import Peer from 'peerjs';
import './CallRoom.css';

const CallRoom = ({ chat, callType, isIncoming, remotePeerId, socket, currentPhone, onClose }) => {
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(callType === 'video');
  const [peerId, setPeerId] = useState('');
  const [callStatus, setCallStatus] = useState(isIncoming ? 'Menghubungkan...' : 'Memanggil...');

  const myVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerInstance = useRef(null);
  const currentCall = useRef(null);
  const myStream = useRef(null);

  useEffect(() => {
    // 1. Initialize Peer
    const peer = new Peer(currentPhone, {
      host: 'localhost',
      port: 3000,
      path: '/peerjs'
    });

    peer.on('open', (id) => {
      setPeerId(id);
      
      // 2. Get Media Stream
      navigator.mediaDevices.getUserMedia({
        video: callType === 'video',
        audio: true
      }).then((stream) => {
        myStream.current = stream;
        if (myVideoRef.current) {
          myVideoRef.current.srcObject = stream;
        }

        if (isIncoming) {
          // If we are answering an incoming call, we wait for the 'call' event
          peer.on('call', (call) => {
            setCallStatus('Tersambung');
            call.answer(stream); // Answer the call with an A/V stream.
            currentCall.current = call;
            call.on('stream', (remoteStream) => {
              if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = remoteStream;
              }
            });
            call.on('close', () => {
              handleEndCall();
            });
          });
          
          // Emit accept_call to notify caller
          if (socket) {
            socket.emit('accept_call', { to: chat.id, peerId: id });
          }

        } else {
          // If we are initiating the call
          // Wait for receiver to accept
          const handleCallAccepted = (data) => {
            if (data.peerId) {
              setCallStatus('Tersambung');
              const call = peer.call(data.peerId, stream);
              currentCall.current = call;
              call.on('stream', (remoteStream) => {
                if (remoteVideoRef.current) {
                  remoteVideoRef.current.srcObject = remoteStream;
                }
              });
              call.on('close', () => {
                handleEndCall();
              });
            }
          };

          socket.on('call_accepted', handleCallAccepted);
          
          // Emit initiate_call
          socket.emit('initiate_call', {
            to: chat.id,
            from: currentPhone,
            fromName: 'Anda', // Harusnya ambil dari profile
            type: callType,
            peerId: id
          });

          return () => {
            socket.off('call_accepted', handleCallAccepted);
          };
        }
      }).catch(err => {
        console.error('Failed to get local stream', err);
        setCallStatus('Gagal mengakses kamera/mic');
      });
    });

    peerInstance.current = peer;

    const handleCallRejected = () => {
      setCallStatus('Panggilan Ditolak');
      setTimeout(() => handleEndCall(), 2000);
    };

    const handleCallEnded = () => {
      handleEndCall();
    };

    if (socket) {
      socket.on('call_rejected', handleCallRejected);
      socket.on('call_ended', handleCallEnded);
    }

    return () => {
      if (socket) {
        socket.off('call_rejected', handleCallRejected);
        socket.off('call_ended', handleCallEnded);
      }
      handleEndCall();
    };
  }, [isIncoming, callType, currentPhone, chat.id, socket]);

  const handleEndCall = () => {
    if (socket) {
      socket.emit('end_call', { to: chat.id });
    }
    if (currentCall.current) {
      currentCall.current.close();
    }
    if (myStream.current) {
      myStream.current.getTracks().forEach(track => track.stop());
    }
    if (peerInstance.current) {
      peerInstance.current.destroy();
    }
    onClose();
  };

  const toggleMic = () => {
    if (myStream.current) {
      const audioTrack = myStream.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isMicOn;
        setIsMicOn(!isMicOn);
      }
    }
  };

  const toggleVideo = () => {
    if (myStream.current) {
      const videoTrack = myStream.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoOn;
        setIsVideoOn(!isVideoOn);
      }
    }
  };

  return (
    <div className="call-room-overlay animate-fade-in">
      <div className="call-room-container">
        
        {/* Call Header */}
        <div className="call-header">
          <div className="call-title">
            <h2 className="text-xl font-bold">{chat.name}</h2>
            <span className="text-sm text-gray-300">{callStatus}</span>
          </div>
        </div>

        {/* Video Grid */}
        <div className="video-grid grid-2">
          {/* Remote Video */}
          <div className="video-box">
            <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', backgroundColor: '#1a1a1a' }} />
            <div className="participant-badge">
              <span className="text-sm font-medium">{chat.name}</span>
            </div>
          </div>
          
          {/* Local Video */}
          <div className="video-box">
            <video ref={myVideoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', backgroundColor: '#2d3748', transform: 'scaleX(-1)' }} />
            <div className="participant-badge">
              <span className="text-sm font-medium">Anda</span>
              {!isMicOn && <MicOff size={14} color="#ef4444" />}
            </div>
          </div>
        </div>

        {/* Controls Toolbar */}
        <div className="controls-toolbar">
          <div className="controls-group">
            <button 
              className={`control-btn ${!isMicOn ? 'off' : ''}`} 
              onClick={toggleMic}
            >
              {isMicOn ? <Mic size={24} /> : <MicOff size={24} />}
            </button>
            
            {callType === 'video' && (
              <button 
                className={`control-btn ${!isVideoOn ? 'off' : ''}`} 
                onClick={toggleVideo}
              >
                {isVideoOn ? <Video size={24} /> : <VideoOff size={24} />}
              </button>
            )}
            
            <button className="control-btn end-call" onClick={handleEndCall}>
              <PhoneOff size={24} color="white" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CallRoom;
