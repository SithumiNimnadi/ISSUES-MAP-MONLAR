import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './ResearchPanel.css';
import EditResearchModal from './EditResearchModal';
import notificationService from '../services/notificationService';

const API_URL = 'http://localhost:5001';

function ResearchPanel({ language, t }) {
  const [showForm, setShowForm] = useState(false);
  const [selectedResearch, setSelectedResearch] = useState(null);
  const [allResearch, setAllResearch] = useState([]);
  const [allIssues, setAllIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(null);
  const [selectedIssueId, setSelectedIssueId] = useState('');
  const [connecting, setConnecting] = useState(false);
  
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerImages, setViewerImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [viewerTitle, setViewerTitle] = useState('');
  const [editingResearch, setEditingResearch] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    district: '',
    province: '',
    description: '',
    fullContent: '',
    researcher: '',
    organization: '',
    uploadDate: new Date().toISOString().split('T')[0]
  });
  
  const [imageFiles, setImageFiles] = useState([]);
  const [pdfFiles, setPdfFiles] = useState([]);
  const [mapImageFiles, setMapImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [pdfPreviews, setPdfPreviews] = useState([]);
  const [mapImagePreviews, setMapImagePreviews] = useState([]);
  const [linksArray, setLinksArray] = useState([]);
  const [linksInput, setLinksInput] = useState('');

  const sriLankaDistricts = [
    'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
    'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
    'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
    'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
    'Monaragala', 'Ratnapura', 'Kegalle'
  ];

  const provinces = ['Western', 'Central', 'Southern', 'Northern', 'Eastern', 'North Western', 'North Central', 'Uva', 'Sabaragamuwa'];

  useEffect(() => {
    loadResearch();
    loadIssues();
  }, []);

  const loadResearch = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/research`);
      setAllResearch(response.data);
    } catch (error) {
      console.error('Error loading research:', error);
      notificationService.error('Failed to load research', 'Loading Error');
    } finally {
      setLoading(false);
    }
  };

  const loadIssues = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/issues`);
      setAllIssues(response.data);
    } catch (error) {
      console.error('Error loading issues:', error);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const openImageViewer = (images, title, type = 'images') => {
    setViewerImages(images);
    setCurrentImageIndex(0);
    setViewerTitle(`${title} - ${type === 'mapImages' ? t('mapImages') : t('images')}`);
    setShowImageViewer(true);
  };

  const closeImageViewer = useCallback(() => {
    setShowImageViewer(false);
    setViewerImages([]);
  }, []);

  const nextImage = useCallback(() => {
    setCurrentImageIndex((prev) => (prev + 1) % viewerImages.length);
  }, [viewerImages.length]);

  const prevImage = useCallback(() => {
    setCurrentImageIndex((prev) => (prev - 1 + viewerImages.length) % viewerImages.length);
  }, [viewerImages.length]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!showImageViewer) return;
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
      if (e.key === 'Escape') closeImageViewer();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showImageViewer, nextImage, prevImage, closeImageViewer]);

  useEffect(() => {
    const leavesContainer = document.createElement('div');
    leavesContainer.className = 'leaves-container';
    document.body.appendChild(leavesContainer);

    const leafTypes = ['leaf-1', 'leaf-2', 'leaf-3', 'leaf-4', 'leaf-5'];
    
    const createLeaf = () => {
      const leaf = document.createElement('div');
      const randomLeaf = leafTypes[Math.floor(Math.random() * leafTypes.length)];
      leaf.className = `leaf ${randomLeaf}`;
      
      const startLeft = Math.random() * 100;
      leaf.style.left = `${startLeft}%`;
      
      const duration = 5 + Math.random() * 7;
      leaf.style.animationDuration = `${duration}s`;
      
      const delay = Math.random() * 10;
      leaf.style.animationDelay = `${delay}s`;
      
      leavesContainer.appendChild(leaf);
      
      setTimeout(() => {
        if (leaf && leaf.parentNode) {
          leaf.remove();
        }
      }, duration * 1000);
    };
    
    const leafInterval = setInterval(createLeaf, 800);
    
    for (let i = 0; i < 10; i++) {
      setTimeout(createLeaf, i * 300);
    }
    
    return () => {
      clearInterval(leafInterval);
      if (leavesContainer && leavesContainer.parentNode) {
        leavesContainer.parentNode.removeChild(leavesContainer);
      }
    };
  }, []);

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    setImageFiles(prev => [...prev, ...files]);
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setImagePreviews(prev => [...prev, ...newPreviews]);
  };

  const handlePdfSelect = (e) => {
    const files = Array.from(e.target.files);
    setPdfFiles(prev => [...prev, ...files]);
    const newPreviews = files.map(file => ({
      name: file.name,
      size: (file.size / 1024).toFixed(2)
    }));
    setPdfPreviews(prev => [...prev, ...newPreviews]);
  };

  const handleMapImageSelect = (e) => {
    const files = Array.from(e.target.files);
    setMapImageFiles(prev => [...prev, ...files]);
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setMapImagePreviews(prev => [...prev, ...newPreviews]);
  };

  const removeImage = (index) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removePdf = (index) => {
    setPdfFiles(prev => prev.filter((_, i) => i !== index));
    setPdfPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeMapImage = (index) => {
    URL.revokeObjectURL(mapImagePreviews[index]);
    setMapImageFiles(prev => prev.filter((_, i) => i !== index));
    setMapImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const addLink = () => {
    if (linksInput && linksInput.trim()) {
      setLinksArray(prev => [...prev, linksInput.trim()]);
      setLinksInput('');
    }
  };

  const removeLink = (index) => {
    setLinksArray(prev => prev.filter((_, i) => i !== index));
  };

  const addResearch = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.district) {
      alert(t('fillRequiredFields') || 'Please enter title and district!');
      return;
    }
    
    setSubmitting(true);
    
    try {
      const formDataToSend = new FormData();
      
      const researchData = {
        title: formData.title,
        district: formData.district,
        province: formData.province,
        description: formData.description,
        fullContent: formData.fullContent,
        researcher: formData.researcher,
        organization: formData.organization,
        uploadDate: formData.uploadDate,
        links: linksArray
      };
      
      formDataToSend.append('data', JSON.stringify(researchData));
      
      imageFiles.forEach(file => {
        formDataToSend.append('images', file);
      });
      
      pdfFiles.forEach(file => {
        formDataToSend.append('pdfs', file);
      });
      
      mapImageFiles.forEach(file => {
        formDataToSend.append('mapImages', file);
      });
      
      await axios.post(`${API_URL}/api/research`, formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      await loadResearch();
      closeForm();
      
      notificationService.success(
        t('researchAdded') || 'Research added successfully!',
        '📚 Research Published'
      );
      
    } catch (error) {
      console.error('Error adding research:', error);
      notificationService.error(
        t('researchAddError') || 'Failed to add research',
        '❌ Publication Failed'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const editResearchHandler = async (id, updatedData) => {
    try {
      const response = await axios.put(`${API_URL}/api/research/${id}`, updatedData);
      if (response.status === 200) {
        await loadResearch();
        notificationService.success('Research updated successfully', '✏️ Research Updated');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error editing research:', error);
      notificationService.error('Failed to update research', '❌ Update Failed');
      return false;
    }
  };

  const deleteResearch = async (id, e) => {
    e.stopPropagation();
    if (window.confirm(t('deleteConfirm') || 'Are you sure you want to delete this research?')) {
      try {
        await axios.delete(`${API_URL}/api/research/${id}`);
        await loadResearch();
        notificationService.success(
          t('deleteSuccess') || 'Research deleted successfully',
          '🗑️ Research Deleted'
        );
      } catch (error) {
        console.error('Error deleting research:', error);
        notificationService.error(
          t('deleteError') || 'Failed to delete research',
          '❌ Delete Failed'
        );
      }
    }
  };

  const connectToIssue = async (researchId) => {
    if (!selectedIssueId) {
      alert(t('selectIssueFirst') || 'Please select an issue to connect');
      return;
    }
    
    setConnecting(true);
    
    try {
      const response = await axios.post(`${API_URL}/api/research/${researchId}/connect-issue/${selectedIssueId}`);
      
      if (response.data.success) {
        notificationService.success(
          t('connectSuccess') || 'Research successfully connected to issue!',
          '🔗 Connection Made'
        );
        setShowConnectModal(null);
        setSelectedIssueId('');
        await loadResearch();
        await loadIssues();
      }
    } catch (error) {
      console.error('Error connecting:', error);
      notificationService.error(
        t('connectError') || 'Failed to connect',
        '❌ Connection Failed'
      );
    } finally {
      setConnecting(false);
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setFormData({
      title: '',
      district: '',
      province: '',
      description: '',
      fullContent: '',
      researcher: '',
      organization: '',
      uploadDate: new Date().toISOString().split('T')[0]
    });
    
    imagePreviews.forEach(url => URL.revokeObjectURL(url));
    mapImagePreviews.forEach(url => URL.revokeObjectURL(url));
    
    setImageFiles([]);
    setPdfFiles([]);
    setMapImageFiles([]);
    setImagePreviews([]);
    setPdfPreviews([]);
    setMapImagePreviews([]);
    setLinksArray([]);
    setLinksInput('');
  };

  const openDetails = (research) => {
    setSelectedResearch(research);
  };

  const closeDetails = () => {
    setSelectedResearch(null);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString(language === 'si' ? 'si-LK' : language === 'ta' ? 'ta-LK' : 'en-US', 
      { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const truncateLink = (link, maxLength = 50) => {
    if (link.length <= maxLength) return link;
    return link.substring(0, maxLength) + '...';
  };

  // Helper function to truncate text
  const truncateText = (text, maxLength = 50) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className="research-container">
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <div className="loading-spinner"></div>
          <p>{t('loading')} 🌿</p>
        </div>
      </div>
    );
  }

  return (
    <div className="research-container">
      {showImageViewer && (
        <div className="viewer-modal" onClick={closeImageViewer}>
          <div className="viewer-container" onClick={(e) => e.stopPropagation()}>
            <div className="viewer-header">
              <h3>🖼️ {viewerTitle}</h3>
              <button className="viewer-close" onClick={closeImageViewer}>✕</button>
            </div>
            <div className="viewer-content">
              {viewerImages.length > 1 && (
                <>
                  <button className="viewer-prev" onClick={prevImage}>‹</button>
                  <button className="viewer-next" onClick={nextImage}>›</button>
                </>
              )}
              <div className="viewer-image-container">
                <img src={`${API_URL}${viewerImages[currentImageIndex]}`} alt="" className="viewer-image" />
              </div>
              <div className="viewer-info">
                <span>{currentImageIndex + 1} / {viewerImages.length}</span>
              </div>
              <div className="viewer-thumbnails">
                {viewerImages.map((img, idx) => (
                  <div key={idx} className={`viewer-thumb ${idx === currentImageIndex ? 'active' : ''}`} onClick={() => setCurrentImageIndex(idx)}>
                    <img src={`${API_URL}${img}`} alt="" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="research-header">
        <div>
          <h1>🔬 {t('researchHub')}</h1>
          <p>{t('researchDescription') || 'Scientific studies and community research for a sustainable Sri Lanka'}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="add-research-btn">
          <i className="fas fa-plus-circle"></i> {showForm ? t('cancel') : t('addNewResearch')}
        </button>
      </div>

      {showForm && (
        <div className="research-form-overlay">
          <div className="research-form">
            <div className="form-header">
              <h2>📝 {t('submitNewResearch') || 'Submit New Research'}</h2>
              <button type="button" className="form-close-btn" onClick={closeForm}>✕</button>
            </div>
            
            <form onSubmit={addResearch}>
              <div className="form-group">
                <label>{t('researchTitle') || 'Research Title'} *</label>
                <input type="text" name="title" placeholder={t('titlePlaceholder') || 'e.g., Impact of Climate Change'} value={formData.title} onChange={handleInputChange} required />
              </div>

              <div className="form-group">
                <label>📅 {t('uploadDate') || 'Research Upload Date'} *</label>
                <input type="date" name="uploadDate" value={formData.uploadDate} onChange={handleInputChange} required />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>{t('district')} *</label>
                  <select name="district" value={formData.district} onChange={handleInputChange} required>
                    <option value="">{t('selectDistrict')}</option>
                    {sriLankaDistricts.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>{t('province') || 'Province'}</label>
                  <select name="province" value={formData.province} onChange={handleInputChange}>
                    <option value="">{t('selectProvince') || 'Select Province'}</option>
                    {provinces.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>{t('researcher') || 'Researcher Name'}</label>
                  <input type="text" name="researcher" placeholder={t('researcherPlaceholder') || 'Dr. Name'} value={formData.researcher} onChange={handleInputChange} />
                </div>
                
                <div className="form-group">
                  <label>{t('organization') || 'Organization'}</label>
                  <input type="text" name="organization" placeholder={t('organizationPlaceholder') || 'University / NGO'} value={formData.organization} onChange={handleInputChange} />
                </div>
              </div>

              <div className="form-group">
                <label>{t('description')} *</label>
                <textarea name="description" rows="3" placeholder={t('descriptionPlaceholder')} value={formData.description} onChange={handleInputChange} required></textarea>
              </div>

              <div className="form-group">
                <label>{t('fullContent') || 'Full Research Content'}</label>
                <textarea name="fullContent" rows="6" placeholder={t('fullContentPlaceholder') || 'Complete research findings...'} value={formData.fullContent} onChange={handleInputChange}></textarea>
              </div>

              <div className="form-group">
                <label>🔗 {t('relatedLinks') || 'Related Links'}</label>
                <div className="links-input-group">
                  <input type="url" placeholder="https://example.com/research" value={linksInput} onChange={(e) => setLinksInput(e.target.value)} style={{ flex: 1 }} />
                  <button type="button" onClick={addLink} className="add-link-btn">+ {t('addLink') || 'Add Link'}</button>
                </div>
                {linksArray.length > 0 && (
                  <div className="links-list">
                    {linksArray.map((link, idx) => (
                      <div key={idx} className="link-item">
                        <span className="link-text" title={link}>{truncateLink(link, 60)}</span>
                        <button type="button" onClick={() => removeLink(idx)}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>🗺️ {t('mapImages')}</label>
                <input type="file" accept="image/*" multiple onChange={handleMapImageSelect} />
                {mapImagePreviews.length > 0 && (
                  <div className="multi-file-preview">
                    {mapImagePreviews.map((preview, idx) => (
                      <div key={idx} className="preview-item">
                        <img src={preview} alt={`Map ${idx}`} />
                        <button type="button" onClick={() => removeMapImage(idx)}>{t('remove') || 'Remove'}</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>📸 {t('images')}</label>
                <input type="file" accept="image/*" multiple onChange={handleImageSelect} />
                {imagePreviews.length > 0 && (
                  <div className="multi-file-preview">
                    {imagePreviews.map((preview, idx) => (
                      <div key={idx} className="preview-item">
                        <img src={preview} alt={`Preview ${idx}`} />
                        <button type="button" onClick={() => removeImage(idx)}>{t('remove') || 'Remove'}</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>📚 {t('pdfs')}</label>
                <input type="file" accept=".pdf,.doc,.docx" multiple onChange={handlePdfSelect} />
                {pdfPreviews.length > 0 && (
                  <div className="pdf-list">
                    {pdfPreviews.map((pdf, idx) => (
                      <div key={idx} className="pdf-item">
                        <span>📄 {pdf.name} ({pdf.size} KB)</span>
                        <button type="button" onClick={() => removePdf(idx)}>{t('remove') || 'Remove'}</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-buttons">
                <button type="button" className="cancel-btn" onClick={closeForm}>{t('cancel')}</button>
                <button type="submit" className="submit-research-btn" disabled={submitting}>
                  {submitting ? `${t('publishing') || 'Publishing...'}` : `📚 ${t('publishResearch') || 'Publish Research'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {allResearch.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#888' }}>
          <p>{t('noResearchFound')}</p>
        </div>
      ) : (
        <div className="research-grid">
          {allResearch.map(item => (
            <div key={item._id} className="research-card">
              {item.images && item.images.length > 0 && (
                <div className="research-card-image" onClick={() => openImageViewer(item.images, item.title, 'images')}>
                  <img src={`${API_URL}${item.images[0]}`} alt={item.title} />
                  {item.images.length > 1 && <div className="image-count-badge">+{item.images.length - 1}</div>}
                  <div className="image-view-overlay">🔍 {t('clickToView') || 'Click to view all images'}</div>
                </div>
              )}
              <div className="research-card-badge">📄 {t('researchPaper') || 'Research Paper'}</div>
              <h3>{truncateText(item.title, 40)}</h3>
              <div className="research-location"><i className="fas fa-map-marker-alt"></i> {item.district} {item.province && `, ${item.province}`}</div>
              <div className="research-meta">
                {item.researcher && <span><i className="fas fa-user"></i> {truncateText(item.researcher, 25)}</span>}
                {item.organization && <span><i className="fas fa-building"></i> {truncateText(item.organization, 25)}</span>}
              </div>
              
              <div className="research-date">
                <i className="far fa-calendar-alt"></i> {t('published') || 'Published'}: {formatDate(item.uploadDate || item.createdAt)}
              </div>
              
              <p className="research-description">{truncateText(item.description, 100)}</p>
              
              {item.connectedIssues && item.connectedIssues.length > 0 && (
                <div className="connected-issues-info">
                  <strong>🔗 {t('connectedIssues') || 'Connected Issues'} ({item.connectedIssues.length}):</strong>
                  <div className="connected-issues-badges">
                    {item.connectedIssues.map((issue, idx) => (
                      <span key={idx} className="issue-badge-small">
                        📋 {truncateText(issue.title, 25)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="research-stats">
                {item.images?.length > 0 && (
                  <button className="stat-badge stat-clickable" onClick={() => openImageViewer(item.images, item.title, 'images')}>
                    📸 {item.images.length}
                  </button>
                )}
                {item.mapImages?.length > 0 && (
                  <button className="stat-badge stat-map stat-clickable" onClick={() => openImageViewer(item.mapImages, item.title, 'mapImages')}>
                    🗺️ {item.mapImages.length}
                  </button>
                )}
                {item.pdfs?.length > 0 && <span className="stat-badge">📚 {item.pdfs.length}</span>}
                {item.links?.length > 0 && <span className="stat-badge">🔗 {item.links.length}</span>}
              </div>
              
              <div className="research-card-footer">
                <button onClick={() => openDetails(item)} className="view-details-btn">📖 {t('viewDetails')}</button>
                <button onClick={() => setEditingResearch(item)} className="edit-research-btn">✏️ {t('edit') || 'Edit'}</button>
                <button onClick={() => setShowConnectModal(item)} className="connect-issue-btn">🔗 {t('connectToIssue')}</button>
                <button onClick={(e) => deleteResearch(item._id, e)} className="delete-research-btn">🗑️ {t('delete')}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Connect to Issue Modal with shortened text */}
      {showConnectModal && (
        <div className="modal-overlay" onClick={() => setShowConnectModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🔗 {t('connectToIssue')}</h2>
              <button className="modal-close" onClick={() => setShowConnectModal(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <p><strong>{t('research') || 'Research'}:</strong> {truncateText(showConnectModal.title, 50)}</p>
              <div className="form-group">
                <label>{t('selectIssue') || 'Select Environmental Issue'}:</label>
                <select value={selectedIssueId} onChange={(e) => setSelectedIssueId(e.target.value)}>
                  <option value="">-- {t('selectIssue') || 'Select an issue'} --</option>
                  {allIssues.filter(issue => issue.status !== 'resolved').map(issue => (
                    <option key={issue._id} value={issue._id}>
                      {truncateText(issue.title, 45)} - {issue.district}
                    </option>
                  ))}
                </select>
              </div>
              <div className="modal-buttons">
                <button onClick={() => setShowConnectModal(null)} className="cancel-btn">{t('cancel')}</button>
                <button onClick={() => connectToIssue(showConnectModal._id)} className="confirm-connect-btn" disabled={!selectedIssueId || connecting}>
                  {connecting ? `${t('connecting') || 'Connecting...'}` : `🔗 ${t('connect')}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedResearch && (
        <div className="modal-overlay" onClick={closeDetails}>
          <div className="modal-content research-detail-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeDetails}>&times;</button>
            
            {selectedResearch.mapImages && selectedResearch.mapImages.length > 0 && (
              <div className="modal-gallery">
                <div className="gallery-header">
                  <h3>🗺️ {t('mapImages')} ({selectedResearch.mapImages.length})</h3>
                  <button className="view-all-btn" onClick={() => openImageViewer(selectedResearch.mapImages, selectedResearch.title, 'mapImages')}>
                    🖼️ {t('viewAll') || 'View All'}
                  </button>
                </div>
                <div className="gallery-grid">
                  {selectedResearch.mapImages.slice(0, 4).map((img, idx) => (
                    <img key={idx} src={`${API_URL}${img}`} alt={`Map ${idx}`} onClick={() => openImageViewer(selectedResearch.mapImages, selectedResearch.title, 'mapImages')} style={{ cursor: 'pointer' }} />
                  ))}
                  {selectedResearch.mapImages.length > 4 && (
                    <div className="gallery-more" onClick={() => openImageViewer(selectedResearch.mapImages, selectedResearch.title, 'mapImages')}>
                      +{selectedResearch.mapImages.length - 4} {t('more') || 'more'}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {selectedResearch.images && selectedResearch.images.length > 0 && (
              <div className="modal-gallery">
                <div className="gallery-header">
                  <h3>📸 {t('images')} ({selectedResearch.images.length})</h3>
                  <button className="view-all-btn" onClick={() => openImageViewer(selectedResearch.images, selectedResearch.title, 'images')}>
                    🖼️ {t('viewAll') || 'View All'}
                  </button>
                </div>
                <div className="gallery-grid">
                  {selectedResearch.images.slice(0, 4).map((img, idx) => (
                    <img key={idx} src={`${API_URL}${img}`} alt={`Research ${idx}`} onClick={() => openImageViewer(selectedResearch.images, selectedResearch.title, 'images')} style={{ cursor: 'pointer' }} />
                  ))}
                  {selectedResearch.images.length > 4 && (
                    <div className="gallery-more" onClick={() => openImageViewer(selectedResearch.images, selectedResearch.title, 'images')}>
                      +{selectedResearch.images.length - 4} {t('more') || 'more'}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="modal-header">
              <h2>{selectedResearch.title}</h2>
              <div className="modal-location"><i className="fas fa-map-marker-alt"></i> {selectedResearch.district}</div>
            </div>
            
            <div className="modal-meta">
              {selectedResearch.researcher && <div><i className="fas fa-user-graduate"></i> <strong>{t('researcher') || 'Researcher'}:</strong> {selectedResearch.researcher}</div>}
              {selectedResearch.organization && <div><i className="fas fa-university"></i> <strong>{t('organization') || 'Organization'}:</strong> {selectedResearch.organization}</div>}
              <div><i className="far fa-calendar-alt"></i> <strong>{t('published') || 'Published'}:</strong> {formatDate(selectedResearch.uploadDate || selectedResearch.createdAt)}</div>
            </div>
            
            <div className="modal-section">
              <h3><i className="fas fa-align-left"></i> {t('abstract') || 'Abstract / Summary'}</h3>
              <p>{selectedResearch.description}</p>
            </div>
            
            <div className="modal-section">
              <h3><i className="fas fa-microscope"></i> {t('fullResearch') || 'Full Research'}</h3>
              <p>{selectedResearch.fullContent || (t('contentComingSoon') || 'Full content coming soon...')}</p>
            </div>
            
            {selectedResearch.links && selectedResearch.links.length > 0 && (
              <div className="modal-section">
                <h3><i className="fas fa-link"></i> {t('resources') || 'Resources & Links'} ({selectedResearch.links.length})</h3>
                <div className="modal-links">
                  {selectedResearch.links.map((link, idx) => (
                    <a key={idx} href={link} target="_blank" rel="noopener noreferrer" className="link-item-long" title={link}>
                      <i className="fas fa-external-link-alt"></i> <span>{truncateLink(link, 80)}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
            
            {selectedResearch.pdfs && selectedResearch.pdfs.length > 0 && (
              <div className="modal-section">
                <h3><i className="fas fa-file-pdf"></i> {t('documents') || 'Research Documents'} ({selectedResearch.pdfs.length})</h3>
                <div className="pdf-downloads">
                  {selectedResearch.pdfs.map((pdf, idx) => (
                    <a key={idx} href={`${API_URL}${pdf}`} target="_blank" className="pdf-link" rel="noopener noreferrer">
                      <i className="fas fa-download"></i> {t('download') || 'Download'} {t('document') || 'Document'} {idx + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}
            
            <div className="modal-footer">
              <button onClick={closeDetails} className="close-modal-btn">{t('close') || 'Close'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Research Modal */}
      {editingResearch && (
        <EditResearchModal
          research={editingResearch}
          onClose={() => setEditingResearch(null)}
          onUpdate={editResearchHandler}
        />
      )}
    </div>
  );
}

export default ResearchPanel;