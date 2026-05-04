import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './IssuesList.css';
import EditIssueModal from './EditIssueModal';

function IssuesList({ issues, onDelete, onResolve, onConnectResearch, onEditIssue, onRefreshIssues, language, t }) {
  const [filter, setFilter] = useState('all'); // Status filter: all, pending, resolved
  const [categoryFilter, setCategoryFilter] = useState('all'); // Category filter
  const [searchTerm, setSearchTerm] = useState(''); // Search term
  const [showResolveModal, setShowResolveModal] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [showConnectModal, setShowConnectModal] = useState(null);
  const [showFullEditModal, setShowFullEditModal] = useState(null);
  const [allResearch, setAllResearch] = useState([]);
  const [selectedResearchId, setSelectedResearchId] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const [showImageViewer, setShowImageViewer] = useState(false);
  const [showMapViewer, setShowMapViewer] = useState(false);
  const [showDocViewer, setShowDocViewer] = useState(false);
  const [currentImages, setCurrentImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentDocs, setCurrentDocs] = useState([]);
  const [issueTitle, setIssueTitle] = useState('');

  // Get unique categories from issues
  const getUniqueCategories = () => {
    const categories = new Set();
    issues.forEach(issue => {
      if (issue.category) {
        categories.add(issue.category);
      }
    });
    return Array.from(categories).sort();
  };

  // Category icons mapping
  const getCategoryIcon = (category) => {
    const icons = {
      'Waste & Pollution': '🗑️',
      'Waste and Pollution': '🗑️',
      'Deforestation': '🌳',
      'Water Contamination': '💧',
      'Water Pollution': '💧',
      'Air Pollution': '🌫️',
      'Soil Erosion': '⛰️',
      'Soil Contamination': '🧪',
      'Wildlife Conflict': '🐘',
      'Climate Change': '🌡️',
      'Other': '🌿'
    };
    return icons[category];
  };

  useEffect(() => {
    console.log('📋 Issues updated in IssuesList:', issues.length);
  }, [issues]);

  useEffect(() => {
    loadResearch();
  }, []);

  const loadResearch = async () => {
    try {
      const res = await axios.get('http://localhost:5001/api/research');
      setAllResearch(res.data);
    } catch (err) { 
      console.error(err); 
    }
  };

  // Filter issues based on status, category, and search term
  const filteredIssues = issues.filter(issue => {
    // Status filter
    if (filter !== 'all' && issue.status !== filter) return false;
    
    // Category filter
    if (categoryFilter !== 'all' && issue.category !== categoryFilter) return false;
    
    // Search filter (title, description, district)
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (issue.title && issue.title.toLowerCase().includes(search)) ||
             (issue.description && issue.description.toLowerCase().includes(search)) ||
             (issue.district && issue.district.toLowerCase().includes(search));
    }
    
    return true;
  });

  const openFullEditModal = (issue) => {
    console.log('Opening edit modal for issue:', issue._id);
    setShowFullEditModal(issue);
  };

  const handleRefresh = async () => {
    console.log('🔄 Manual refresh triggered');
    setRefreshing(true);
    if (onRefreshIssues) {
      await onRefreshIssues();
    }
    setRefreshing(false);
  };

  const handleIssueUpdate = async (id, formData) => {
    console.log('📝 handleIssueUpdate called with id:', id);
    const result = await onEditIssue(id, formData);
    
    if (result) {
      setTimeout(async () => {
        if (onRefreshIssues) {
          await onRefreshIssues();
        }
      }, 200);
    }
    return result;
  };

  const handleConnectResearch = async (issueId, researchId) => {
    if (!researchId) {
      alert(t('selectResearchFirst') || 'Please select a research paper to connect');
      return false;
    }
    
    setConnecting(true);
    
    try {
      try {
        const response = await axios.post(`http://localhost:5001/api/research/${researchId}/connect-issue/${issueId}`);
        
        if (response.data.success) {
          const toastEvent = new CustomEvent('showToast', {
            detail: {
              message: `✅ ${t('connectSuccess') || 'Successfully connected to research!'}`,
              type: 'success'
            }
          });
          window.dispatchEvent(toastEvent);
          
          if (onRefreshIssues) {
            await onRefreshIssues();
          }
          return true;
        }
      } catch (firstError) {
        const response = await axios.post(`http://localhost:5001/api/issues/${issueId}/connect-research/${researchId}`);
        
        if (response.data.success) {
          const toastEvent = new CustomEvent('showToast', {
            detail: {
              message: `✅ ${t('connectSuccess') || 'Successfully connected to research!'}`,
              type: 'success'
            }
          });
          window.dispatchEvent(toastEvent);
          
          if (onRefreshIssues) {
            await onRefreshIssues();
          }
          return true;
        }
      }
      
      alert(t('connectFailed') || 'Failed to connect: Unknown error');
      return false;
    } catch (error) {
      console.error('Error connecting:', error);
      alert(t('connectError') || 'Failed to connect issue to research');
      return false;
    } finally {
      setConnecting(false);
    }
  };

  const goToResearchPanel = () => {
    const researchTabButton = document.querySelector('.nav-tabs button:nth-child(4)');
    if (researchTabButton) {
      researchTabButton.click();
    }
    setShowConnectModal(null);
    setSelectedResearchId('');
    
    if (showConnectModal) {
      sessionStorage.setItem('pendingIssueId', showConnectModal._id);
      sessionStorage.setItem('pendingIssueTitle', showConnectModal.title);
    }
    
    const toastEvent = new CustomEvent('showToast', {
      detail: {
        message: `🔬 ${t('navigatedToResearch') || 'Navigated to Research Panel'}`,
        type: 'info'
      }
    });
    window.dispatchEvent(toastEvent);
  };

  const openPhotoViewer = (images, title) => {
    setCurrentImages(images);
    setCurrentImageIndex(0);
    setIssueTitle(title);
    setShowImageViewer(true);
  };

  const openMapViewer = (images, title) => {
    setCurrentImages(images);
    setCurrentImageIndex(0);
    setIssueTitle(title);
    setShowMapViewer(true);
  };

  const openDocViewer = (docs, title) => {
    setCurrentDocs(docs);
    setIssueTitle(title);
    setShowDocViewer(true);
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % currentImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + currentImages.length) % currentImages.length);
  };

  // Clear all filters
  const clearAllFilters = () => {
    setFilter('all');
    setCategoryFilter('all');
    setSearchTerm('');
  };

  if (!issues?.length) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🌿</div>
        <p>{t('noIssuesReported')}</p>
        <small>{t('beFirst')}</small>
      </div>
    );
  }

  const uniqueCategories = getUniqueCategories();

  return (
    <div className="issues-container">
      <div className="issues-header">
        <h2>📋 {t('environmentalIssues')}</h2>
        <div className="filter-buttons">
          <button onClick={() => setFilter('all')} className={filter === 'all' ? 'active' : ''}>
            {t('all')} ({issues.length})
          </button>
          <button onClick={() => setFilter('pending')} className={filter === 'pending' ? 'active' : ''}>
            {t('pending') || 'Pending'} ({issues.filter(i => i.status === 'pending').length})
          </button>
          <button onClick={() => setFilter('resolved')} className={filter === 'resolved' ? 'active' : ''}>
            {t('resolved')} ({issues.filter(i => i.status === 'resolved').length})
          </button>
          <button 
            onClick={handleRefresh} 
            disabled={refreshing}
            style={{
              background: '#2d6a4f',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            🔄 {refreshing ? `${t('refreshing') || 'Refreshing...'}` : `${t('refresh') || 'Refresh'}`}
          </button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="search-filter-bar">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder={t('searchIssues') || 'Search issues by title, description or district...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button className="clear-search" onClick={() => setSearchTerm('')}>✕</button>
          )}
        </div>

        <div className="category-filter-wrapper">
          <span className="filter-label">🏷️ {t('category') || 'Category'}:</span>
          <select 
            value={categoryFilter} 
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="category-select"
          >
            <option value="all">{t('allCategories') || 'All Categories'}</option>
            {uniqueCategories.map(category => (
              <option key={category} value={category}>
                {getCategoryIcon(category)} {category}
              </option>
            ))}
          </select>
        </div>

        {(filter !== 'all' || categoryFilter !== 'all' || searchTerm) && (
          <button onClick={clearAllFilters} className="clear-filters-btn">
            🧹 {t('clearFilters') || 'Clear Filters'}
          </button>
        )}
      </div>

      {/* Results count */}
      <div className="filter-results-info">
        <span>
          {t('showing') || 'Showing'} {filteredIssues.length} {t('of') || 'of'} {issues.length} {t('issues') || 'issues'}
          {searchTerm && ` ${t('matching') || 'matching'} "${searchTerm}"`}
          {categoryFilter !== 'all' && ` ${t('in') || 'in'} ${getCategoryIcon(categoryFilter)} ${categoryFilter}`}
          {filter !== 'all' && ` (${filter === 'resolved' ? t('resolved') : (t('pending') || 'Pending')})`}
        </span>
      </div>
      
      <div className="issues-list">
        {filteredIssues.length === 0 ? (
          <div className="no-results">
            <div className="no-results-icon">🔍</div>
            <p>{t('noIssuesFound') || 'No issues found matching your criteria'}</p>
            <button onClick={clearAllFilters} className="clear-filters-btn">
              {t('clearFilters') || 'Clear Filters'}
            </button>
          </div>
        ) : (
          filteredIssues.map(issue => (
            <div key={issue._id} id={`issue-${issue._id}`} className="issue-card">
              <div className="issue-badge" data-status={issue.status}>
                {issue.status === 'resolved' ? `✓ ${t('resolved')}` : `⏳ ${t('pending') || 'Pending'}`}
              </div>
              <div className="issue-category-badge">
                {getCategoryIcon(issue.category)} {issue.category}
              </div>
              <h3>{issue.title}</h3>
              <p>{issue.description}</p>
              <div className="issue-meta">
                <span>📍 {issue.district}</span>
                <span>📅 {new Date(issue.createdAt).toLocaleDateString()}</span>
              </div>
              
              {issue.status === 'resolved' && (
                <div className="resolution-info">
                  <strong>✓ {t('resolved')}:</strong> {issue.resolution}
                  <br />
                  <small>{t('by') || 'By'}: {issue.resolvedBy} on {new Date(issue.resolvedAt).toLocaleDateString()}</small>
                </div>
              )}
              
              {issue.connectedResearch && issue.connectedResearch.length > 0 && (
                <div className="connected-items">
                  <strong>🔗 {t('connectedResearch') || 'Connected Research'} ({issue.connectedResearch.length}):</strong>
                  <div className="connected-badges">
                    {issue.connectedResearch.map((research, idx) => (
                      <span key={idx} className="connected-badge research-badge" title={research.title}>
                        📚 {research.title?.substring(0, 30)}{research.title?.length > 30 ? '...' : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="file-view-buttons">
                {issue.images && issue.images.length > 0 ? (
                  <button className="view-photos-btn" onClick={() => openPhotoViewer(issue.images, issue.title)}>
                    📸 {t('viewPhotos') || 'View Photos'} ({issue.images.length})
                  </button>
                ) : (
                  <button className="view-photos-btn-disabled" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                    📸 {t('noPhotos') || 'No Photos'}
                  </button>
                )}
                
                {issue.mapImages && issue.mapImages.length > 0 ? (
                  <button className="view-maps-btn" onClick={() => openMapViewer(issue.mapImages, issue.title)}>
                    🗺️ {t('viewMaps') || 'View Maps'} ({issue.mapImages.length})
                  </button>
                ) : (
                  <button className="view-maps-btn-disabled" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                    🗺️ {t('noMaps') || 'No Maps'}
                  </button>
                )}
                
                {issue.pdfs && issue.pdfs.length > 0 ? (
                  <button className="view-docs-btn" onClick={() => openDocViewer(issue.pdfs, issue.title)}>
                    📄 {t('viewDocuments') || 'View Documents'} ({issue.pdfs.length})
                  </button>
                ) : (
                  <button className="view-docs-btn-disabled" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                    📄 {t('noDocuments') || 'No Documents'}
                  </button>
                )}
              </div>
              
              <div className="issue-actions">
                {issue.status !== 'resolved' && (
                  <button className="resolve-btn" onClick={() => setShowResolveModal(issue)}>
                    ✓ {t('resolve')}
                  </button>
                )}
                <button className="connect-research-btn" onClick={() => setShowConnectModal(issue)}>
                  🔗 {t('connectResearch')}
                </button>
                <button className="edit-btn" onClick={() => openFullEditModal(issue)}>
                  ✏️ {t('edit')}
                </button>
                <button className="delete-btn" onClick={() => onDelete(issue._id)}>
                  🗑️ {t('delete')}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Photo Viewer */}
      {showImageViewer && (
        <div className="viewer-modal" onClick={() => setShowImageViewer(false)}>
          <div className="viewer-container" onClick={(e) => e.stopPropagation()}>
            <div className="viewer-header">
              <h3>📸 {t('photos') || 'Photos'} - {issueTitle}</h3>
              <button className="viewer-close" onClick={() => setShowImageViewer(false)}>✕</button>
            </div>
            <div className="viewer-content">
              {currentImages.length > 1 && (
                <>
                  <button className="viewer-prev" onClick={prevImage}>‹</button>
                  <button className="viewer-next" onClick={nextImage}>›</button>
                </>
              )}
              <div className="viewer-image-container">
                <img 
                  src={`http://localhost:5001${currentImages[currentImageIndex]}`} 
                  alt=""
                  className="viewer-image" 
                />
              </div>
              <div className="viewer-info">
                <span>{currentImageIndex + 1} / {currentImages.length}</span>
              </div>
              <div className="viewer-thumbnails">
                {currentImages.map((img, idx) => (
                  <div key={idx} className={`viewer-thumb ${idx === currentImageIndex ? 'active' : ''}`} onClick={() => setCurrentImageIndex(idx)}>
                    <img src={`http://localhost:5001${img}`} alt="" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Map Viewer */}
      {showMapViewer && (
        <div className="viewer-modal" onClick={() => setShowMapViewer(false)}>
          <div className="viewer-container" onClick={(e) => e.stopPropagation()}>
            <div className="viewer-header">
              <h3>🗺️ {t('mapImages')} - {issueTitle}</h3>
              <button className="viewer-close" onClick={() => setShowMapViewer(false)}>✕</button>
            </div>
            <div className="viewer-content">
              {currentImages.length > 1 && (
                <>
                  <button className="viewer-prev" onClick={prevImage}>‹</button>
                  <button className="viewer-next" onClick={nextImage}>›</button>
                </>
              )}
              <div className="viewer-image-container">
                <img src={`http://localhost:5001${currentImages[currentImageIndex]}`} alt="" className="viewer-image" />
              </div>
              <div className="viewer-info">
                <span>{currentImageIndex + 1} / {currentImages.length}</span>
              </div>
              <div className="viewer-thumbnails">
                {currentImages.map((img, idx) => (
                  <div key={idx} className={`viewer-thumb ${idx === currentImageIndex ? 'active' : ''}`} onClick={() => setCurrentImageIndex(idx)}>
                    <img src={`http://localhost:5001${img}`} alt="" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer */}
      {showDocViewer && (
        <div className="viewer-modal" onClick={() => setShowDocViewer(false)}>
          <div className="viewer-container document-viewer" onClick={(e) => e.stopPropagation()}>
            <div className="viewer-header">
              <h3>📄 {t('documents') || 'Documents'} - {issueTitle}</h3>
              <button className="viewer-close" onClick={() => setShowDocViewer(false)}>✕</button>
            </div>
            <div className="document-list">
              {currentDocs.map((doc, idx) => (
                <a key={idx} href={`http://localhost:5001${doc}`} target="_blank" rel="noopener noreferrer" className="document-item">
                  <div className="document-icon">📑</div>
                  <div className="document-info">
                    <div className="document-name">{t('document') || 'Document'} {idx + 1}</div>
                    <div className="document-size">{t('clickToView') || 'Click to view PDF'}</div>
                  </div>
                  <div className="document-open">🔗 {t('open') || 'Open'}</div>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {showResolveModal && (
        <div className="modal-overlay" onClick={() => setShowResolveModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>✓ {t('resolveIssue') || 'Resolve Issue'}</h3>
            <p><strong>{showResolveModal.title}</strong></p>
            <textarea
              placeholder={t('enterResolutionNotes') || 'Describe how this issue was resolved...'}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              rows="4"
            />
            <div className="modal-buttons">
              <button className="cancel-btn" onClick={() => setShowResolveModal(null)}>{t('cancel')}</button>
              <button className="confirm-resolve-btn" onClick={() => {
                if (resolutionNotes.trim()) {
                  onResolve(showResolveModal._id, resolutionNotes);
                  setShowResolveModal(null);
                  setResolutionNotes('');
                } else {
                  alert(t('enterResolutionNotes'));
                }
              }}>{t('confirm') || 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Connect Research Modal */}
     {/* Connect Research Modal */}
{showConnectModal && (
  <div className="modal-overlay" onClick={() => setShowConnectModal(null)}>
    <div className="modal-content connect-research-modal" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header-custom">
        <h3>🔗 {t('connectResearch')}</h3>
        <button className="modal-close" onClick={() => setShowConnectModal(null)}>×</button>
      </div>
      <div className="modal-body-custom">
        <p className="issue-info">
          <strong>{t('issue') || 'Issue'}:</strong> {showConnectModal.title}
        </p>
        
        {allResearch.length > 0 ? (
          <>
            <label className="select-label">{t('selectResearch') || 'Select Existing Research'}:</label>
            <select 
              value={selectedResearchId} 
              onChange={(e) => setSelectedResearchId(e.target.value)}
              className="research-select"
            >
              <option value="">-- {t('selectResearch') || 'Select Research Paper'} --</option>
              {allResearch.map(r => (
                <option key={r._id} value={r._id}>
                  {r.title.length > 50 ? r.title.substring(0, 50) + '...' : r.title} - {r.district}
                </option>
              ))}
            </select>
          </>
        ) : (
          <div className="no-research-warning">
            <p>⚠️ {t('noResearchFound') || 'No research papers found.'}</p>
          </div>
        )}
        
        <div className="divider">
          <span>OR</span>
        </div>
        
        <button className="create-research-btn" onClick={goToResearchPanel}>
          ✨ {t('createNewResearch') || 'Create New Research for this Issue'}
        </button>
      </div>
      <div className="modal-footer-custom">
        <button className="cancel-btn" onClick={() => {
          setShowConnectModal(null);
          setSelectedResearchId('');
        }}>{t('cancel')}</button>
        <button 
          className="confirm-resolve-btn" 
          disabled={!selectedResearchId || connecting}
          onClick={async () => {
            const success = await handleConnectResearch(showConnectModal._id, selectedResearchId);
            if (success) {
              setShowConnectModal(null);
              setSelectedResearchId('');
            }
          }}
        >
          {connecting ? `${t('connecting') || 'Connecting...'}` : t('connect') || 'Connect'}
        </button>
      </div>
    </div>
  </div>
)}

      {/* Full Edit Modal */}
      {showFullEditModal && (
        <EditIssueModal
          issue={showFullEditModal}
          onClose={() => {
            setShowFullEditModal(null);
            setTimeout(() => {
              if (onRefreshIssues) {
                onRefreshIssues();
              }
            }, 500);
          }}
          onUpdate={handleIssueUpdate}
          t={t}
          language={language}
        />
      )}
    </div>
  );
}

export default IssuesList;