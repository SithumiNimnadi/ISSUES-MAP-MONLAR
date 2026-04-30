import React, { useState, useEffect } from 'react';
import { fetchIssues } from '../services/api';
import axios from 'axios';
import './DatabaseViewer.css';

const API_URL = 'http://localhost:5001';

function DatabaseViewer({ language, t }) {
  const [issues, setIssues] = useState([]);
  const [research, setResearch] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [dataType, setDataType] = useState('issues'); // 'issues' or 'research'

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadIssues(),
        loadResearch()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadIssues = async () => {
    try {
      const response = await fetchIssues();
      setIssues(response.data);
      const toastEvent = new CustomEvent('showToast', {
        detail: {
          message: `📊 ${t('loadedRecords') || 'Loaded'} ${response.data.length} ${t('issues') || 'issues'} ${t('fromDatabase') || 'from database'}`,
          type: 'success'
        }
      });
      window.dispatchEvent(toastEvent);
    } catch (error) {
      console.error('Error loading issues:', error);
    }
  };

  const loadResearch = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/research`);
      setResearch(response.data);
      const toastEvent = new CustomEvent('showToast', {
        detail: {
          message: `📚 ${t('loadedRecords') || 'Loaded'} ${response.data.length} ${t('research') || 'research papers'} ${t('fromDatabase') || 'from database'}`,
          type: 'success'
        }
      });
      window.dispatchEvent(toastEvent);
    } catch (error) {
      console.error('Error loading research:', error);
    }
  };

  // Get current data based on selected type
  const currentData = dataType === 'issues' ? issues : research;
  
  // Get item type label
  const getItemTypeLabel = (item) => {
    if (dataType === 'issues') return t('issue') || 'Issue';
    return t('research') || 'Research';
  };

  const filteredData = currentData.filter(item => {
    if (filter !== 'all') {
      if (dataType === 'issues' && item.status !== filter) return false;
      if (dataType === 'research' && filter === 'resolved') return false; // Research doesn't have status
    }
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (item.title && item.title.toLowerCase().includes(search)) ||
             (item.description && item.description.toLowerCase().includes(search)) ||
             (item.district && item.district.toLowerCase().includes(search)) ||
             (dataType === 'research' && item.researcher && item.researcher.toLowerCase().includes(search));
    }
    return true;
  });

  const exportToJSON = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      dataType: dataType,
      totalRecords: currentData.length,
      filteredRecords: filteredData.length,
      data: filteredData
    };
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `${dataType}_export_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    const toastEvent = new CustomEvent('showToast', {
      detail: {
        message: `📥 ${t('exported') || 'Exported'} ${filteredData.length} ${t('records') || 'records'} ${t('toJSON') || 'to JSON'}`,
        type: 'success'
      }
    });
    window.dispatchEvent(toastEvent);
  };

  const exportToCSV = () => {
    let headers, csvRows = [];
    
    if (dataType === 'issues') {
      headers = [t('id') || 'ID', t('title'), t('category') || 'Category', t('district'), t('status'), t('latitude'), t('longitude'), t('description'), t('createdAt') || 'Created At', t('resolution') || 'Resolution'];
    } else {
      headers = [t('id') || 'ID', t('title'), t('district'), t('province') || 'Province', t('researcher') || 'Researcher', t('organization') || 'Organization', t('description'), t('fullContent') || 'Full Content', t('createdAt') || 'Created At', t('links') || 'Links'];
    }
    
    csvRows.push(headers.join(','));
    
    filteredData.forEach(item => {
      let row;
      if (dataType === 'issues') {
        row = [
          `"${item._id || ''}"`,
          `"${(item.title || '').replace(/"/g, '""')}"`,
          `"${(item.category || '').replace(/"/g, '""')}"`,
          `"${(item.district || '').replace(/"/g, '""')}"`,
          `"${item.status || 'pending'}"`,
          item.lat || '',
          item.lng || '',
          `"${(item.description || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
          `"${new Date(item.createdAt).toLocaleString()}"`,
          `"${(item.resolution || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`
        ];
      } else {
        row = [
          `"${item._id || ''}"`,
          `"${(item.title || '').replace(/"/g, '""')}"`,
          `"${(item.district || '').replace(/"/g, '""')}"`,
          `"${(item.province || '').replace(/"/g, '""')}"`,
          `"${(item.researcher || '').replace(/"/g, '""')}"`,
          `"${(item.organization || '').replace(/"/g, '""')}"`,
          `"${(item.description || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
          `"${(item.fullContent || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
          `"${new Date(item.createdAt).toLocaleString()}"`,
          `"${(item.links || []).join('; ').replace(/"/g, '""')}"`
        ];
      }
      csvRows.push(row.join(','));
    });
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dataType}_export_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    const toastEvent = new CustomEvent('showToast', {
      detail: {
        message: `📊 ${t('exported') || 'Exported'} ${filteredData.length} ${t('records') || 'records'} ${t('toCSV') || 'to CSV'}`,
        type: 'success'
      }
    });
    window.dispatchEvent(toastEvent);
  };

  const getStatusIcon = (status) => {
    return status === 'pending' ? '⏳' : '✅';
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'Waste & Pollution': '🗑️',
      'Deforestation': '🌲',
      'Water Pollution': '💧',
      'Air Pollution': '🌫️',
      'Soil Contamination': '🧪',
      'Wildlife Conflict': '🐘',
      'Climate Change': '🌡️',
      'Other': '🌿'
    };
    return icons[category] || '🌍';
  };

  const truncateText = (text, maxLength = 100) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const refreshData = () => {
    loadIssues();
    loadResearch();
  };

  if (loading) {
    return (
      <div className="database-viewer loading-state">
        <div className="loading-spinner"></div>
        <p>🌿 {t('loading')}</p>
      </div>
    );
  }

  return (
    <div className="database-viewer">
      <div className="database-header">
        <div className="header-content">
          <h1>
            <span className="header-icon">🗄️</span>
            {dataType === 'issues' ? t('databaseViewer') : t('researchDatabase') || 'Research Database'}
          </h1>
          <p>{dataType === 'issues' 
            ? (t('Database Description') || 'View and manage all environmental issues reported in the system')
            : (t('Research Description') || 'View all research papers and studies in the system')
          }</p>
        </div>
        <div className="header-stats">
          <div className="stat-badge total">
            <span className="stat-number">{currentData.length}</span>
            <span className="stat-label">{dataType === 'issues' ? (t('totalRecords') || 'Total Records') : (t('totalResearch') || 'Total Research')}</span>
          </div>
        </div>
      </div>

      {/* Data Type Toggle */}
      <div className="data-type-toggle">
        <button 
          className={`data-type-btn ${dataType === 'issues' ? 'active' : ''}`}
          onClick={() => setDataType('issues')}
        >
          📋 {t('issues') || 'Issues'} ({issues.length})
        </button>
        <button 
          className={`data-type-btn ${dataType === 'research' ? 'active' : ''}`}
          onClick={() => setDataType('research')}
        >
          🔬 {t('research') || 'Research'} ({research.length})
        </button>
      </div>

      <div className="controls-bar">
        <div className="search-section">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder={dataType === 'issues' 
                ? (t('searchPlaceholder') || 'Search by title, description or district...')
                : (t('researchSearchPlaceholder') || 'Search by title, researcher, district...')
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <button className="clear-search" onClick={() => setSearchTerm('')}>✕</button>
            )}
          </div>
        </div>

        <div className="filter-section">
          {dataType === 'issues' && (
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="filter-select">
              <option value="all">📋 {t('all')}</option>
              <option value="pending">⏳ {t('pending') || 'Pending'}</option>
              <option value="resolved">✅ {t('resolved')}</option>
            </select>
          )}

          <div className="view-toggle">
            <button className={`view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} title={t('listView') || 'List View'}>
              📋 {t('list') || 'List'}
            </button>
            <button className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')} title={t('gridView') || 'Grid View'}>
              🖼️ {t('grid') || 'Grid'}
            </button>
          </div>
        </div>

        <div className="export-section">
          <button onClick={exportToJSON} className="export-btn json-btn">📥 JSON</button>
          <button onClick={exportToCSV} className="export-btn csv-btn">📊 CSV</button>
          <button onClick={refreshData} className="refresh-btn">🔄</button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <div className="stat-value">{currentData.length}</div>
            <div className="stat-label">{dataType === 'issues' ? (t('totalIssues') || 'Total Issues') : (t('totalResearch') || 'Total Research')}</div>
          </div>
        </div>
        {dataType === 'issues' && (
          <>
            <div className="stat-card pending">
              <div className="stat-icon">⏳</div>
              <div className="stat-info">
                <div className="stat-value">{issues.filter(i => i.status === 'pending').length}</div>
                <div className="stat-label">{t('pending') || 'Pending'}</div>
              </div>
            </div>
            <div className="stat-card resolved">
              <div className="stat-icon">✅</div>
              <div className="stat-info">
                <div className="stat-value">{issues.filter(i => i.status === 'resolved').length}</div>
                <div className="stat-label">{t('resolved')}</div>
              </div>
            </div>
          </>
        )}
        {dataType === 'research' && (
          <>
            <div className="stat-card">
              <div className="stat-icon">👨‍🔬</div>
              <div className="stat-info">
                <div className="stat-value">{research.filter(r => r.researcher).length}</div>
                <div className="stat-label">{t('withResearchers') || 'With Researchers'}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🔗</div>
              <div className="stat-info">
                <div className="stat-value">{research.filter(r => r.connectedIssues?.length > 0).length}</div>
                <div className="stat-label">{t('connectedToIssues') || 'Connected to Issues'}</div>
              </div>
            </div>
          </>
        )}
        <div className="stat-card filtered">
          <div className="stat-icon">🎯</div>
          <div className="stat-info">
            <div className="stat-value">{filteredData.length}</div>
            <div className="stat-label">{t('showing') || 'Showing'}</div>
          </div>
        </div>
      </div>

      <div className="results-info">
        <span className="results-count">
          {t('showing') || 'Showing'} {filteredData.length} {t('of') || 'of'} {currentData.length} {t('records') || 'records'}
        </span>
        {searchTerm && (
          <span className="search-term">
            {t('searchingFor') || 'Searching for'}: "{searchTerm}"
          </span>
        )}
      </div>

      {filteredData.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🗄️</div>
          <h3>{t('noRecordsFound') || 'No Records Found'}</h3>
          <p>{t('adjustCriteria') || 'Try adjusting your search or filter criteria'}</p>
          <button onClick={() => { setSearchTerm(''); setFilter('all'); }} className="clear-filters-btn">
            {t('clearFilters') || 'Clear Filters'}
          </button>
        </div>
      ) : viewMode === 'list' ? (
        <div className="issues-list">
          {filteredData.map((item, index) => (
            <div key={item._id} className={`issue-item ${expandedId === item._id ? 'expanded' : ''}`}>
              <div className="issue-header" onClick={() => setExpandedId(expandedId === item._id ? null : item._id)}>
                <div className="issue-info">
                  <div className="issue-title-row">
                    <span className="issue-number">#{index + 1}</span>
                    <h3 className="issue-title">{item.title}</h3>
                    {dataType === 'issues' && (
                      <span className={`status-badge ${item.status}`}>
                        {getStatusIcon(item.status)} {item.status === 'resolved' ? t('resolved') : (t('pending') || 'Pending')}
                      </span>
                    )}
                    {dataType === 'research' && (
                      <span className="status-badge research">
                        🔬 {t('research') || 'Research'}
                      </span>
                    )}
                  </div>
                  <div className="issue-meta">
                    <span className="meta-item"><span className="meta-icon">📍</span>{item.district}</span>
                    {dataType === 'issues' && item.category && (
                      <span className="meta-item"><span className="meta-icon">🏷️</span>{getCategoryIcon(item.category)} {item.category}</span>
                    )}
                    {dataType === 'research' && item.province && (
                      <span className="meta-item"><span className="meta-icon">🗺️</span>{item.province}</span>
                    )}
                    <span className="meta-item"><span className="meta-icon">📅</span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    {dataType === 'research' && item.researcher && (
                      <span className="meta-item"><span className="meta-icon">👨‍🔬</span>{item.researcher}</span>
                    )}
                  </div>
                  <p className="issue-preview">{truncateText(item.description, 120)}</p>
                </div>
                <div className="expand-icon">{expandedId === item._id ? '▲' : '▼'}</div>
              </div>

              {expandedId === item._id && (
                <div className="issue-details">
                  <div className="details-section">
                    <strong>📝 {t('fullDescription') || 'Full Description'}:</strong>
                    <p>{item.description}</p>
                  </div>
                  
                  {dataType === 'research' && item.fullContent && (
                    <div className="details-section">
                      <strong>📄 {t('fullResearch') || 'Full Research Content'}:</strong>
                      <p>{item.fullContent}</p>
                    </div>
                  )}
                  
                  <div className="details-grid">
                    <div className="detail-item">
                      <strong>🆔 {t('recordId') || 'Record ID'}</strong>
                      <code className="detail-code">{item._id}</code>
                    </div>
                    <div className="detail-item">
                      <strong>📅 {t('createdAt') || 'Created At'}</strong>
                      <div>{new Date(item.createdAt).toLocaleString()}</div>
                    </div>
                    
                    {dataType === 'issues' && (
                      <>
                        <div className="detail-item">
                          <strong>📍 {t('coordinates') || 'Coordinates'}</strong>
                          <div>{t('lat') || 'Lat'}: {item.lat}, {t('lng') || 'Lng'}: {item.lng}</div>
                        </div>
                        {item.resolution && (
                          <div className="detail-item full-width">
                            <strong>✅ {t('resolutionNotes') || 'Resolution Notes'}</strong>
                            <p>{item.resolution}</p>
                            {item.resolvedBy && <small>{t('resolvedBy') || 'Resolved by'}: {item.resolvedBy}</small>}
                          </div>
                        )}
                      </>
                    )}
                    
                    {dataType === 'research' && (
                      <>
                        {item.organization && (
                          <div className="detail-item">
                            <strong>🏢 {t('organization') || 'Organization'}</strong>
                            <div>{item.organization}</div>
                          </div>
                        )}
                        {item.links && item.links.length > 0 && (
                          <div className="detail-item full-width">
                            <strong>🔗 {t('relatedLinks') || 'Related Links'}:</strong>
                            <div className="links-list">
                              {item.links.map((link, idx) => (
                                <a key={idx} href={link} target="_blank" rel="noopener noreferrer" className="detail-link">
                                  {link.length > 50 ? link.substring(0, 50) + '...' : link}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                        {item.connectedIssues && item.connectedIssues.length > 0 && (
                          <div className="detail-item full-width">
                            <strong>🔗 {t('connectedIssues') || 'Connected Issues'}:</strong>
                            <div className="connected-badges">
                              {item.connectedIssues.map((issue, idx) => (
                                <span key={idx} className="connected-badge">
                                  📋 {typeof issue === 'object' ? issue.title : issue}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  
                  {item.images && item.images.length > 0 && (
                    <div className="details-images">
                      <strong>📸 {t('images')} ({item.images.length})</strong>
                      <div className="image-preview-grid">
                        {item.images.slice(0, 4).map((img, idx) => (
                          <img key={idx} src={`${API_URL}${img}`} alt={`Preview ${idx + 1}`} className="preview-image" onError={(e) => e.target.style.display = 'none'} />
                        ))}
                        {item.images.length > 4 && <div className="more-images">+{item.images.length - 4}</div>}
                      </div>
                    </div>
                  )}
                  
                  {dataType === 'research' && item.mapImages && item.mapImages.length > 0 && (
                    <div className="details-images">
                      <strong>🗺️ {t('mapImages')} ({item.mapImages.length})</strong>
                      <div className="image-preview-grid">
                        {item.mapImages.slice(0, 4).map((img, idx) => (
                          <img key={idx} src={`${API_URL}${img}`} alt={`Map ${idx + 1}`} className="preview-image" onError={(e) => e.target.style.display = 'none'} />
                        ))}
                        {item.mapImages.length > 4 && <div className="more-images">+{item.mapImages.length - 4}</div>}
                      </div>
                    </div>
                  )}
                  
                  {dataType === 'research' && item.pdfs && item.pdfs.length > 0 && (
                    <div className="details-pdfs">
                      <strong>📚 {t('documents') || 'Documents'} ({item.pdfs.length})</strong>
                      <div className="pdf-links">
                        {item.pdfs.map((pdf, idx) => (
                          <a key={idx} href={`${API_URL}${pdf}`} target="_blank" className="pdf-link" rel="noopener noreferrer">
                            📄 {t('download') || 'Download'} {t('document') || 'Document'} {idx + 1}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="issues-grid">
          {filteredData.map((item) => (
            <div key={item._id} className="grid-card" onClick={() => setExpandedId(expandedId === item._id ? null : item._id)}>
              {dataType === 'issues' ? (
                <div className={`grid-status ${item.status}`}>
                  {getStatusIcon(item.status)} {item.status === 'resolved' ? t('resolved') : (t('pending') || 'Pending')}
                </div>
              ) : (
                <div className="grid-status research">
                  🔬 {t('research') || 'Research'}
                </div>
              )}
              {dataType === 'issues' && item.category && (
                <div className="grid-category">{getCategoryIcon(item.category)} {item.category}</div>
              )}
              {dataType === 'research' && item.researcher && (
                <div className="grid-category">👨‍🔬 {item.researcher}</div>
              )}
              <h4 className="grid-title">{item.title}</h4>
              <div className="grid-location">📍 {item.district}</div>
              <p className="grid-description">{truncateText(item.description, 80)}</p>
              <div className="grid-date">📅 {new Date(item.createdAt).toLocaleDateString()}</div>
              
              {expandedId === item._id && (
                <div className="grid-expanded">
                  <div className="grid-expanded-content">
                    <p><strong>{t('fullDescription') || 'Full Description'}:</strong> {item.description}</p>
                    {dataType === 'research' && item.fullContent && (
                      <p><strong>{t('fullResearch') || 'Full Research'}:</strong> {truncateText(item.fullContent, 150)}</p>
                    )}
                    {dataType === 'issues' && item.resolution && (
                      <p><strong>{t('resolution') || 'Resolution'}:</strong> {item.resolution}</p>
                    )}
                    {item.images && item.images.length > 0 && (
                      <div className="grid-images">
                        {item.images.slice(0, 2).map((img, idx) => (
                          <img key={idx} src={`${API_URL}${img}`} alt="" />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="grid-expand-hint">
                {expandedId === item._id ? `▲ ${t('tapToCollapse') || 'Tap to collapse'}` : `▼ ${t('tapToExpand') || 'Tap to expand'}`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default DatabaseViewer;