import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminReportsPanel.css';

function AdminReportsPanel({ t }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadReports();
    const interval = setInterval(loadReports, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadReports = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/user-reports');
      setReports(response.data);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status, adminNotes) => {
    try {
      await axios.put(`http://localhost:5001/api/user-reports/${id}/status`, { status, adminNotes });
      loadReports();
      setSelectedReport(null);
      
      const toastEvent = new CustomEvent('showToast', {
        detail: {
          message: `Report status updated to ${status}`,
          type: 'success'
        }
      });
      window.dispatchEvent(toastEvent);
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const deleteReport = async (id) => {
    if (window.confirm('Are you sure you want to delete this report?')) {
      try {
        await axios.delete(`http://localhost:5001/api/user-reports/${id}`);
        loadReports();
        
        const toastEvent = new CustomEvent('showToast', {
          detail: {
            message: 'Report deleted successfully',
            type: 'success'
          }
        });
        window.dispatchEvent(toastEvent);
      } catch (error) {
        console.error('Error deleting report:', error);
      }
    }
  };

  const getStatusConfig = (status) => {
    const config = {
      pending: { class: 'status-pending', icon: '⏳', label: 'Pending', color: '#e67e22' },
      reviewed: { class: 'status-reviewed', icon: '👀', label: 'Reviewed', color: '#3498db' },
      approved: { class: 'status-approved', icon: '✅', label: 'Approved', color: '#27ae60' },
      rejected: { class: 'status-rejected', icon: '❌', label: 'Rejected', color: '#e74c3c' }
    };
    return config[status] || config.pending;
  };

  const filteredReports = reports.filter(report => {
    if (filter !== 'all' && report.status !== filter) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return report.title.toLowerCase().includes(search) ||
             report.reporterName.toLowerCase().includes(search) ||
             report.district.toLowerCase().includes(search) ||
             report.description.toLowerCase().includes(search);
    }
    return true;
  });

  const stats = {
    total: reports.length,
    pending: reports.filter(r => r.status === 'pending').length,
    reviewed: reports.filter(r => r.status === 'reviewed').length,
    approved: reports.filter(r => r.status === 'approved').length,
    rejected: reports.filter(r => r.status === 'rejected').length
  };

  if (loading) {
    return (
      <div className="reports-loading">
        <div className="loading-spinner"></div>
        <p>Loading reports...</p>
      </div>
    );
  }

  return (
    <div className="reports-dashboard">
      {/* Header */}
      <div className="reports-header">
        <div className="header-left">
          <h1>📋 Citizen Reports</h1>
          <p>Review and manage environmental reports from citizens</p>
        </div>
        <button onClick={loadReports} className="refresh-btn">
          🔄 Refresh
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="stats-container">
        <div className="stat-card total" onClick={() => setFilter('all')}>
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <div className="stat-number">{stats.total}</div>
            <div className="stat-label">Total Reports</div>
          </div>
        </div>
        <div className="stat-card pending" onClick={() => setFilter('pending')}>
          <div className="stat-icon">⏳</div>
          <div className="stat-info">
            <div className="stat-number">{stats.pending}</div>
            <div className="stat-label">Pending</div>
          </div>
        </div>
        <div className="stat-card reviewed" onClick={() => setFilter('reviewed')}>
          <div className="stat-icon">👀</div>
          <div className="stat-info">
            <div className="stat-number">{stats.reviewed}</div>
            <div className="stat-label">Reviewed</div>
          </div>
        </div>
        <div className="stat-card approved" onClick={() => setFilter('approved')}>
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <div className="stat-number">{stats.approved}</div>
            <div className="stat-label">Approved</div>
          </div>
        </div>
        <div className="stat-card rejected" onClick={() => setFilter('rejected')}>
          <div className="stat-icon">❌</div>
          <div className="stat-info">
            <div className="stat-number">{stats.rejected}</div>
            <div className="stat-label">Rejected</div>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="search-filter-bar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by title, reporter, location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="clear-search" onClick={() => setSearchTerm('')}>✕</button>
          )}
        </div>
        <div className="filter-tabs">
          <button 
            className={filter === 'all' ? 'active' : ''} 
            onClick={() => setFilter('all')}
          >
            All ({stats.total})
          </button>
          <button 
            className={filter === 'pending' ? 'active' : ''} 
            onClick={() => setFilter('pending')}
          >
            Pending ({stats.pending})
          </button>
          <button 
            className={filter === 'approved' ? 'active' : ''} 
            onClick={() => setFilter('approved')}
          >
            Approved ({stats.approved})
          </button>
        </div>
      </div>

      {/* Reports List */}
      <div className="reports-list">
        {filteredReports.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>No Reports Found</h3>
            <p>No {filter !== 'all' ? filter : ''} reports available</p>
          </div>
        ) : (
          filteredReports.map(report => {
            const status = getStatusConfig(report.status);
            return (
              <div key={report._id} className={`report-item ${status.class}`}>
                <div className="report-item-header">
                  <div className="report-title-section">
                    <h3>{report.title}</h3>
                    <span className={`status-badge ${status.class}`}>
                      {status.icon} {status.label}
                    </span>
                  </div>
                  <div className="report-date">
                    📅 {new Date(report.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="report-item-body">
                  <div className="info-grid">
                    <div className="info-cell">
                      <span className="info-label">📍 Location</span>
                      <span className="info-value">{report.location}, {report.district}</span>
                    </div>
                    <div className="info-cell">
                      <span className="info-label">👤 Reporter</span>
                      <span className="info-value">{report.reporterName}</span>
                    </div>
                    <div className="info-cell">
                      <span className="info-label">📧 Email</span>
                      <span className="info-value">{report.reporterEmail}</span>
                    </div>
                    <div className="info-cell">
                      <span className="info-label">🏷️ Category</span>
                      <span className="info-value">{report.category}</span>
                    </div>
                  </div>

                  <div className="description-section">
                    <span className="info-label">📝 Description</span>
                    <p>{report.description}</p>
                  </div>

                  {report.images && report.images.length > 0 && (
                    <div className="images-section">
                      <span className="info-label">📸 Images ({report.images.length})</span>
                      <div className="image-thumbnails">
                        {report.images.slice(0, 3).map((img, idx) => (
                          <img 
                            key={idx} 
                            src={`http://localhost:5001${img}`} 
                            alt={`Report ${idx}`}
                            onClick={() => window.open(`http://localhost:5001${img}`, '_blank')}
                          />
                        ))}
                        {report.images.length > 3 && (
                          <div className="more-images">+{report.images.length - 3}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {report.adminNotes && (
                    <div className="admin-notes-section">
                      <span className="info-label">📝 Admin Response</span>
                      <div className="admin-notes-content">{report.adminNotes}</div>
                    </div>
                  )}
                </div>

                <div className="report-item-footer">
                  <button className="btn-review" onClick={() => setSelectedReport(report)}>
                    ✏️ Review & Update
                  </button>
                  <button className="btn-delete" onClick={() => deleteReport(report._id)}>
                    🗑️ Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Review Modal */}
      {selectedReport && (
        <div className="modal-overlay" onClick={() => setSelectedReport(null)}>
          <div className="review-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Review Report</h2>
              <button className="modal-close" onClick={() => setSelectedReport(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="modal-info">
                <div className="modal-info-row">
                  <strong>Title:</strong> {selectedReport.title}
                </div>
                <div className="modal-info-row">
                  <strong>Reporter:</strong> {selectedReport.reporterName} ({selectedReport.reporterEmail})
                </div>
                <div className="modal-info-row">
                  <strong>Location:</strong> {selectedReport.location}, {selectedReport.district}
                </div>
                <div className="modal-info-row">
                  <strong>Category:</strong> {selectedReport.category}
                </div>
                <div className="modal-info-row">
                  <strong>Description:</strong>
                  <p>{selectedReport.description}</p>
                </div>
              </div>

              <div className="form-group">
                <label>Status</label>
                <select 
                  value={selectedReport.status} 
                  onChange={(e) => setSelectedReport({...selectedReport, status: e.target.value})}
                  className="status-select"
                >
                  <option value="pending">⏳ Pending Review</option>
                  <option value="reviewed">👀 Reviewed</option>
                  <option value="approved">✅ Approved</option>
                  <option value="rejected">❌ Rejected</option>
                </select>
              </div>

              <div className="form-group">
                <label>Admin Notes (visible to reporter)</label>
                <textarea
                  value={selectedReport.adminNotes || ''}
                  onChange={(e) => setSelectedReport({...selectedReport, adminNotes: e.target.value})}
                  rows="4"
                  placeholder="Add your response or notes here..."
                  className="admin-textarea"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setSelectedReport(null)}>
                Cancel
              </button>
              <button 
                className="btn-save" 
                onClick={() => updateStatus(selectedReport._id, selectedReport.status, selectedReport.adminNotes)}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminReportsPanel;