import React, { useEffect } from 'react';
import './IssueDetailModal.css';

const IssueDetailModal = ({ issue, onClose }) => {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const goToIssuesList = () => {
    // Close modal first
    onClose();
    
    // Store the issue ID for highlighting BEFORE navigating
    sessionStorage.setItem('highlightIssueId', issue._id);
    sessionStorage.setItem('scrollToIssueId', issue._id);
    sessionStorage.setItem('forceHighlight', 'true');
    sessionStorage.setItem('targetTitle', issue.title);
    
    // Find and click Issues tab (3rd button)
    const issuesTabButton = document.querySelector('.nav-tabs button:nth-child(2)');
    if (issuesTabButton) {
      issuesTabButton.click();
    }
    
    // Show toast
    const toastEvent = new CustomEvent('showToast', {
      detail: {
        message: `📍 Opening: ${issue.title.substring(0, 50)}...`,
        type: 'info'
      }
    });
    window.dispatchEvent(toastEvent);
    
    // Find and highlight after navigation
    let attempts = 0;
    const maxAttempts = 30;
    
    const findAndHighlight = setInterval(() => {
      attempts++;
      const targetElement = document.getElementById(`issue-${issue._id}`);
      
      if (targetElement) {
        clearInterval(findAndHighlight);
        
        document.querySelectorAll('.issue-card.highlighted').forEach(card => {
          card.classList.remove('highlighted');
        });
        
        targetElement.classList.add('highlighted');
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        let flashCount = 0;
        const flashInterval = setInterval(() => {
          if (flashCount >= 3) {
            clearInterval(flashInterval);
            setTimeout(() => {
              targetElement.classList.remove('highlighted');
            }, 2000);
          } else {
            targetElement.style.transform = 'scale(1.02)';
            setTimeout(() => {
              if (targetElement) targetElement.style.transform = '';
            }, 150);
            flashCount++;
          }
        }, 300);
        
        const successEvent = new CustomEvent('showToast', {
          detail: { message: `✅ Found: ${issue.title}`, type: 'success' }
        });
        window.dispatchEvent(successEvent);
        
        sessionStorage.removeItem('highlightIssueId');
        sessionStorage.removeItem('scrollToIssueId');
        sessionStorage.removeItem('forceHighlight');
        sessionStorage.removeItem('targetTitle');
      } else if (attempts >= maxAttempts) {
        clearInterval(findAndHighlight);
      }
    }, 200);
  };

  if (!issue) return null;

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
            <span className="category-badge">{issue.category}</span>
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