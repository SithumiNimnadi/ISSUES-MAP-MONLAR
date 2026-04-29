import React, { useState, useRef, useEffect } from 'react';

function SettingsBar() {
  // Use the contexts from App.js - they are available globally
  const { isDark, toggleTheme } = React.useContext(require('../App').ThemeContext);
  const { language, changeLanguage } = React.useContext(require('../App').LanguageContext);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 1rem',
          background: 'rgba(255, 255, 255, 0.15)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '2rem',
          cursor: 'pointer',
          color: 'white',
          fontWeight: '500',
        }}
      >
        <span>⚙️</span>
        <span>Settings</span>
        <span>▼</span>
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 0.5rem)',
          right: 0,
          minWidth: '220px',
          background: isDark ? '#14141f' : 'white',
          borderRadius: '1rem',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
          border: `1px solid ${isDark ? '#2d2d3f' : '#dee2e6'}`,
          zIndex: 1000,
        }}>
          <div style={{ padding: '1rem' }}>
            <div style={{ fontWeight: '600', marginBottom: '0.75rem', color: isDark ? '#f8f9fa' : '#212529' }}>🌓 Theme</div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={() => !isDark && toggleTheme()}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  border: '2px solid #dee2e6',
                  background: !isDark ? '#2d6a4f' : (isDark ? '#0a0a0f' : '#f8f9fa'),
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  color: !isDark ? 'white' : (isDark ? '#f8f9fa' : '#212529'),
                }}
              >
                ☀️ Light
              </button>
              <button 
                onClick={() => isDark && toggleTheme()}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  border: '2px solid #dee2e6',
                  background: isDark ? '#2d6a4f' : (isDark ? '#0a0a0f' : '#f8f9fa'),
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  color: isDark ? 'white' : (isDark ? '#f8f9fa' : '#212529'),
                }}
              >
                🌙 Dark
              </button>
            </div>
          </div>

          <div style={{ height: '1px', background: isDark ? '#2d2d3f' : '#dee2e6' }}></div>

          <div style={{ padding: '1rem' }}>
            <div style={{ fontWeight: '600', marginBottom: '0.75rem', color: isDark ? '#f8f9fa' : '#212529' }}>🌐 Language</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button 
                onClick={() => changeLanguage('en')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.6rem',
                  border: '2px solid #dee2e6',
                  background: language === 'en' ? '#2d6a4f' : (isDark ? '#0a0a0f' : '#f8f9fa'),
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  color: language === 'en' ? 'white' : (isDark ? '#f8f9fa' : '#212529'),
                }}
              >
                <span>🇬🇧</span> English
              </button>
              <button 
                onClick={() => changeLanguage('si')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.6rem',
                  border: '2px solid #dee2e6',
                  background: language === 'si' ? '#2d6a4f' : (isDark ? '#0a0a0f' : '#f8f9fa'),
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  color: language === 'si' ? 'white' : (isDark ? '#f8f9fa' : '#212529'),
                }}
              >
                <span>🇱🇰</span> සිංහල
              </button>
              <button 
                onClick={() => changeLanguage('ta')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.6rem',
                  border: '2px solid #dee2e6',
                  background: language === 'ta' ? '#2d6a4f' : (isDark ? '#0a0a0f' : '#f8f9fa'),
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  color: language === 'ta' ? 'white' : (isDark ? '#f8f9fa' : '#212529'),
                }}
              >
                <span>🇱🇰</span> தமிழ்
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsBar;