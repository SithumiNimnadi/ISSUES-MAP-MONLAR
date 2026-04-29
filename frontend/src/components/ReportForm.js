import React, { useState, useEffect } from 'react';
import './ReportForm.css';

const DISTRICTS = [
  'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
  'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
  'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
  'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
  'Monaragala', 'Ratnapura', 'Kegalle'
];

function ReportForm({ selectedLocation, onSubmit, onGoToMap, language, t }) {
  const [formData, setFormData] = useState({
    title: '',
    category: 'Waste & Pollution',
    description: '',
    district: '',
    lat: selectedLocation?.lat || '',
    lng: selectedLocation?.lng || ''
  });
  
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [pdfs, setPdfs] = useState([]);
  const [pdfNames, setPdfNames] = useState([]);
  const [mapImages, setMapImages] = useState([]);
  const [mapPreviews, setMapPreviews] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (selectedLocation && selectedLocation.lat) {
      setFormData(prev => ({
        ...prev,
        lat: selectedLocation.lat,
        lng: selectedLocation.lng,
        district: selectedLocation.district || prev.district
      }));
      
      console.log(`📍 Location auto-filled: ${selectedLocation.lat}, ${selectedLocation.lng} - District: ${selectedLocation.district}`);
    }
  }, [selectedLocation]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const newImages = [...images, ...files];
    setImages(newImages);
    
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

  const handlePdfChange = (e) => {
    const files = Array.from(e.target.files);
    setPdfs([...pdfs, ...files]);
    const newNames = [...pdfNames, ...files.map(f => f.name)];
    setPdfNames(newNames);
  };

  const removePdf = (index) => {
    const newPdfs = [...pdfs];
    newPdfs.splice(index, 1);
    setPdfs(newPdfs);
    
    const newNames = [...pdfNames];
    newNames.splice(index, 1);
    setPdfNames(newNames);
  };

  const handleMapImageChange = (e) => {
    const files = Array.from(e.target.files);
    const newMapImages = [...mapImages, ...files];
    setMapImages(newMapImages);
    
    const newMapPreviews = [...mapPreviews];
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        newMapPreviews.push(ev.target.result);
        setMapPreviews([...newMapPreviews]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeMapImage = (index) => {
    const newMapImages = [...mapImages];
    newMapImages.splice(index, 1);
    setMapImages(newMapImages);
    
    const newMapPreviews = [...mapPreviews];
    newMapPreviews.splice(index, 1);
    setMapPreviews(newMapPreviews);
  };

  const handleGoToMap = () => {
    if (onGoToMap) onGoToMap();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description || !formData.district) {
      alert(t('fillFields'));
      return;
    }
    
    if (!formData.lat || !formData.lng) {
      alert(t('noLocation'));
      return;
    }
    
    setIsSubmitting(true);
    
    const submitData = new FormData();
    Object.keys(formData).forEach(key => {
      submitData.append(key, formData[key]);
    });
    
    images.forEach(image => submitData.append('images', image));
    pdfs.forEach(pdf => submitData.append('pdfs', pdf));
    mapImages.forEach(mapImage => submitData.append('mapImages', mapImage));
    
    await onSubmit(submitData);
    
    setFormData({
      title: '',
      category: 'Waste & Pollution',
      description: '',
      district: '',
      lat: '',
      lng: ''
    });
    setImages([]);
    setImagePreviews([]);
    setPdfs([]);
    setPdfNames([]);
    setMapImages([]);
    setMapPreviews([]);
    setIsSubmitting(false);
  };

  return (
    <div className="report-wrapper">
      <div className="report-card">
        <div className="report-header">
          <div className="header-icon">🌿</div>
          <h2>{t('reportTitle')}</h2>
          <p>{t('reportDescription') || 'Your voice matters. Help us protect Sri Lanka\'s nature.'}</p>
        </div>

        <form onSubmit={handleSubmit}>
          {selectedLocation && selectedLocation.lat ? (
            <div className="location-badge success">
              <span className="location-icon">📍</span>
              <span className="location-text">
                {t('selectedLocation')}: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
                {selectedLocation.district && selectedLocation.district !== 'Unknown' && (
                  <span style={{ display: 'block', fontSize: '12px', marginTop: '4px' }}>
                    📍 {t('district')}: <strong>{selectedLocation.district}</strong>
                  </span>
                )}
              </span>
              <button type="button" className="change-location-btn" onClick={handleGoToMap}>{t('changeLocation') || 'Change'}</button>
            </div>
          ) : (
            <div className="location-badge warning">
              <span className="location-icon">⚠️</span>
              <span className="location-text">{t('noLocation')}</span>
              <button type="button" className="go-to-map-btn" onClick={handleGoToMap}>🗺️ {t('backToMap')}</button>
            </div>
          )}

          <div className="input-group">
            <label>📝 {t('title')} <span className="required">*</span></label>
            <input name="title" type="text" placeholder={t('titlePlaceholder')} value={formData.title} onChange={handleChange} required />
          </div>

          <div className="row-2cols">
            <div className="input-group">
              <label>📍 {t('district')} <span className="required">*</span></label>
              <select 
                name="district" 
                value={formData.district} 
                onChange={handleChange} 
                required
                style={formData.district ? { borderColor: '#2d6a4f' } : {}}
              >
                <option value="">{t('selectDistrict')}</option>
                {DISTRICTS.map(d => <option key={d}>{d}</option>)}
              </select>
              {formData.district && (
                <small style={{ color: '#2d6a4f', marginTop: '4px', display: 'block' }}>
                  ✓ {t('districtAutoSelected') || 'District automatically selected from map'}
                </small>
              )}
            </div>
            <div className="input-group">
              <label>🏷️ {t('category') || 'Category'}</label>
              <select name="category" value={formData.category} onChange={handleChange}>
                <option>🗑️ Waste & Pollution</option>
                <option>🌳 Deforestation</option>
                <option>💧 Water Contamination</option>
                <option>🌫️ Air Pollution</option>
                <option>⛰️ Soil Erosion</option>
                <option>🐘 Wildlife Conflict</option>
              </select>
            </div>
          </div>

          <div className="input-group">
            <label>📖 {t('description')} <span className="required">*</span></label>
            <textarea name="description" placeholder={t('descriptionPlaceholder')} rows="4" value={formData.description} onChange={handleChange} required></textarea>
          </div>

          <div className="input-group">
            <label>📸 {t('images')} <span className="optional">({t('upTo') || 'up to'} 10)</span></label>
            <div className="upload-area" onClick={() => document.getElementById('imageInput').click()}>
              <div className="upload-placeholder">
                <span className="upload-icon">📷</span>
                <p>{t('uploadImages')}</p>
                <small>JPG, PNG, GIF up to 10MB each</small>
              </div>
              <input id="imageInput" type="file" accept="image/*" onChange={handleImageChange} multiple hidden />
            </div>
            {imagePreviews.length > 0 && (
              <div className="file-preview-grid">
                {imagePreviews.map((preview, idx) => (
                  <div key={idx} className="file-preview-item">
                    <img src={preview} alt={`Preview ${idx}`} />
                    <button type="button" onClick={() => removeImage(idx)}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="input-group">
            <label>🗺️ {t('mapImages')} <span className="optional">({t('upTo') || 'up to'} 5)</span></label>
            <div className="upload-area" onClick={() => document.getElementById('mapImageInput').click()}>
              <div className="upload-placeholder">
                <span className="upload-icon">🗺️</span>
                <p>{t('uploadMapImages')}</p>
                <small>{t('showAffectedArea') || 'Show the affected area on map'}</small>
              </div>
              <input id="mapImageInput" type="file" accept="image/*" onChange={handleMapImageChange} multiple hidden />
            </div>
            {mapPreviews.length > 0 && (
              <div className="file-preview-grid">
                {mapPreviews.map((preview, idx) => (
                  <div key={idx} className="file-preview-item">
                    <img src={preview} alt={`Map ${idx}`} />
                    <button type="button" onClick={() => removeMapImage(idx)}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="input-group">
            <label>📄 {t('pdfs')} <span className="optional">({t('upTo') || 'up to'} 5)</span></label>
            <div className="upload-area" onClick={() => document.getElementById('pdfInput').click()}>
              <div className="upload-placeholder">
                <span className="upload-icon">📑</span>
                <p>{t('uploadPDFs')}</p>
                <small>PDF files up to 20MB each</small>
              </div>
              <input id="pdfInput" type="file" accept=".pdf" onChange={handlePdfChange} multiple hidden />
            </div>
            {pdfNames.length > 0 && (
              <div className="pdf-list">
                {pdfNames.map((name, idx) => (
                  <div key={idx} className="pdf-item">
                    <span>📄 {name}</span>
                    <button type="button" onClick={() => removePdf(idx)}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button type="submit" className="submit-btn" disabled={isSubmitting}>
            {isSubmitting ? `${t('submitting') || 'Submitting...'} 🌿` : `✨ ${t('submitReport')}`}
          </button>
        </form>

        <div className="report-footer">
          <p>💚 {t('footerMessage') || 'Every report helps create a cleaner, greener Sri Lanka'}</p>
        </div>
      </div>
    </div>
  );
}

export default ReportForm;