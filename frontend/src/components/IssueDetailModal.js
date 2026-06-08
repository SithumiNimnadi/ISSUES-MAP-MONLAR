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

  // Function to navigate to issues list and highlight specific issue
  const goToIssuesList = () => {
    // Find and click the Issues tab button (3rd button in nav-tabs)
    const issuesTabButton = document.querySelector('.nav-tabs button:nth-child(3)');
    if (issuesTabButton) {
      issuesTabButton.click();
    }
    
    // Close the modal
    onClose();
    
    // Store the issue ID to highlight and scroll to it
    sessionStorage.setItem('highlightIssueId', issue._id);
    sessionStorage.setItem('scrollToIssueId', issue._id);
    
    // Show a toast notification
    const toastEvent = new CustomEvent('showToast', {
      detail: {
        message: `📍 Navigating to: ${issue.title}`,
        type: 'info'
      }
    });
    window.dispatchEvent(toastEvent);
    
    // Use a small delay to ensure the issues list is rendered
    setTimeout(() => {
      highlightAndScrollToIssue(issue._id);
    }, 500);
  };
  
  // Function to highlight and scroll to the specific issue
  const highlightAndScrollToIssue = (issueId) => {
    // Try to find the issue card
    let targetElement = document.getElementById(`issue-${issueId}`);
    
    // If not found, try with different selector patterns
    if (!targetElement) {
      targetElement = document.querySelector(`[data-issue-id="${issueId}"]`);
    }
    
    if (!targetElement) {
      targetElement = document.querySelector(`.issue-card[data-id="${issueId}"]`);
    }
    
    if (targetElement) {
      // Remove any existing highlights
      document.querySelectorAll('.issue-card.highlighted').forEach(card => {
        card.classList.remove('highlighted');
      });
      
      // Add highlight class
      targetElement.classList.add('highlighted');
      
      // Scroll to the element with smooth behavior
      targetElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'nearest'
      });
      
      // Flash effect for better visibility
      let flashCount = 0;
      const flashInterval = setInterval(() => {
        if (flashCount >= 3) {
          clearInterval(flashInterval);
          // Remove highlight after flashing
          setTimeout(() => {
            targetElement.classList.remove('highlighted');
          }, 2000);
        } else {
          targetElement.style.transform = 'scale(1.02)';
          setTimeout(() => {
            if (targetElement) {
              targetElement.style.transform = '';
            }
          }, 200);
          flashCount++;
        }
      }, 400);
      
      // Show success notification
      const toastEvent = new CustomEvent('showToast', {
        detail: {
          message: `✓ Found: ${issue.title}`,
          type: 'success'
        }
      });
      window.dispatchEvent(toastEvent);
    } else {
      // If element not found immediately, try again after a delay
      setTimeout(() => {
        const retryElement = document.getElementById(`issue-${issueId}`);
        if (retryElement) {
          retryElement.classList.add('highlighted');
          retryElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center'
          });
        } else {
          // Show error if still not found
          const toastEvent = new CustomEvent('showToast', {
            detail: {
              message: `⚠️ Could not locate the specific issue, but you're in the issues list`,
              type: 'warning'
            }
          });
          window.dispatchEvent(toastEvent);
        }
      }, 1000);
    }
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