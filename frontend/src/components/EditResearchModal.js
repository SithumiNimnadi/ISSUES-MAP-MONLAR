import React, { useState, useEffect } from 'react';
import './EditResearchModal.css';

const API_URL = 'http://localhost:5001';

function EditResearchModal({ research, onClose, onUpdate }) {
  const [formData, setFormData] = useState({
    title: '',
    district: '',
    province: '',
    description: '',
    fullContent: '',
    researcher: '',
    organization: '',
    links: []
  });

  const [existingImages, setExistingImages] = useState([]);
  const [existingPdfs, setExistingPdfs] = useState([]);
  const [existingMapImages, setExistingMapImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [newPdfs, setNewPdfs] = useState([]);
  const [newMapImages, setNewMapImages] = useState([]);
  const [previewUrls, setPreviewUrls] = useState({
    images: [],
    pdfs: [],
    mapImages: []
  });

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [linksInput, setLinksInput] = useState('');

  const SRI_LANKA_DISTRICTS = [
    'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
    'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
    'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
    'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
    'Monaragala', 'Ratnapura', 'Kegalle'
  ];

  const PROVINCES = [
    'Western', 'Central', 'Southern', 'Northern', 'Eastern', 
    'North Western', 'North Central', 'Uva', 'Sabaragamuwa'
  ];

  useEffect(() => {
    if (research) {
      setFormData({
        title: research.title || '',
        district: research.district || '',
        province: research.province || '',
        description: research.description || '',
        fullContent: research.fullContent || '',
        researcher: research.researcher || '',
        organization: research.organization || '',
        links: research.links || []
      });

      setLinksInput((research.links || []).join(', '));
      setExistingImages(research.images || []);
      setExistingPdfs(research.pdfs || []);
      setExistingMapImages(research.mapImages || []);
    }
  }, [research]);

  useEffect(() => {
    return () => {
      previewUrls.images.forEach(url => URL.revokeObjectURL(url));
      previewUrls.pdfs.forEach(url => URL.revokeObjectURL(url));
      previewUrls.mapImages.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLinksChange = (e) => {
    const value = e.target.value;
    setLinksInput(value);
    const linksArray = value.split(',').map(link => link.trim()).filter(link => link);
    setFormData(prev => ({
      ...prev,
      links: linksArray
    }));
  };

  const handleFileSelect = (e, type) => {
    const files = Array.from(e.target.files || []);

    if (files.length === 0) return;

    const previews = files.map(file => URL.createObjectURL(file));

    if (type === 'images') {
      setNewImages(prev => [...prev, ...files]);
      setPreviewUrls(prev => ({
        ...prev,
        images: [...prev.images, ...previews]
      }));
    } else if (type === 'pdfs') {
      setNewPdfs(prev => [...prev, ...files]);
      setPreviewUrls(prev => ({
        ...prev,
        pdfs: [...prev.pdfs, ...previews]
      }));
    } else if (type === 'mapImages') {
      setNewMapImages(prev => [...prev, ...files]);
      setPreviewUrls(prev => ({
        ...prev,
        mapImages: [...prev.mapImages, ...previews]
      }));
    }

    e.target.value = '';
  };

  const removeExistingFile = (type, index) => {
    const confirmDelete = window.confirm('Are you sure you want to remove this file?');
    if (!confirmDelete) return;

    if (type === 'images') {
      setExistingImages(prev => prev.filter((_, i) => i !== index));
    } else if (type === 'pdfs') {
      setExistingPdfs(prev => prev.filter((_, i) => i !== index));
    } else if (type === 'mapImages') {
      setExistingMapImages(prev => prev.filter((_, i) => i !== index));
    }
  };

  const removeNewFile = (type, index) => {
    if (type === 'images') {
      URL.revokeObjectURL(previewUrls.images[index]);
      setNewImages(prev => prev.filter((_, i) => i !== index));
      setPreviewUrls(prev => ({
        ...prev,
        images: prev.images.filter((_, i) => i !== index)
      }));
    } else if (type === 'pdfs') {
      URL.revokeObjectURL(previewUrls.pdfs[index]);
      setNewPdfs(prev => prev.filter((_, i) => i !== index));
      setPreviewUrls(prev => ({
        ...prev,
        pdfs: prev.pdfs.filter((_, i) => i !== index)
      }));
    } else if (type === 'mapImages') {
      URL.revokeObjectURL(previewUrls.mapImages[index]);
      setNewMapImages(prev => prev.filter((_, i) => i !== index));
      setPreviewUrls(prev => ({
        ...prev,
        mapImages: prev.mapImages.filter((_, i) => i !== index)
      }));
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.district || !formData.description) {
      alert('Please fill all required fields (Title, District, Description)');
      return;
    }

    try {
      setLoading(true);

      const submitData = new FormData();

      submitData.append('data', JSON.stringify({
        title: formData.title,
        district: formData.district,
        province: formData.province,
        description: formData.description,
        fullContent: formData.fullContent,
        researcher: formData.researcher,
        organization: formData.organization,
        links: formData.links
      }));

      submitData.append('existingImages', JSON.stringify(existingImages));
      submitData.append('existingPdfs', JSON.stringify(existingPdfs));
      submitData.append('existingMapImages', JSON.stringify(existingMapImages));

      newImages.forEach(file => {
        submitData.append('images', file);
      });

      newPdfs.forEach(file => {
        submitData.append('pdfs', file);
      });

      newMapImages.forEach(file => {
        submitData.append('mapImages', file);
      });

      const result = await onUpdate(research._id, submitData);

      if (result !== false) {
        const toastEvent = new CustomEvent('showToast', {
          detail: {
            message: '✅ Research updated successfully!',
            type: 'success'
          }
        });
        window.dispatchEvent(toastEvent);

        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (error) {
      console.error('Error updating research:', error);
      alert('❌ Failed to update research: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="edit-research-modal-overlay" onClick={onClose}>
      <div className="edit-research-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="edit-research-modal-header">
          <h2>✏️ Edit Research Paper</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="edit-research-tabs">
          <button
            className={activeTab === 'basic' ? 'active' : ''}
            onClick={() => setActiveTab('basic')}
          >
            📝 Basic Info
          </button>
          <button
            className={activeTab === 'content' ? 'active' : ''}
            onClick={() => setActiveTab('content')}
          >
            📄 Content
          </button>
          <button
            className={activeTab === 'images' ? 'active' : ''}
            onClick={() => setActiveTab('images')}
          >
            📸 Images ({existingImages.length + newImages.length})
          </button>
          <button
            className={activeTab === 'maps' ? 'active' : ''}
            onClick={() => setActiveTab('maps')}
          >
            🗺️ Maps ({existingMapImages.length + newMapImages.length})
          </button>
          <button
            className={activeTab === 'documents' ? 'active' : ''}
            onClick={() => setActiveTab('documents')}
          >
            📚 PDFs ({existingPdfs.length + newPdfs.length})
          </button>
        </div>

        <div className="edit-research-modal-body">
          {activeTab === 'basic' && (
            <div className="basic-info-tab">
              <div className="form-group">
                <label>Research Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Enter research title"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>District *</label>
                  <select
                    name="district"
                    value={formData.district}
                    onChange={handleInputChange}
                  >
                    <option value="">Select District</option>
                    {SRI_LANKA_DISTRICTS.map(district => (
                      <option key={district} value={district}>{district}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Province</label>
                  <select
                    name="province"
                    value={formData.province}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Province</option>
                    {PROVINCES.map(province => (
                      <option key={province} value={province}>{province}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Researcher Name</label>
                  <input
                    type="text"
                    name="researcher"
                    value={formData.researcher}
                    onChange={handleInputChange}
                    placeholder="Dr. Name"
                  />
                </div>

                <div className="form-group">
                  <label>Organization</label>
                  <input
                    type="text"
                    name="organization"
                    value={formData.organization}
                    onChange={handleInputChange}
                    placeholder="University / Institute"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Short Description / Abstract *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="4"
                  placeholder="Brief summary of the research..."
                />
              </div>

              <div className="form-group">
                <label>Related Links (comma separated)</label>
                <input
                  type="text"
                  value={linksInput}
                  onChange={handleLinksChange}
                  placeholder="https://example.com/study, https://example.com/data"
                />
                {formData.links.length > 0 && (
                  <div className="links-preview">
                    <small>{formData.links.length} link(s) added</small>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'content' && (
            <div className="content-tab">
              <div className="form-group">
                <label>Full Research Content</label>
                <textarea
                  name="fullContent"
                  value={formData.fullContent}
                  onChange={handleInputChange}
                  rows="12"
                  placeholder="Complete research findings, methodology, data analysis, conclusions..."
                  className="full-content-textarea"
                />
                <small className="helper-text">
                  Include methodology, findings, recommendations, and conclusion
                </small>
              </div>
            </div>
          )}

          {activeTab === 'images' && (
            <div className="files-tab">
              <div className="upload-area">
                <label className="upload-label">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleFileSelect(e, 'images')}
                    style={{ display: 'none' }}
                  />
                  <div className="upload-icon">📸</div>
                  <div>Click to add research images</div>
                  <small>Supported: JPG, PNG, GIF, WEBP (Max 5MB each)</small>
                </label>
              </div>

              {existingImages.length > 0 && (
                <div className="file-section">
                  <h4>📷 Existing Images ({existingImages.length})</h4>
                  <div className="file-grid">
                    {existingImages.map((img, idx) => (
                      <div key={idx} className="file-card">
                        <img src={`${API_URL}${img}`} alt={`Existing ${idx + 1}`} />
                        <button
                          type="button"
                          className="remove-file-btn"
                          onClick={() => removeExistingFile('images', idx)}
                          title="Delete image"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {previewUrls.images.length > 0 && (
                <div className="file-section">
                  <h4>🆕 New Images to Add ({previewUrls.images.length})</h4>
                  <div className="file-grid">
                    {previewUrls.images.map((url, idx) => (
                      <div key={idx} className="file-card">
                        <img src={url} alt={`New ${idx + 1}`} />
                        <button
                          type="button"
                          className="remove-file-btn"
                          onClick={() => removeNewFile('images', idx)}
                          title="Remove"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {existingImages.length === 0 && previewUrls.images.length === 0 && (
                <div className="no-files-message">
                  <p>📸 No images uploaded. Click above to add research images, charts, or diagrams.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'maps' && (
            <div className="files-tab">
              <div className="upload-area">
                <label className="upload-label">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleFileSelect(e, 'mapImages')}
                    style={{ display: 'none' }}
                  />
                  <div className="upload-icon">🗺️</div>
                  <div>Click to add map images</div>
                  <small>Supported: JPG, PNG, GIF, WEBP (Max 5MB each)</small>
                </label>
              </div>

              {existingMapImages.length > 0 && (
                <div className="file-section">
                  <h4>🗺️ Existing Maps ({existingMapImages.length})</h4>
                  <div className="file-grid">
                    {existingMapImages.map((img, idx) => (
                      <div key={idx} className="file-card">
                        <img src={`${API_URL}${img}`} alt={`Existing map ${idx + 1}`} />
                        <button
                          type="button"
                          className="remove-file-btn"
                          onClick={() => removeExistingFile('mapImages', idx)}
                          title="Delete map"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {previewUrls.mapImages.length > 0 && (
                <div className="file-section">
                  <h4>🆕 New Maps to Add ({previewUrls.mapImages.length})</h4>
                  <div className="file-grid">
                    {previewUrls.mapImages.map((url, idx) => (
                      <div key={idx} className="file-card">
                        <img src={url} alt={`New map ${idx + 1}`} />
                        <button
                          type="button"
                          className="remove-file-btn"
                          onClick={() => removeNewFile('mapImages', idx)}
                          title="Remove"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {existingMapImages.length === 0 && previewUrls.mapImages.length === 0 && (
                <div className="no-files-message">
                  <p>🗺️ No maps uploaded. Click above to add location maps or diagrams.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="files-tab">
              <div className="upload-area">
                <label className="upload-label">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    multiple
                    onChange={(e) => handleFileSelect(e, 'pdfs')}
                    style={{ display: 'none' }}
                  />
                  <div className="upload-icon">📚</div>
                  <div>Click to add research documents</div>
                  <small>Supported: PDF, DOC, DOCX (Max 10MB each)</small>
                </label>
              </div>

              {existingPdfs.length > 0 && (
                <div className="file-section">
                  <h4>📄 Existing Documents ({existingPdfs.length})</h4>
                  <div className="file-list">
                    {existingPdfs.map((pdf, idx) => (
                      <div key={idx} className="file-list-item">
                        <div className="file-icon">📄</div>
                        <div className="file-name">
                          {pdf.split('/').pop()}
                        </div>
                        <a
                          href={`${API_URL}${pdf}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="view-link"
                        >
                          View
                        </a>
                        <button
                          type="button"
                          className="remove-file-btn"
                          onClick={() => removeExistingFile('pdfs', idx)}
                          title="Delete document"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {newPdfs.length > 0 && (
                <div className="file-section">
                  <h4>🆕 New Documents to Add ({newPdfs.length})</h4>
                  <div className="file-list">
                    {newPdfs.map((file, idx) => (
                      <div key={idx} className="file-list-item">
                        <div className="file-icon">📄</div>
                        <div className="file-name">
                          {file.name}
                        </div>
                        <button
                          type="button"
                          className="remove-file-btn"
                          onClick={() => removeNewFile('pdfs', idx)}
                          title="Remove"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {existingPdfs.length === 0 && newPdfs.length === 0 && (
                <div className="no-files-message">
                  <p>📚 No PDF documents. Click above to add research papers, reports, or data sheets.</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="edit-research-modal-footer">
          <button
            type="button"
            className="cancel-btn"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="save-btn"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Saving...' : '💾 Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditResearchModal;