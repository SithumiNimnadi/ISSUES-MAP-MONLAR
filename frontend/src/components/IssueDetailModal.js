import React, { useEffect } from 'react';
import './IssueDetailModal.css';

const IssueDetailModal = ({ issue, onClose }) => {
  // Always call hooks at the top level, never conditionally
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Function to navigate to issues list
  const goToIssuesList = () => {
    // Find and click the Issues tab button (3rd button in nav-tabs)
    const issuesTabButton = document.querySelector('.nav-tabs button:nth-child(3)');
    if (issuesTabButton) {
      issuesTabButton.click();
    }
    // Close the modal
    onClose();
    
    // Optional: Store the issue ID to highlight it in the issues list
    sessionStorage.setItem('highlightIssueId', issue._id);
    
    // Show a toast notification
    const toastEvent = new CustomEvent('showToast', {
      detail: {
        message: `📍 Navigating to: ${issue.title}`,
        type: 'info'
      }
    });
    window.dispatchEvent(toastEvent);
  };

  // Return null if no issue (after all hooks)
  if (!issue) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{issue.title}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="detail-section">
            <label>Category:</label>
            <span className="category-badge">
              {issue.category}
            </span>
          </div>
          
          <div className="detail-section">
            <label>Status:</label>
            <span className={`status-badge ${issue.status}`}>
              {issue.status === 'resolved' ? '✅ Resolved' : '⏳ Pending'}
            </span>
          </div>
          
          <div className="detail-section">
            <label>Location:</label>
            <div className="location-info">
              <span>📍 {issue.district || 'Unknown District'}</span>
              <small>Lat: {issue.lat?.toFixed(6)}, Lng: {issue.lng?.toFixed(6)}</small>
            </div>
          </div>
          
          <div className="detail-section">
            <label>Reported On:</label>
            <span>📅 {new Date(issue.createdAt).toLocaleString()}</span>
          </div>
          
          <div className="detail-section">
            <label>Description:</label>
            <p className="description-text">{issue.description}</p>
          </div>
          
          {issue.resolvedAt && (
            <div className="detail-section">
              <label>Resolved On:</label>
              <span>✅ {new Date(issue.resolvedAt).toLocaleString()}</span>
            </div>
          )}
          
          {issue.resolutionNotes && (
            <div className="detail-section">
              <label>Resolution Notes:</label>
              <p className="resolution-text">{issue.resolutionNotes}</p>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="go-to-list-btn" onClick={goToIssuesList}>
            📋 View Issues List
          </button>
          <button className="close-modal-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default IssueDetailModal;