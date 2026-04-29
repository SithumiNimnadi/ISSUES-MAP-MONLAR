import React, { useState, useEffect } from 'react';
import './EditIssueModal.css';

const API_URL = 'http://localhost:5001';

function EditIssueModal({ issue, onClose, onUpdate }) {
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    description: '',
    district: '',
    seedlingType: '',
    harvestingTool: ''
  });

  const [existingImages, setExistingImages] = useState([]);
  const [existingMapImages, setExistingMapImages] = useState([]);
  const [existingPdfs, setExistingPdfs] = useState([]);

  const [newImages, setNewImages] = useState([]);
  const [newMapImages, setNewMapImages] = useState([]);
  const [newPdfs, setNewPdfs] = useState([]);

  const [previewUrls, setPreviewUrls] = useState({
    images: [],
    mapImages: [],
    pdfs: []
  });

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  const DISTRICTS = [
    'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
    'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
    'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
    'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
    'Monaragala', 'Ratnapura', 'Kegalle'
  ];

  const CATEGORIES = [
    'Waste & Pollution',
    'Deforestation',
    'Water Contamination',
    'Air Pollution',
    'Soil Erosion',
    'Wildlife Conflict'
  ];

  const SEEDLING_TYPES = [
    { value: '', label: '-- Select Paddy Seedling Type --' },
    { value: 'traditional', label: '🌾 Traditional Paddy Seedling' },
    { value: 'hybrid', label: '🌱 Hybrid Paddy Seedling' },
    { value: 'scented', label: '🌸 Scented Paddy Seedling (Basmati)' },
    { value: 'drought_resistant', label: '💧 Drought Resistant Seedling' },
    { value: 'submerged_tolerant', label: '💦 Submerged Tolerant Seedling' },
    { value: 'salt_tolerant', label: '🧂 Salt Tolerant Seedling' },
    { value: 'organic', label: '🌿 Organic Paddy Seedling' }
  ];

  const HARVESTING_TOOLS = [
    { value: '', label: '-- Select Harvesting Tool --' },
    { value: 'sickle_curved', label: '🔪 Curved Reaping Hook (Sickle)' },
    { value: 'sickle_serrated', label: '⚡ Serrated Sickle' },
    { value: 'sickle_heavy', label: '💪 Heavy Duty Sickle' },
    { value: 'scythe_traditional', label: '🌾 Traditional Scythe' },
    { value: 'hand_sickle', label: '✋ Hand Sickle' },
    { value: 'mini_sickle', label: '🔹 Mini Sickle (Short Handle)' },
    { value: 'power_sickle', label: '⚙️ Power Sickle / Reaper' }
  ];

  useEffect(() => {
    if (issue) {
      setFormData({
        title: issue.title || '',
        category: issue.category || '',
        description: issue.description || '',
        district: issue.district || '',
        seedlingType: issue.seedlingType || '',
        harvestingTool: issue.harvestingTool || ''
      });

      setExistingImages(issue.images || []);
      setExistingMapImages(issue.mapImages || []);
      setExistingPdfs(issue.pdfs || []);
    }
  }, [issue]);

  useEffect(() => {
    return () => {
      previewUrls.images.forEach(url => URL.revokeObjectURL(url));
      previewUrls.mapImages.forEach(url => URL.revokeObjectURL(url));
      previewUrls.pdfs.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  const handleInputChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
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
    }

    if (type === 'mapImages') {
      setNewMapImages(prev => [...prev, ...files]);
      setPreviewUrls(prev => ({
        ...prev,
        mapImages: [...prev.mapImages, ...previews]
      }));
    }

    if (type === 'pdfs') {
      setNewPdfs(prev => [...prev, ...files]);
      setPreviewUrls(prev => ({
        ...prev,
        pdfs: [...prev.pdfs, ...previews]
      }));
    }

    e.target.value = '';
  };

  const removeExistingFile = (type, index) => {
    const confirmDelete = window.confirm('Are you sure you want to remove this file?');

    if (!confirmDelete) return;

    if (type === 'images') {
      setExistingImages(prev => prev.filter((_, i) => i !== index));
    }

    if (type === 'mapImages') {
      setExistingMapImages(prev => prev.filter((_, i) => i !== index));
    }

    if (type === 'pdfs') {
      setExistingPdfs(prev => prev.filter((_, i) => i !== index));
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
    }

    if (type === 'mapImages') {
      URL.revokeObjectURL(previewUrls.mapImages[index]);

      setNewMapImages(prev => prev.filter((_, i) => i !== index));
      setPreviewUrls(prev => ({
        ...prev,
        mapImages: prev.mapImages.filter((_, i) => i !== index)
      }));
    }

    if (type === 'pdfs') {
      URL.revokeObjectURL(previewUrls.pdfs[index]);

      setNewPdfs(prev => prev.filter((_, i) => i !== index));
      setPreviewUrls(prev => ({
        ...prev,
        pdfs: prev.pdfs.filter((_, i) => i !== index)
      }));
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.description || !formData.district) {
      alert('Please fill all required fields');
      return;
    }

    try {
      setLoading(true);

      const submitData = new FormData();

      submitData.append('data', JSON.stringify({
        title: formData.title,
        category: formData.category,
        description: formData.description,
        district: formData.district,
        seedlingType: formData.seedlingType,
        harvestingTool: formData.harvestingTool,
        status: issue.status,
        resolution: issue.resolution,
        resolvedBy: issue.resolvedBy,
        resolvedAt: issue.resolvedAt
      }));

      submitData.append('existingImages', JSON.stringify(existingImages));
      submitData.append('existingMapImages', JSON.stringify(existingMapImages));
      submitData.append('existingPdfs', JSON.stringify(existingPdfs));

      newImages.forEach(file => {
        submitData.append('images', file);
      });

      newMapImages.forEach(file => {
        submitData.append('mapImages', file);
      });

      newPdfs.forEach(file => {
        submitData.append('pdfs', file);
      });

      // Call the onUpdate prop passed from parent
      const result = await onUpdate(issue._id, submitData);

      if (result !== false) {
        const toastEvent = new CustomEvent('showToast', {
          detail: {
            message: '✅ Issue updated successfully!',
            type: 'success'
          }
        });

        window.dispatchEvent(toastEvent);

        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (error) {
      console.error('Error updating issue:', error);
      alert('❌ Failed to update issue: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="edit-issue-modal-overlay" onClick={onClose}>
      <div className="edit-issue-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="edit-issue-modal-header">
          <h2>✏️ Edit Issue</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="edit-issue-tabs">
          <button
            className={activeTab === 'basic' ? 'active' : ''}
            onClick={() => setActiveTab('basic')}
          >
            📝 Basic Info
          </button>

          <button
            className={activeTab === 'photos' ? 'active' : ''}
            onClick={() => setActiveTab('photos')}
          >
            📸 Photos ({existingImages.length + newImages.length})
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
            📄 Documents ({existingPdfs.length + newPdfs.length})
          </button>
        </div>

        <div className="edit-issue-modal-body">
          {activeTab === 'basic' && (
            <div className="basic-info-tab">
              <div className="form-group">
                <label>Issue Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Enter issue title"
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
                    {DISTRICTS.map(district => (
                      <option key={district} value={district}>
                        {district}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Category</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                  >
                    <option value="">-- Select Category --</option>
                    {CATEGORIES.map(category => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Description *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="6"
                  placeholder="Describe the issue in detail..."
                />
              </div>
            </div>
          )}

          {activeTab === 'photos' && (
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
                  <div>Click to add new photos</div>
                  <small>Supported: JPG, PNG, GIF, WEBP</small>
                </label>
              </div>

              {existingImages.length > 0 && (
                <div className="file-section">
                  <h4>Existing Photos ({existingImages.length})</h4>
                  <div className="file-grid">
                    {existingImages.map((img, idx) => (
                      <div key={idx} className="file-card">
                        <img src={`${API_URL}${img}`} alt={`Existing ${idx + 1}`} />
                        <button
                          type="button"
                          className="remove-file-btn"
                          onClick={() => removeExistingFile('images', idx)}
                          title="Delete photo"
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
                  <h4>New Photos to Add ({previewUrls.images.length})</h4>
                  <div className="file-grid">
                    {previewUrls.images.map((url, idx) => (
                      <div key={idx} className="file-card">
                        <img src={url} alt={`New ${idx + 1}`} />
                        <button
                          type="button"
                          className="remove-file-btn"
                          onClick={() => removeNewFile('images', idx)}
                          title="Remove new photo"
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
                  <p>📸 No photos uploaded yet. Click above to add photos.</p>
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
                  <div>Click to add new map images</div>
                  <small>Supported: JPG, PNG, GIF, WEBP</small>
                </label>
              </div>

              {existingMapImages.length > 0 && (
                <div className="file-section">
                  <h4>Existing Maps ({existingMapImages.length})</h4>
                  <div className="file-grid">
                    {existingMapImages.map((img, idx) => (
                      <div key={idx} className="file-card">
                        <img src={`${API_URL}${img}`} alt={`Existing map ${idx + 1}`} />
                        <button
                          type="button"
                          className="remove-file-btn"
                          onClick={() => removeExistingFile('mapImages', idx)}
                          title="Delete map image"
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
                  <h4>New Maps to Add ({previewUrls.mapImages.length})</h4>
                  <div className="file-grid">
                    {previewUrls.mapImages.map((url, idx) => (
                      <div key={idx} className="file-card">
                        <img src={url} alt={`New map ${idx + 1}`} />
                        <button
                          type="button"
                          className="remove-file-btn"
                          onClick={() => removeNewFile('mapImages', idx)}
                          title="Remove new map"
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
                  <p>🗺️ No map images uploaded yet. Click above to add maps.</p>
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
                  <div className="upload-icon">📄</div>
                  <div>Click to add new documents</div>
                  <small>Supported: PDF, DOC, DOCX</small>
                </label>
              </div>

              {existingPdfs.length > 0 && (
                <div className="file-section">
                  <h4>Existing Documents ({existingPdfs.length})</h4>
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
                  <h4>New Documents to Add ({newPdfs.length})</h4>
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
                          title="Remove new document"
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
                  <p>📄 No documents uploaded yet. Click above to add documents.</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="edit-issue-modal-footer">
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

export default EditIssueModal;