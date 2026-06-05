import React, { useState, useEffect, useRef } from 'react';
import { Phone, Mail, ArrowLeft, MessageSquare, Loader, User } from 'lucide-react';
import './LoginScreen.css';

const LoginScreen = ({ onLoginSuccess, employees = [], socket }) => {
  // 'main' | 'phone_input' | 'password_input' | 'loading'
  const [step, setStep] = useState('main');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');

  // Setup Device ID
  useEffect(() => {
    if (!localStorage.getItem('deviceId')) {
      localStorage.setItem('deviceId', 'device-' + Math.random().toString(36).substr(2, 9));
    }
  }, []);

  const ADMIN_PHONES = ['08977700304', '8977700304', '628977700304']; // Daftar nomor HP yang dianggap Admin

  const handleGoogleLogin = () => {
    setStep('loading');
    // Simulate network delay
    setTimeout(() => {
      onLoginSuccess('user', { id: 'google_user', name: 'Google User' });
    }, 1500);
  };

  const handlePhoneSubmit = (e) => {
    e.preventDefault();
    if (phoneNumber.length > 5) {
      setStep('password_input');
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (password.length > 0) {
      setStep('loading');
      setTimeout(() => {
        const cleanPhone = phoneNumber.replace(/\D/g, '');
        // Cek admin bypass
        if (ADMIN_PHONES.includes(cleanPhone)) {
          if (password === '990071') {
            onLoginSuccess('admin', { id: 'me', name: 'Anda (Admin)' });
          } else {
            setStep('password_input');
            alert('Password Admin salah!');
          }
        } else {
          // Cek di database karyawan
          const cleanInputId = phoneNumber.toLowerCase().replace(/\s+/g, '');
          const emp = employees.find(e => {
            const matchId = e.userId && e.userId.toLowerCase().replace(/\s+/g, '') === cleanInputId;
            const matchPhone = cleanPhone !== '' && e.phone && e.phone.replace(/\D/g, '') === cleanPhone;
            return matchId || matchPhone;
          });
          
          if (emp && emp.password === password) {
            const currentDeviceId = localStorage.getItem('deviceId');
            
            // Logika Device Binding
            if (!emp.boundDevice) {
              // Jika belum pernah bind device, maka bind sekarang
              if (socket) {
                socket.emit('bind_device', { employeeId: emp.id, deviceId: currentDeviceId });
              }
              onLoginSuccess('user', emp);
            } else if (emp.boundDevice === currentDeviceId) {
              // Jika sudah bind, pastikan device ID cocok
              onLoginSuccess('user', emp);
            } else {
              // Jika beda HP
              setStep('password_input');
              alert('Akses Ditolak: Perangkat Anda tidak dikenali! Harap gunakan perangkat asli Anda atau hubungi Admin untuk melakukan Reset Perangkat.');
            }
          } else {
            setStep('password_input');
            alert('Nomor HP / User ID atau Password salah, atau karyawan belum terdaftar!');
          }
        }
      }, 1000);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card animate-slide-up">
        
        {step === 'main' && (
          <div className="login-step-main">
            <div className="login-logo-area">
              <div className="logo-icon bg-transparent" style={{ padding: 0, overflow: 'hidden' }}>
                <img src="/logo.jpg" alt="Logo JSKM" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <h1 className="login-title">Velora</h1>
              <p className="login-subtitle">Absensi Real Time & Komunikasi Cerdas, Aman & Tanpa Batas</p>
            </div>

            <div className="login-actions">
              <button className="btn-phone" onClick={() => setStep('phone_input')} style={{ marginTop: '20px' }}>
                <User size={20} />
                Login Karyawan / Admin
              </button>
            </div>
            
            <p className="login-terms">
              Dengan mendaftar, Anda menyetujui Syarat & Ketentuan serta Kebijakan Privasi Velora.
            </p>
          </div>
        )}

        {step === 'phone_input' && (
          <div className="login-step-phone animate-fade-in">
            <button className="back-btn" onClick={() => setStep('main')}>
              <ArrowLeft size={24} />
            </button>
            
            <h2 className="step-title">Masukkan ID / No HP</h2>
            <p className="step-subtitle">Masukkan User ID atau Nomor Handphone Anda yang terdaftar.</p>
            
            <form onSubmit={handlePhoneSubmit} className="phone-form">
              <div className="phone-input-group">
                <input 
                  type="text" 
                  placeholder="User ID atau 08123..." 
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <button type="submit" className="btn-primary-large" disabled={phoneNumber.length < 6}>
                Lanjutkan
              </button>
            </form>
          </div>
        )}

        {step === 'password_input' && (
          <div className="login-step-otp animate-fade-in">
            <button className="back-btn" onClick={() => setStep('phone_input')}>
              <ArrowLeft size={24} />
            </button>
            
            <h2 className="step-title">Masukkan Password</h2>
            <p className="step-subtitle">Masukkan kata sandi untuk akun +62 {phoneNumber}</p>
            
            <form onSubmit={handlePasswordSubmit} className="phone-form mt-4">
              <div className="phone-input-group" style={{ paddingLeft: '16px' }}>
                <input 
                  type="password" 
                  placeholder="Password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                  required
                  style={{ width: '100%' }}
                />
              </div>
              <button type="submit" className="btn-primary-large mt-6" disabled={!password}>
                Verifikasi & Masuk
              </button>
            </form>
          </div>
        )}

        {step === 'loading' && (
          <div className="login-step-loading animate-fade-in">
            <div className="loader-container">
              <Loader size={48} className="spinner text-accent" />
            </div>
            <h2 className="mt-4">Masuk ke Velora...</h2>
            <p className="text-secondary mt-2">Menyiapkan obrolan Anda</p>
          </div>
        )}

      </div>
    </div>
  );
};

export default LoginScreen;
