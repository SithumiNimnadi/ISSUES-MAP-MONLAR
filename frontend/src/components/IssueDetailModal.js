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
    
    // Show toast
    const toastEvent = new CustomEvent('showToast', {
      detail: {
        message: `📍 Opening: ${issue.title.substring(0, 50)}...`,
        type: 'info'
      }
    });
    window.dispatchEvent(toastEvent);
    
    // 🔥 Wait for modal to close and DOM to update
    setTimeout(() => {
      try {
        const userRole = localStorage.getItem('userRole') || 'guest';
        console.log("Current user role:", userRole);

        let issuesTabButton = null;

        // Role එක අනුව tab එක select කරන්න
        if (userRole === "admin") {
          // Admin - 3rd tab (index 3)
          issuesTabButton = document.querySelector('.nav-tabs button:nth-child(3)');
          console.log("👑 Admin mode: Selecting 3rd tab");
        } else {
          // User or Guest - 2nd tab (index 2)
          issuesTabButton = document.querySelector('.nav-tabs button:nth-child(2)');
          console.log("👤 User/Guest mode: Selecting 2nd tab");
        }
        
        // Click the tab if found
        if (issuesTabButton) {
          issuesTabButton.click();
          console.log("✅ Tab clicked successfully");
          
          // 🔥 Start highlighting after tab switch
          setTimeout(() => {
            findAndHighlightIssue();
          }, 500);
        } else {
          console.warn("⚠️ Tab element not found");
          // Fallback: Try to find by text content
          const fallbackTab = Array.from(document.querySelectorAll('.nav-tabs button'))
            .find(btn => btn.textContent.includes('📋') || 
                           btn.textContent.toLowerCase().includes('issues'));
          if (fallbackTab) {
            fallbackTab.click();
            console.log("✅ Fallback tab clicked");
            setTimeout(() => {
              findAndHighlightIssue();
            }, 500);
          } else {
            console.error("❌ No tab found!");
          }
        }
      } catch (error) {
        console.error("❌ Error in tab navigation:", error);
      }
    }, 300);
  };

  // 🔥 Separate function for finding and highlighting
  const findAndHighlightIssue = () => {
    console.log("🔍 Searching for issue:", issue._id);
    let attempts = 0;
    const maxAttempts = 40;
    
    const findAndHighlight = setInterval(() => {
      attempts++;
      const targetElement = document.getElementById(`issue-${issue._id}`);
      
      if (targetElement) {
        clearInterval(findAndHighlight);
        console.log("✅ Issue found!", targetElement);
        
        // Remove existing highlights
        document.querySelectorAll('.issue-card.highlighted').forEach(card => {
          card.classList.remove('highlighted');
        });
        
        // Add highlight
        targetElement.classList.add('highlighted');
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Flash animation
        let flashCount = 0;
        const flashInterval = setInterval(() => {
          if (flashCount >= 3) {
            clearInterval(flashInterval);
            setTimeout(() => {
              if (targetElement) {
                targetElement.classList.remove('highlighted');
              }
            }, 2000);
          } else {
            targetElement.style.transform = 'scale(1.02)';
            targetElement.style.transition = 'transform 0.15s ease';
            setTimeout(() => {
              if (targetElement) {
                targetElement.style.transform = 'scale(1)';
              }
            }, 150);
            flashCount++;
          }
        }, 300);
        
        // Success toast
        const successEvent = new CustomEvent('showToast', {
          detail: { 
            message: `✅ Found: ${issue.title}`, 
            type: 'success' 
          }
        });
        window.dispatchEvent(successEvent);
        
        // Clean up session storage
        sessionStorage.removeItem('highlightIssueId');
        sessionStorage.removeItem('scrollToIssueId');
        sessionStorage.removeItem('forceHighlight');
        sessionStorage.removeItem('targetTitle');
        
      } else if (attempts >= maxAttempts) {
        clearInterval(findAndHighlight);
        console.warn("⚠️ Issue element not found after", maxAttempts, "attempts");
        
        // Try to find by different selector
        const altElement = document.querySelector(`[data-issue-id="${issue._id}"]`) ||
                          document.querySelector(`.issue-item[data-id="${issue._id}"]`);
        if (altElement) {
          console.log("✅ Found using alternative selector!");
          altElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          altElement.style.border = '3px solid #2d6a4f';
          altElement.style.boxShadow = '0 0 20px rgba(45, 106, 79, 0.5)';
          setTimeout(() => {
            altElement.style.border = '';
            altElement.style.boxShadow = '';
          }, 3000);
        }
      }
    }, 300);
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