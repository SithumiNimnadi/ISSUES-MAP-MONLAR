import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { fetchIssues, fetchResearch } from '../services/api';
import './AdminDashboard.css';

function AdminDashboard({ user, t }) {
  const [stats, setStats] = useState({
    totalIssues: 0,
    resolvedIssues: 0,
    pendingIssues: 0,
    totalResearch: 0,
    totalUsers: 0,
    userReports: 0,
    pendingReports: 0
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [error, setError] = useState(null);

  const loadDashboardData = useCallback(async () => {
    try {
      setError(null);
      
      // Use the API service functions
      const [issuesRes, researchRes] = await Promise.all([
        fetchIssues(),
        fetchResearch()
      ]);
      
      const issues = issuesRes.data || [];
      const research = researchRes.data || [];
      
      // Fetch user reports directly with token
      const token = localStorage.getItem('token');
      const reportsRes = await axios.get('http://localhost:5001/api/user-reports', {
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(err => ({ data: [] }));
      
      const userReports = reportsRes.data || [];
      
      // Calculate stats
      const totalIssues = issues.length;
      const resolvedIssues = issues.filter(i => i.status === 'resolved').length;
      const pendingIssues = issues.filter(i => i.status === 'pending').length;
      const totalResearch = research.length;
      const userReportsCount = userReports.length;
      const pendingReports = userReports.filter(r => r.status === 'pending').length;
      
      setStats({
        totalIssues,
        resolvedIssues,
        pendingIssues,
        totalResearch,
        totalUsers: 1,
        userReports: userReportsCount,
        pendingReports
      });
      
      setReports(userReports.slice(0, 5));
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRecentActivities = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5001/api/notifications/recent', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setRecentActivities(response.data.slice(0, 10));
    } catch (error) {
      console.error('Error loading activities:', error);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
    loadRecentActivities();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadDashboardData();
      loadRecentActivities();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [loadDashboardData, loadRecentActivities]);

  const getActivityIcon = (type) => {
    const icons = {
      new_issue: '📋',
      issue_resolved: '✅',
      new_research: '🔬',
      connection_made: '🔗',
      new_user_report: '📢',
      report_reviewed: '👀'
    };
    return icons[type] || '📌';
  };

  // Navigation functions
  const goToReportForm = () => {
    const reportTab = document.querySelector('.nav-tabs button:nth-child(3)');
    if (reportTab) reportTab.click();
  };

  const goToResearchForm = () => {
    const researchTab = document.querySelector('.nav-tabs button:nth-child(4)');
    if (researchTab) researchTab.click();
    setTimeout(() => {
      const addBtn = document.querySelector('.add-research-btn');
      if (addBtn) addBtn.click();
    }, 100);
  };

  const goToUserReports = () => {
    const reportsTab = Array.from(document.querySelectorAll('.nav-tabs button')).find(
      btn => btn.textContent.includes('User Reports')
    );
    if (reportsTab) reportsTab.click();
  };

  const goToIssues = () => {
    const issuesTab = document.querySelector('.nav-tabs button:nth-child(2)');
    if (issuesTab) issuesTab.click();
  };

  const goToNotifications = () => {
    const bellBtn = document.querySelector('.notification-bell-btn');
    if (bellBtn) bellBtn.click();
  };

  if (loading) {
    return (
      <div className="admin-dashboard-loading">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard-error">
        <div className="error-icon">⚠️</div>
        <h3>Error Loading Dashboard</h3>
        <p>{error}</p>
        <button onClick={() => window.location.reload()} className="retry-btn">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <div className="welcome-section">
          <h1>👑 Welcome, {user?.username || 'Admin'}!</h1>
          <p>Monitor and manage environmental issues, research, and user reports</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card primary" onClick={goToIssues} style={{ cursor: 'pointer' }}>
          <div className="stat-icon">📋</div>
          <div className="stat-info">
            <h3>{stats.totalIssues}</h3>
            <span>Total Issues</span>
          </div>
        </div>
        <div className="stat-card success" onClick={goToIssues} style={{ cursor: 'pointer' }}>
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <h3>{stats.resolvedIssues}</h3>
            <span>Resolved Issues</span>
          </div>
        </div>
        <div className="stat-card warning" onClick={goToIssues} style={{ cursor: 'pointer' }}>
          <div className="stat-icon">⏳</div>
          <div className="stat-info">
            <h3>{stats.pendingIssues}</h3>
            <span>Pending Issues</span>
          </div>
        </div>
        <div className="stat-card info" onClick={() => {
          const researchTab = document.querySelector('.nav-tabs button:nth-child(4)');
          if (researchTab) researchTab.click();
        }} style={{ cursor: 'pointer' }}>
          <div className="stat-icon">🔬</div>
          <div className="stat-info">
            <h3>{stats.totalResearch}</h3>
            <span>Research Papers</span>
          </div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <h3>{stats.totalUsers}</h3>
            <span>Total Users</span>
          </div>
        </div>
        <div className="stat-card orange" onClick={goToUserReports} style={{ cursor: 'pointer' }}>
          <div className="stat-icon">📢</div>
          <div className="stat-info">
            <h3>{stats.userReports}</h3>
            <span>User Reports</span>
            {stats.pendingReports > 0 && (
              <div className="badge-pending">{stats.pendingReports} pending</div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h2>⚡ Quick Actions</h2>
        <div className="actions-grid">
          <button className="action-btn" onClick={goToReportForm}>
            <span>📸</span> Create Issue
          </button>
          <button className="action-btn" onClick={goToResearchForm}>
            <span>🔬</span> Add Research
          </button>
          <button className="action-btn" onClick={goToUserReports}>
            <span>📢</span> Review Reports
          </button>
          <button className="action-btn" onClick={goToIssues}>
            <span>📋</span> View Issues
          </button>
          <button className="action-btn" onClick={() => window.location.reload()}>
            <span>🔄</span> Refresh
          </button>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="dashboard-two-columns">
        {/* Recent User Reports */}
        <div className="dashboard-card">
          <div className="card-header">
            <h2>📢 Recent User Reports</h2>
            <button className="view-all-btn" onClick={goToUserReports}>
              View All →
            </button>
          </div>
          <div className="card-content">
            {reports.length === 0 ? (
              <div className="empty-state">
                <span>📭</span>
                <p>No user reports yet</p>
              </div>
            ) : (
              reports.map(report => (
                <div key={report._id} className="report-item" onClick={() => goToUserReports()} style={{ cursor: 'pointer' }}>
                  <div className="report-item-header">
                    <span className="report-title">{report.title}</span>
                    <span className={`status-badge-small status-${report.status}`}>
                      {report.status}
                    </span>
                  </div>
                  <div className="report-item-details">
                    <span>👤 {report.reporterName}</span>
                    <span>📍 {report.district}</span>
                    <span>📅 {new Date(report.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activities */}
        <div className="dashboard-card">
          <div className="card-header">
            <h2>🔄 Recent Activities</h2>
            <button className="view-all-btn" onClick={goToNotifications}>
              View All →
            </button>
          </div>
          <div className="card-content activities-list">
            {recentActivities.length === 0 ? (
              <div className="empty-state">
                <span>🔕</span>
                <p>No recent activities</p>
              </div>
            ) : (
              recentActivities.map((activity, idx) => (
                <div key={idx} className="activity-item">
                  <div className="activity-icon">{getActivityIcon(activity.type)}</div>
                  <div className="activity-details">
                    <div className="activity-title">{activity.title}</div>
                    <div className="activity-message">{activity.message}</div>
                    <div className="activity-time">
                      {new Date(activity.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;