import React, { useState, useEffect, useRef, useCallback } from 'react';
import Map from './components/Map';
import IssuesList from './components/IssuesList';
import ResearchPanel from './components/ResearchPanel';
import ReportForm from './components/ReportForm';
import DatabaseViewer from './components/DatabaseViewer';
import ToastNotification from './components/ToastNotification';
import NotificationBell from './components/NotificationBell';
import AuthModal from './components/AuthModal';
import UserReportForm from './components/UserReportForm';
import AdminReportsPanel from './components/AdminReportsPanel';
import UserDashboard from './components/UserDashboard';
import AdminDashboard from './components/AdminDashboard';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import './components/Map.css';
import { fetchIssues, createIssue, deleteIssue, testConnection } from './services/api';
import axios from 'axios';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import notificationService from './services/notificationService';
import eventBridge from './services/eventBridge';
import './App.css';


// Main App content that uses language and auth
function AppContent() {
  const { language, t, changeLanguage } = useLanguage();
  const { user, isAdmin, logout, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('map');
  const [issues, setIssues] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark';
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserReportModal, setShowUserReportModal] = useState(false);
  
  // State for user reports count
  const [userReportsCount, setUserReportsCount] = useState(0);
  
  // Toast notification state
  const [toast, setToast] = useState({
    show: false,
    message: '',
    type: 'info'
  });

  // Apply theme
  useEffect(() => {
    if (isDark) {
      document.body.classList.add('dark');
      document.body.classList.remove('light');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.add('light');
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  // Global toast listener
  useEffect(() => {
    const handleToast = (event) => {
      setToast({
        show: true,
        message: event.detail.message,
        type: event.detail.type || 'info'
      });
      
      setTimeout(() => {
        setToast(prev => ({ ...prev, show: false }));
      }, 3000);
    };
    
    window.addEventListener('showToast', handleToast);
    return () => window.removeEventListener('showToast', handleToast);
  }, []);

  // Setup notifications and backend connection
  useEffect(() => {
    const timer = setTimeout(async () => {
      const hasAsked = localStorage.getItem('notificationPermissionAsked');
      if (!hasAsked && "Notification" in window) {
        await notificationService.requestPermission();
        localStorage.setItem('notificationPermissionAsked', 'true');
      }
    }, 3000);
    
    eventBridge.setupSSE();
    
    return () => {
      eventBridge.disconnect();
      clearTimeout(timer);
    };
  }, []);

  // Function to load user reports count - wrapped with useCallback
  const loadUserReportsCount = useCallback(async () => {
    if (isAdmin()) {
      try {
        const response = await axios.get('http://localhost:5001/api/user-reports');
        setUserReportsCount(response.data.length);
      } catch (error) {
        console.error('Error loading reports count:', error);
      }
    }
  }, [isAdmin]);

  // Check backend connection
  const checkBackend = async () => {
    try {
      await testConnection();
      setBackendStatus('connected');
      console.log('Backend is connected');
      notificationService.success('Connected to backend server', 'Backend Connected');
    } catch (error) {
      setBackendStatus('disconnected');
      console.error('Backend connection failed:', error);
      notificationService.error('Cannot connect to backend server', 'Connection Failed');
    }
  };

  const loadIssues = async () => {
    console.log('🔄 loadIssues called - fetching issues from backend...');
    try {
      const response = await fetchIssues();
      console.log('✅ Received issues:', response.data.length);
      setIssues(response.data);
    } catch (error) {
      console.error('Error loading issues:', error);
      if (error.code === 'ECONNREFUSED') {
        setBackendStatus('disconnected');
      }
      if (error.response?.status === 401) {
        setShowAuthModal(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      checkBackend();
      loadIssues();
      // Load user reports count for admin
      if (isAdmin()) {
        loadUserReportsCount();
      }
    } else if (!authLoading) {
      setLoading(false);
      setShowAuthModal(true);
    }
  }, [user, authLoading, isAdmin, loadUserReportsCount]);

  // Handle map click with district detection
  const handleMapClick = (locationData) => {
    setSelectedLocation(locationData);
    const message = t('districtSelected', { district: locationData.district });
    notificationService.notify(message, '📍 Location Selected', 'success');
    
    setTimeout(() => {
      setActiveTab('report');
    }, 500);
  };

  const addIssue = async (formData) => {
    if (!formData.get('lat') || !formData.get('lng')) {
      notificationService.warning(t('noLocation'), '⚠️ Location Required');
      return false;
    }
    
    if (!formData.get('title') || !formData.get('description') || !formData.get('district')) {
      notificationService.warning(t('fillFields'), '⚠️ Missing Fields');
      return false;
    }
    
    try {
      const response = await createIssue(formData);
      
      if (response.status === 201 || response.status === 200) {
        await loadIssues();
        
        const title = formData.get('title');
        const district = formData.get('district');
        notificationService.success(
          `"${title}" has been reported in ${district}`,
          '✅ Issue Reported'
        );
        
        setActiveTab('issues');
        setSelectedLocation(null);
        return true;
      } else {
        throw new Error('Unexpected response status: ' + response.status);
      }
    } catch (error) {
      console.error('Error adding issue:', error);
      
      let errorMessage = t('error');
      
      if (error.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED')) {
        errorMessage = t('backendError');
        setBackendStatus('disconnected');
      } else if (error.response) {
        errorMessage = error.response.data?.error || error.response.data?.message || t('error');
      } else if (error.request) {
        errorMessage = 'No response from server. ' + t('backendError');
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      notificationService.error(errorMessage, '❌ Submission Failed');
      return false;
    }
  };

  const deleteIssueHandler = async (id) => {
    if (!isAdmin()) {
      notificationService.error('Only admins can delete issues', 'Permission Denied');
      return;
    }
    
    if (window.confirm(t('deleteConfirm'))) {
      try {
        const issueToDelete = issues.find(i => i._id === id);
        await deleteIssue(id);
        await loadIssues();
        
        notificationService.success(
          `${issueToDelete?.title || 'Issue'} has been deleted`,
          '🗑️ Issue Deleted'
        );
      } catch (error) {
        console.error('Error deleting issue:', error);
        let errorMessage = t('deleteError');
        if (error.code === 'ECONNREFUSED') {
          errorMessage = t('backendError');
        }
        notificationService.error(errorMessage, '❌ Delete Failed');
      }
    }
  };

  const resolveIssueHandler = async (id, resolutionNotes) => {
    if (!isAdmin()) {
      notificationService.error('Only admins can resolve issues', 'Permission Denied');
      return;
    }
    
    try {
      const issueToResolve = issues.find(i => i._id === id);
      const response = await axios.put(`http://localhost:5001/api/issues/${id}/resolve`, {
        resolutionNotes: resolutionNotes,
        resolvedBy: user?.username || 'Admin'
      });
      
      if (response.status === 200) {
        await loadIssues();
        
        notificationService.success(
          `${issueToResolve?.title || 'Issue'} has been marked as resolved!`,
          '✅ Issue Resolved'
        );
      }
    } catch (error) {
      console.error('Error resolving issue:', error);
      notificationService.error(t('resolveError'), '❌ Resolve Failed');
    }
  };

  const editIssueHandler = async (id, updatedData) => {
    if (!isAdmin()) {
      notificationService.error('Only admins can edit issues', 'Permission Denied');
      return false;
    }
    
    try {
      const response = await axios.put(`http://localhost:5001/api/issues/${id}`, updatedData);
      if (response.status === 200) {
        await loadIssues();
        
        notificationService.success(
          `Issue has been updated successfully`,
          '✏️ Issue Updated'
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error editing issue:', error);
      notificationService.error(t('editError'), '❌ Update Failed');
      return false;
    }
  };

  const connectResearchToIssue = async (issueId, researchId) => {
    if (!isAdmin()) {
      notificationService.error('Only admins can connect research to issues', 'Permission Denied');
      return;
    }
    
    try {
      await axios.post(`http://localhost:5001/api/research/${researchId}/connect-issue/${issueId}`);
      await axios.post(`http://localhost:5001/api/issues/${issueId}/connect-research/${researchId}`);
      await loadIssues();
      
      notificationService.success(
        'Research connected to issue successfully!',
        '🔗 Connection Made'
      );
    } catch (error) {
      console.error('Error connecting:', error);
      notificationService.error('Failed to connect research to issue', '❌ Connection Failed');
    }
  };

  const goToMapTab = () => setActiveTab('map');
  const toggleTheme = () => setIsDark(!isDark);

  if (authLoading || loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '1.5rem', color: '#2d6a4f' }}>
        🌿 {t('loading')}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="auth-screen">
        <div className="auth-container">
          <div className="auth-logo">
            <i className="fas fa-leaf"></i>
            <h1>Eco Guardian</h1>
            <p>Environmental Issue Reporting System - Sri Lanka</p>
          </div>
          <button onClick={() => setShowAuthModal(true)} className="login-btn">
            Login / Register
          </button>
        </div>
        {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      </div>
    );
  }

  return (
    <div className="app">
    <nav className="navbar">
    <div className="logo">
    <i className="fas fa-leaf"></i>
    <span>{t('appName')}</span>
    <small>Sri Lanka</small>
    </div>
  
  {/* Clickable User Info - Goes to Dashboard */}
  <div 
    className="user-info" 
    onClick={() => {
      if (isAdmin()) {
        setActiveTab('admin-dashboard');
      } else {
        setActiveTab('dashboard');
      }
    }} 
    style={{ cursor: 'pointer' }}
  >
    <span className="user-role">{user.role === 'admin' ? '👑 Admin' : '👤 User'}</span>
    <span className="user-name">{user.username}</span>
    <button 
      onClick={(e) => {
        e.stopPropagation();
        logout();
      }} 
      className="logout-btn"
    >
      Logout
    </button>
  </div>
  
  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
    <div className="nav-tabs">
      {/* 1. Map - Always first */}
      <button onClick={() => setActiveTab('map')} className={activeTab === 'map' ? 'active' : ''}>
        🗺️ {t('map')}
      </button>
      
      {/* 2. Issues - Second (unchanged) */}
      <button onClick={() => setActiveTab('issues')} className={activeTab === 'issues' ? 'active' : ''}>
        📋 {t('issues')} ({issues.length})
      </button>
      
       {/* 4. Research - Fourth (moved after Report) */}
      <button onClick={() => setActiveTab('research')} className={activeTab === 'research' ? 'active' : ''}>
        🔬 {t('research')}
      </button>

      {/* 3. Report - NOW THIRD (moved before Research) */}
      {isAdmin() && (
        <button onClick={() => setActiveTab('report')} className={activeTab === 'report' ? 'active' : ''}>
          📸 {t('report')}
        </button>
      )}
      
      {/* 5. Database - Only for admin (unchanged) */}
      {isAdmin() && (
        <button onClick={() => setActiveTab('database')} className={activeTab === 'database' ? 'active' : ''}>
          🗄️ {t('database')}
        </button>
      )}
      
      {/* 6. User Reports - Only for admin (unchanged) */}
      {isAdmin() && (
        <button 
          onClick={() => setActiveTab('admin-reports')} 
          className={activeTab === 'admin-reports' ? 'active' : ''}
        >
          📢 User Reports ({userReportsCount})
        </button>
      )}
      
      {/* 7. Report Issue Button - Only for regular users (unchanged) */}
      {!isAdmin() && (
        <button 
          onClick={() => setShowUserReportModal(true)} 
          className="report-issue-btn"
          style={{
            background: '#e67e22',
            border: 'none',
            padding: '8px 20px',
            borderRadius: '30px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '0.9rem',
            transition: 'all 0.3s',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => e.target.style.background = '#d35400'}
          onMouseLeave={(e) => e.target.style.background = '#e67e22'}
        >
          📢 Report Issue
        </button>
      )}
    </div>
    
    <NotificationBell t={t} />
    <SettingsDropdown isDark={isDark} toggleTheme={toggleTheme} language={language} changeLanguage={changeLanguage} t={t} />
  </div>
</nav>

      {backendStatus === 'disconnected' && (
        <div style={{
          background: '#e74c3c',
          color: 'white',
          padding: '10px',
          textAlign: 'center',
          fontSize: '14px',
          position: 'sticky',
          top: 0,
          zIndex: 999
        }}>
          ⚠️ {t('backendError')}
        </div>
      )}

      {toast.show && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}

      <div className="main">
        {activeTab === 'map' && (
          <Map 
            issues={issues} 
            onMapClick={handleMapClick} 
            language={language} 
            t={t} 
            isAdmin={isAdmin()} 
          />
        )}
        
        {/* User Dashboard */}
        {activeTab === 'dashboard' && !isAdmin() && <UserDashboard user={user} t={t} />}
        
        {/* Admin Dashboard */}
        {activeTab === 'admin-dashboard' && isAdmin() && <AdminDashboard user={user} t={t} />}
        
        {activeTab === 'report' && isAdmin() && (
          <ReportForm 
            selectedLocation={selectedLocation} 
            onSubmit={addIssue} 
            onGoToMap={goToMapTab}
            language={language}
            t={t}
          />
        )}
        
        {activeTab === 'issues' && (
          <IssuesList
            issues={issues}
            onDelete={deleteIssueHandler}
            onResolve={resolveIssueHandler}
            onConnectResearch={connectResearchToIssue}
            onEditIssue={editIssueHandler}
            onRefreshIssues={loadIssues}
            language={language}
            t={t}
            isAdmin={isAdmin()}
          />
        )}
        
        {activeTab === 'research' && <ResearchPanel language={language} t={t} isAdmin={isAdmin()} />}
        
        {activeTab === 'database' && isAdmin() && <DatabaseViewer language={language} t={t} />}
        
        {/* Admin Reports Panel - Only visible to admin */}
        {activeTab === 'admin-reports' && isAdmin() && <AdminReportsPanel language={language} t={t} />}
      </div>

      {/* User Report Modal - Only visible to REGULAR USERS */}
      {!isAdmin() && showUserReportModal && (
        <UserReportForm onClose={() => setShowUserReportModal(false)} t={t} />
      )}
    </div>
  );
}

// Settings Dropdown Component
function SettingsDropdown({ isDark, toggleTheme, language, changeLanguage, t }) {
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
        <span>{t('settings')}</span>
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
            <div style={{ fontWeight: '600', marginBottom: '0.75rem', color: isDark ? '#f8f9fa' : '#212529' }}>{t('theme')}</div>
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
                  color: !isDark ? 'white' : (isDark ? '#f8f9fa' : '#212529') 
                }}
              >
                ☀️ {t('light')}
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
                  color: isDark ? 'white' : (isDark ? '#f8f9fa' : '#212529') 
                }}
              >
                🌙 {t('dark')}
              </button>
            </div>
          </div>
          <div style={{ height: '1px', background: isDark ? '#2d2d3f' : '#dee2e6' }}></div>
          <div style={{ padding: '1rem' }}>
            <div style={{ fontWeight: '600', marginBottom: '0.75rem', color: isDark ? '#f8f9fa' : '#212529' }}>{t('language')}</div>
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
                  color: language === 'en' ? 'white' : (isDark ? '#f8f9fa' : '#212529') 
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
                  color: language === 'si' ? 'white' : (isDark ? '#f8f9fa' : '#212529') 
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
                  color: language === 'ta' ? 'white' : (isDark ? '#f8f9fa' : '#212529') 
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

// Wrap App with LanguageProvider and AuthProvider
function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;