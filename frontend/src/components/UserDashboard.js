import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './UserDashboard.css';

function UserDashboard({ user, t }) {
  const [citizenReports, setCitizenReports] = useState([]);
  const [environmentalIssues, setEnvironmentalIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [activeTab, setActiveTab] = useState('myReports');
  const [editingReport, setEditingReport] = useState(null);
  const [stats, setStats] = useState({
    reportsTotal: 0,
    reportsPending: 0,
    reportsResolved: 0,
    issuesTotal: 0,
    issuesPending: 0,
    issuesResolved: 0
  });

  const loadUserData = useCallback(async () => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('No token found');
        setLoading(false);
        return;
      }
      
      // 1. Load Citizen Reports (User reported)
      const reportsResponse = await axios.get('http://localhost:5001/api/my-reports', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const citizenReportsData = reportsResponse.data.map(report => ({
        ...report,
        type: 'citizen',
        displayType: 'Citizen Report',
        displayIcon: '📢',
        _id: report._id,
        title: report.title,
        description: report.description,
        status: report.status,
        createdAt: report.createdAt,
        district: report.district,
        location: report.location,
        category: report.category,
        adminNotes: report.adminNotes,
        images: report.images || []
      }));
      
      setCitizenReports(citizenReportsData);
      
      // 2. Load Environmental Issues (Admin published)
      const issuesResponse = await axios.get('http://localhost:5001/api/issues', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const environmentalIssuesData = issuesResponse.data
        .filter(issue => issue.reporterEmail === user.email || issue.reportedBy === user.username)
        .map(issue => ({
          ...issue,
          type: 'environmental',
          displayType: 'Environmental Issue',
          displayIcon: '📋',
          _id: issue._id,
          title: issue.title,
          description: issue.description,
          status: issue.status,
          createdAt: issue.createdAt,
          district: issue.district,
          location: issue.lat && issue.lng ? `${issue.lat}, ${issue.lng}` : issue.district,
          category: issue.category,
          resolution: issue.resolution,
          resolvedBy: issue.resolvedBy,
          resolvedAt: issue.resolvedAt,
          images: issue.images || []
        }));
      
      setEnvironmentalIssues(environmentalIssuesData);
      
      // Calculate stats for reports
      const reportsPending = citizenReportsData.filter(i => i.status === 'pending').length;
      const reportsResolved = citizenReportsData.filter(i => i.status === 'resolved' || i.status === 'approved').length;
      
      // Calculate stats for issues
      const issuesPending = environmentalIssuesData.filter(i => i.status === 'pending').length;
      const issuesResolved = environmentalIssuesData.filter(i => i.status === 'resolved' || i.status === 'approved').length;
      
      setStats({
        reportsTotal: citizenReportsData.length,
        reportsPending,
        reportsResolved,
        issuesTotal: environmentalIssuesData.length,
        issuesPending,
        issuesResolved
      });
      
    } catch (error) {
      console.error('Error loading user data:', error);
      
      const toastEvent = new CustomEvent('showToast', {
        detail: {
          message: '❌ Failed to load your data. Please refresh the page.',
          type: 'error'
        }
      });
      window.dispatchEvent(toastEvent);
    } finally {
      setTimeout(() => {
        setLoading(false);
      }, 500);
    }
  }, [user.email, user.username]);

  // Edit Report function
  const handleEditReport = async (reportId, updatedData) => {
    try {
      const token = localStorage.getItem('token');
      
      console.log('Editing report:', reportId);
      console.log('Updated data:', updatedData);
      
      const response = await axios.put(`http://localhost:5001/api/my-reports/${reportId}`, updatedData, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Edit response:', response.data);
      
      if (response.data.success) {
        await loadUserData();
        setEditingReport(null);
        
        const toastEvent = new CustomEvent('showToast', {
          detail: {
            message: '✅ Report updated successfully!',
            type: 'success'
          }
        });
        window.dispatchEvent(toastEvent);
      } else {
        throw new Error(response.data.error || 'Update failed');
      }
    } catch (error) {
      console.error('Error updating report:', error);
      console.error('Error response:', error.response?.data);
      
      const toastEvent = new CustomEvent('showToast', {
        detail: {
          message: error.response?.data?.error || '❌ Failed to update report',
          type: 'error'
        }
      });
      window.dispatchEvent(toastEvent);
    }
  };

  // Delete Report function
  const handleDeleteReport = async (reportId, reportTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${reportTitle}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      
      console.log('Deleting report:', reportId);
      
      const response = await axios.delete(`http://localhost:5001/api/my-reports/${reportId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('Delete response:', response.data);
      
      if (response.data.success) {
        await loadUserData();
        
        const toastEvent = new CustomEvent('showToast', {
          detail: {
            message: '🗑️ Report deleted successfully!',
            type: 'success'
          }
        });
        window.dispatchEvent(toastEvent);
      } else {
        throw new Error(response.data.error || 'Delete failed');
      }
    } catch (error) {
      console.error('Error deleting report:', error);
      console.error('Error response:', error.response?.data);
      
      const toastEvent = new CustomEvent('showToast', {
        detail: {
          message: error.response?.data?.error || '❌ Failed to delete report',
          type: 'error'
        }
      });
      window.dispatchEvent(toastEvent);
    }
  };

  // Initial load
  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // Listen for new report submissions
  useEffect(() => {
    const handleReportSubmitted = () => {
      loadUserData();
      
      const toastEvent = new CustomEvent('showToast', {
        detail: {
          message: '✅ New report submitted! Refreshing your dashboard...',
          type: 'success'
        }
      });
      window.dispatchEvent(toastEvent);
    };
    
    window.addEventListener('reportSubmitted', handleReportSubmitted);
    
    return () => {
      window.removeEventListener('reportSubmitted', handleReportSubmitted);
    };
  }, [loadUserData]);

  const getStatusBadge = (status) => {
    const badges = {
      pending: { class: 'status-pending', icon: '⏳', text: 'Pending' },
      reviewed: { class: 'status-reviewed', icon: '👀', text: 'Reviewed' },
      approved: { class: 'status-approved', icon: '✅', text: 'Approved' },
      rejected: { class: 'status-rejected', icon: '❌', text: 'Rejected' },
      resolved: { class: 'status-resolved', icon: '✅', text: 'Resolved' }
    };
    return badges[status] || badges.pending;
  };

  const openReportModal = () => {
    const reportBtn = document.querySelector('.report-issue-btn');
    if (reportBtn) {
      reportBtn.click();
    } else {
      window.dispatchEvent(new CustomEvent('openReportModal'));
    }
  };

  const viewDetails = (issue) => {
    setSelectedIssue(issue);
  };

  const closeDetails = () => {
    setSelectedIssue(null);
  };

  const currentData = activeTab === 'myReports' ? citizenReports : environmentalIssues;
  const currentStats = activeTab === 'myReports' 
    ? { total: stats.reportsTotal, pending: stats.reportsPending, resolved: stats.reportsResolved }
    : { total: stats.issuesTotal, pending: stats.issuesPending, resolved: stats.issuesResolved };

  if (loading && citizenReports.length === 0 && environmentalIssues.length === 0) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading your data...</p>
      </div>
    );
  }

  return (
    <div className="user-dashboard">
      <div className="dashboard-header">
        <div className="welcome-section">
          <h1>👋 Welcome back, {user.username}!</h1>
          <p>Track your environmental contributions</p>
        </div>
        
        <div className="dashboard-stats">
          <div className="stat-card total">
            <div className="stat-icon">📊</div>
            <div className="stat-info">
              <h3>{stats.reportsTotal + stats.issuesTotal}</h3>
              <span>Total Contributions</span>
            </div>
          </div>
          <div className="stat-card pending" onClick={() => setActiveTab('myReports')} style={{ cursor: 'pointer' }}>
            <div className="stat-icon">📢</div>
            <div className="stat-info">
              <h3>{stats.reportsTotal}</h3>
              <span>My Reports</span>
            </div>
          </div>
          <div className="stat-card issues" onClick={() => setActiveTab('myIssues')} style={{ cursor: 'pointer' }}>
            <div className="stat-icon">📋</div>
            <div className="stat-info">
              <h3>{stats.issuesTotal}</h3>
              <span>My Issues</span>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-tabs">
        <button 
          className={`tab-btn ${activeTab === 'myReports' ? 'active' : ''}`}
          onClick={() => setActiveTab('myReports')}
        >
          📢 My Reports ({stats.reportsTotal})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'myIssues' ? 'active' : ''}`}
          onClick={() => setActiveTab('myIssues')}
        >
          📋 My Issues ({stats.issuesTotal})
        </button>
      </div>

      <div className="tab-stats">
        <div className="tab-stat-card pending">
          <span className="stat-label">Pending</span>
          <span className="stat-number">{currentStats.pending}</span>
        </div>
        <div className="tab-stat-card resolved">
          <span className="stat-label">Resolved/Approved</span>
          <span className="stat-number">{currentStats.resolved}</span>
        </div>
      </div>

      <div className="filter-buttons">
        <button className="refresh-btn" onClick={() => loadUserData()}>
          🔄 Refresh
        </button>
        <button className="report-now-btn-header" onClick={openReportModal}>
          📢 Report New Issue
        </button>
      </div>

      <div className="issues-section">
        {currentData.length === 0 ? (
          <div className="no-issues">
            <div className="empty-icon">{activeTab === 'myReports' ? '📢' : '📋'}</div>
            <h3>No {activeTab === 'myReports' ? 'Reports' : 'Issues'} Yet</h3>
            <p>You haven't {activeTab === 'myReports' ? 'submitted any reports' : 'been assigned any issues'} yet.</p>
            {activeTab === 'myReports' && (
              <button className="report-now-btn" onClick={openReportModal}>
                📢 Report an Issue Now
              </button>
            )}
          </div>
        ) : (
          <div className="issues-grid">
            {currentData.map(issue => {
              const status = getStatusBadge(issue.status);
              const canEditDelete = activeTab === 'myReports' && issue.status === 'pending';
              
              return (
                <div key={issue._id} className={`issue-card ${issue.status}`}>
                  <div className="issue-header">
                    <div className="issue-type">
                      <span className="type-icon">{issue.displayIcon}</span>
                      <span className="type-label">{issue.displayType}</span>
                    </div>
                    <span className={`status-badge ${status.class}`}>
                      {status.icon} {status.text}
                    </span>
                  </div>
                  
                  <div className="issue-body">
                    <h3>{issue.title}</h3>
                    <p className="issue-description">{issue.description?.substring(0, 120) || ''}{issue.description?.length > 120 ? '...' : ''}</p>
                    
                    <div className="issue-meta">
                      <span>📍 {issue.district || issue.location}</span>
                      <span>📅 {new Date(issue.createdAt).toLocaleDateString()}</span>
                      {issue.category && <span>🏷️ {issue.category}</span>}
                    </div>
                    
                    {issue.adminNotes && (
                      <div className="admin-note">
                        <strong>📝 Admin Response:</strong>
                        <p>{issue.adminNotes}</p>
                      </div>
                    )}
                    
                    {issue.resolution && (
                      <div className="resolution-note">
                        <strong>✅ Resolution:</strong>
                        <p>{issue.resolution}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="issue-footer">
                    <button className="view-details-btn" onClick={() => viewDetails(issue)}>
                      View Details →
                    </button>
                    {canEditDelete && (
                      <>
                        <button 
                          className="edit-btn" 
                          onClick={() => setEditingReport(issue)}
                        >
                          ✏️ Edit
                        </button>
                        <button 
                          className="delete-btn" 
                          onClick={() => handleDeleteReport(issue._id, issue.title)}
                        >
                          🗑️ Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Report Modal - Fixed Version */}
      {editingReport && (
        <div className="modal-overlay" onClick={() => setEditingReport(null)}>
          <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="edit-modal-header">
              <h3>✏️ Edit Report</h3>
              <button className="close-modal" onClick={() => setEditingReport(null)}>×</button>
            </div>
            <div className="edit-modal-body">
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  id="edit-title"
                  defaultValue={editingReport.title}
                  placeholder="Enter title"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  id="edit-description"
                  defaultValue={editingReport.description}
                  rows="4"
                  placeholder="Enter description"
                />
              </div>
              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  id="edit-location"
                  defaultValue={editingReport.location}
                  placeholder="Enter location"
                />
              </div>
              <div className="form-group">
                <label>District</label>
                <input
                  type="text"
                  id="edit-district"
                  defaultValue={editingReport.district}
                  placeholder="Enter district"
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select id="edit-category" defaultValue={editingReport.category}>
                  <option value="Waste & Pollution">Waste & Pollution</option>
                  <option value="Deforestation">Deforestation</option>
                  <option value="Water Contamination">Water Contamination</option>
                  <option value="Air Pollution">Air Pollution</option>
                  <option value="Soil Erosion">Soil Erosion</option>
                  <option value="Wildlife Conflict">Wildlife Conflict</option>
                  <option value="Climate Change">Climate Change</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div className="edit-modal-footer">
              <button className="cancel-btn" onClick={() => setEditingReport(null)}>Cancel</button>
              <button 
                className="save-btn" 
                onClick={() => {
                  const updatedData = {
                    title: document.getElementById('edit-title').value,
                    description: document.getElementById('edit-description').value,
                    location: document.getElementById('edit-location').value,
                    district: document.getElementById('edit-district').value,
                    category: document.getElementById('edit-category').value
                  };
                  handleEditReport(editingReport._id, updatedData);
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedIssue && (
        <div className="modal-overlay" onClick={closeDetails}>
          <div className="details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <span className="type-icon">{selectedIssue.displayIcon}</span>
                <h3>{selectedIssue.title}</h3>
              </div>
              <button className="close-modal" onClick={closeDetails}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-row">
                <strong>Type:</strong>
                <span className="type-badge">{selectedIssue.displayType}</span>
              </div>
              
              <div className="detail-row">
                <strong>Status:</strong>
                <span className={`status-badge ${getStatusBadge(selectedIssue.status).class}`}>
                  {getStatusBadge(selectedIssue.status).icon} {getStatusBadge(selectedIssue.status).text}
                </span>
              </div>
              
              {selectedIssue.category && (
                <div className="detail-row">
                  <strong>Category:</strong> {selectedIssue.category}
                </div>
              )}
              
              <div className="detail-row">
                <strong>Location:</strong> {selectedIssue.location || selectedIssue.district}
              </div>
              
              <div className="detail-row">
                <strong>Reported On:</strong> {new Date(selectedIssue.createdAt).toLocaleString()}
              </div>
              
              <div className="detail-row">
                <strong>Description:</strong>
                <p>{selectedIssue.description}</p>
              </div>
              
              {selectedIssue.images && selectedIssue.images.length > 0 && (
                <div className="detail-row">
                  <strong>Images ({selectedIssue.images.length}):</strong>
                  <div className="modal-images">
                    {selectedIssue.images.map((img, idx) => (
                      <img 
                        key={idx} 
                        src={`http://localhost:5001${img}`} 
                        alt={`Image ${idx}`}
                        onClick={() => window.open(`http://localhost:5001${img}`, '_blank')}
                      />
                    ))}
                  </div>
                </div>
              )}
              
              {selectedIssue.adminNotes && (
                <div className="detail-row admin-notes">
                  <strong>Admin Response:</strong>
                  <p>{selectedIssue.adminNotes}</p>
                </div>
              )}
              
              {selectedIssue.resolution && (
                <div className="detail-row resolution-notes">
                  <strong>Resolution:</strong>
                  <p>{selectedIssue.resolution}</p>
                  {selectedIssue.resolvedBy && (
                    <small>Resolved by: {selectedIssue.resolvedBy}</small>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={closeDetails} className="close-btn">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserDashboard;