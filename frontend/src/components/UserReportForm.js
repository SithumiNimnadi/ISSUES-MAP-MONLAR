import React, { useState } from 'react';
import axios from 'axios';
import './UserReportForm.css';

function UserReportForm({ onClose, t }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    district: '',
    reporterName: '',
    reporterEmail: '',
    category: 'Other'
  });
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const categories = [
    'Waste & Pollution',
    'Deforestation',
    'Water Contamination',
    'Air Pollution',
    'Soil Erosion',
    'Wildlife Conflict',
    'Climate Change',
    'Other'
  ];

  const districts = [
    'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
    'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
    'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
    'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
    'Monaragala', 'Ratnapura', 'Kegalle'
  ];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const maxFiles = 5;
    if (images.length + files.length > maxFiles) {
      setError(`You can only upload up to ${maxFiles} images`);
      return;
    }
    
    setImages([...images, ...files]);
    
    const newPreviews = [...imagePreviews];
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        newPreviews.push(ev.target.result);
        setImagePreviews([...newPreviews]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
    
    const newPreviews = [...imagePreviews];
    newPreviews.splice(index, 1);
    setImagePreviews(newPreviews);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const submitData = new FormData();
      Object.keys(formData).forEach(key => {
        submitData.append(key, formData[key]);
      });
      images.forEach(image => submitData.append('images', image));

      const response = await axios.post('http://localhost:5001/api/user-reports', submitData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000
      });

      if (response.data.success) {
        setSubmitted(true);
        
        // Dispatch event to notify dashboard to refresh
        window.dispatchEvent(new CustomEvent('reportSubmitted'));
        
        const toastEvent = new CustomEvent('showToast', {
          detail: {
            message: '✅ Thank you! Your report has been sent to the admin.',
            type: 'success'
          }
        });
        window.dispatchEvent(toastEvent);
        
        setTimeout(() => {
          onClose();
        }, 3000);
      }
    } catch (err) {
      console.error('Submission error:', err);
      let errorMsg = 'Failed to submit report. ';
      
      if (err.response) {
        errorMsg += err.response.data?.error || err.response.data?.message || 'Server error';
      } else if (err.request) {
        errorMsg += 'No response from server. Please try again later.';
      } else {
        errorMsg += err.message;
      }
      
      setError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="report-modal-overlay" onClick={onClose}>
        <div className="report-modal success">
          <div className="success-icon">✅</div>
          <h3>Report Submitted Successfully!</h3>
          <p>Thank you for helping protect the environment.</p>
          <p className="small">The admin will review your report and take appropriate action.</p>
          <button onClick={onClose} className="close-btn">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="report-modal-overlay" onClick={onClose}>
      <div className="report-modal" onClick={(e) => e.stopPropagation()}>
        <div className="report-modal-header">
          <h2>🌿 Report Environmental Issue</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="report-modal-body">
          <p className="info-text">
            📢 Notice an environmental issue in your area? Let us know! Our team will review and take action.
          </p>
          
          {error && <div className="error-message">{error}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Your Name *</label>
                <input
                  type="text"
                  name="reporterName"
                  value={formData.reporterName}
                  onChange={handleChange}
                  required
                  placeholder="Enter your full name"
                />
              </div>
              
              <div className="form-group">
                <label>Your Email *</label>
                <input
                  type="email"
                  name="reporterEmail"
                  value={formData.reporterEmail}
                  onChange={handleChange}
                  required
                  placeholder="For updates on your report"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Issue Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="Brief title of the environmental issue"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Location *</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  required
                  placeholder="Specific location (e.g., street name, landmark)"
                />
              </div>
              
              <div className="form-group">
                <label>District *</label>
                <select name="district" value={formData.district} onChange={handleChange} required>
                  <option value="">Select District</option>
                  {districts.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Category</label>
              <select name="category" value={formData.category} onChange={handleChange}>
                {categories.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Description of the Issue *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows="5"
                placeholder="Please describe the environmental issue in detail..."
              />
            </div>

            <div className="form-group">
              <label>📸 Upload Photos (Optional - Max 5)</label>
              <div className="upload-area" onClick={() => document.getElementById('reportImageInput').click()}>
                <span className="upload-icon">📷</span>
                <p>Click to upload photos of the issue</p>
                <small>JPG, PNG up to 5MB each</small>
              </div>
              <input
                id="reportImageInput"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                multiple
                hidden
              />
              {imagePreviews.length > 0 && (
                <div className="image-preview-grid">
                  {imagePreviews.map((preview, idx) => (
                    <div key={idx} className="image-preview-item">
                      <img src={preview} alt={`Preview ${idx}`} />
                      <button type="button" onClick={() => removeImage(idx)}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-buttons">
              <button type="button" className="cancel-btn" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="submit-btn" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : '📢 Submit Report'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default UserReportForm;