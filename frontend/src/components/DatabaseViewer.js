import React, { useState, useEffect } from 'react';
import { fetchIssues } from '../services/api';
import './DatabaseViewer.css';

function DatabaseViewer({ language, t }) {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list');

  useEffect(() => {
    loadIssues();
  }, []);

  const loadIssues = async () => {
    try {
      setLoading(true);
      const response = await fetchIssues();
      setIssues(response.data);
      const toastEvent = new CustomEvent('showToast', {
        detail: {
          message: `📊 ${t('loadedRecords') || 'Loaded'} ${response.data.length} ${t('records') || 'records'} ${t('fromDatabase') || 'from database'}`,
          type: 'success'
        }
      });
      window.dispatchEvent(toastEvent);
    } catch (error) {
      console.error('Error loading issues:', error);
      const toastEvent = new CustomEvent('showToast', {
        detail: {
          message: `❌ ${t('failedToLoad') || 'Failed to load database records'}`,
          type: 'error'
        }
      });
      window.dispatchEvent(toastEvent);
    } finally {
      setLoading(false);
    }
  };

  const filteredIssues = issues.filter(issue => {
    if (filter !== 'all' && issue.status !== filter) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (issue.title && issue.title.toLowerCase().includes(search)) ||
             (issue.description && issue.description.toLowerCase().includes(search)) ||
             (issue.district && issue.district.toLowerCase().includes(search));
    }
    return true;
  });

  const exportToJSON = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      totalRecords: issues.length,
      filteredRecords: filteredIssues.length,
      data: filteredIssues
    };
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `database_export_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    const toastEvent = new CustomEvent('showToast', {
      detail: {
        message: `📥 ${t('exported') || 'Exported'} ${filteredIssues.length} ${t('records') || 'records'} ${t('toJSON') || 'to JSON'}`,
        type: 'success'
      }
    });
    window.dispatchEvent(toastEvent);
  };

  const exportToCSV = () => {
    const headers = [t('id') || 'ID', t('title'), t('category') || 'Category', t('district'), t('status'), t('latitude'), t('longitude'), t('description'), t('createdAt') || 'Created At', t('resolution') || 'Resolution'];
    
    const csvRows = [];
    csvRows.push(headers.join(','));
    
    filteredIssues.forEach(issue => {
      const row = [
        `"${issue._id || ''}"`,
        `"${(issue.title || '').replace(/"/g, '""')}"`,
        `"${(issue.category || '').replace(/"/g, '""')}"`,
        `"${(issue.district || '').replace(/"/g, '""')}"`,
        `"${issue.status || 'pending'}"`,
        issue.lat || '',
        issue.lng || '',
        `"${(issue.description || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
        `"${new Date(issue.createdAt).toLocaleString()}"`,
        `"${(issue.resolution || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`
      ];
      csvRows.push(row.join(','));
    });
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `database_export_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    const toastEvent = new CustomEvent('showToast', {
      detail: {
        message: `📊 ${t('exported') || 'Exported'} ${filteredIssues.length} ${t('records') || 'records'} ${t('toCSV') || 'to CSV'}`,
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
            {t('databaseViewer')}
          </h1>
          <p>{t('databaseDescription') || 'View and manage all environmental issues reported in the system'}</p>
        </div>
        <div className="header-stats">
          <div className="stat-badge total">
            <span className="stat-number">{issues.length}</span>
            <span className="stat-label">{t('totalRecords') || 'Total Records'}</span>
          </div>
        </div>
      </div>

      <div className="controls-bar">
        <div className="search-section">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder={t('searchPlaceholder') || 'Search by title, description or district...'}
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
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="filter-select">
            <option value="all">📋 {t('all')}</option>
            <option value="pending">⏳ {t('pending') || 'Pending'}</option>
            <option value="resolved">✅ {t('resolved')}</option>
          </select>

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
          <button onClick={loadIssues} className="refresh-btn">🔄</button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <div className="stat-value">{issues.length}</div>
            <div className="stat-label">{t('totalIssues') || 'Total Issues'}</div>
          </div>
        </div>
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
        <div className="stat-card filtered">
          <div className="stat-icon">🎯</div>
          <div className="stat-info">
            <div className="stat-value">{filteredIssues.length}</div>
            <div className="stat-label">{t('showing') || 'Showing'}</div>
          </div>
        </div>
      </div>

      <div className="results-info">
        <span className="results-count">
          {t('showing') || 'Showing'} {filteredIssues.length} {t('of') || 'of'} {issues.length} {t('records') || 'records'}
        </span>
        {searchTerm && (
          <span className="search-term">
            {t('searchingFor') || 'Searching for'}: "{searchTerm}"
          </span>
        )}
      </div>

      {filteredIssues.length === 0 ? (
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
          {filteredIssues.map((issue, index) => (
            <div key={issue._id} className={`issue-item ${expandedId === issue._id ? 'expanded' : ''}`}>
              <div className="issue-header" onClick={() => setExpandedId(expandedId === issue._id ? null : issue._id)}>
                <div className="issue-info">
                  <div className="issue-title-row">
                    <span className="issue-number">#{index + 1}</span>
                    <h3 className="issue-title">{issue.title}</h3>
                    <span className={`status-badge ${issue.status}`}>
                      {getStatusIcon(issue.status)} {issue.status === 'resolved' ? t('resolved') : (t('pending') || 'Pending')}
                    </span>
                  </div>
                  <div className="issue-meta">
                    <span className="meta-item"><span className="meta-icon">📍</span>{issue.district}</span>
                    <span className="meta-item"><span className="meta-icon">📅</span>{new Date(issue.createdAt).toLocaleDateString()}</span>
                    <span className="meta-item"><span className="meta-icon">🏷️</span>{getCategoryIcon(issue.category)} {issue.category}</span>
                    <span className="meta-item"><span className="meta-icon">📌</span>{issue.lat?.toFixed(4)}, {issue.lng?.toFixed(4)}</span>
                  </div>
                  <p className="issue-preview">{truncateText(issue.description, 120)}</p>
                </div>
                <div className="expand-icon">{expandedId === issue._id ? '▲' : '▼'}</div>
              </div>

              {expandedId === issue._id && (
                <div className="issue-details">
                  <div className="details-section">
                    <strong>📝 {t('fullDescription') || 'Full Description'}:</strong>
                    <p>{issue.description}</p>
                  </div>
                  
                  <div className="details-grid">
                    <div className="detail-item">
                      <strong>🆔 {t('recordId') || 'Record ID'}</strong>
                      <code className="detail-code">{issue._id}</code>
                    </div>
                    <div className="detail-item">
                      <strong>📅 {t('createdAt') || 'Created At'}</strong>
                      <div>{new Date(issue.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="detail-item">
                      <strong>📍 {t('coordinates') || 'Coordinates'}</strong>
                      <div>{t('lat') || 'Lat'}: {issue.lat}, {t('lng') || 'Lng'}: {issue.lng}</div>
                    </div>
                    {issue.resolution && (
                      <div className="detail-item full-width">
                        <strong>✅ {t('resolutionNotes') || 'Resolution Notes'}</strong>
                        <p>{issue.resolution}</p>
                        {issue.resolvedBy && <small>{t('resolvedBy') || 'Resolved by'}: {issue.resolvedBy}</small>}
                      </div>
                    )}
                  </div>
                  
                  {issue.images && issue.images.length > 0 && (
                    <div className="details-images">
                      <strong>📸 {t('images')} ({issue.images.length})</strong>
                      <div className="image-preview-grid">
                        {issue.images.slice(0, 4).map((img, idx) => (
                          <img key={idx} src={`http://localhost:5001${img}`} alt={`Preview ${idx + 1}`} className="preview-image" onError={(e) => e.target.style.display = 'none'} />
                        ))}
                        {issue.images.length > 4 && <div className="more-images">+{issue.images.length - 4}</div>}
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
          {filteredIssues.map((issue) => (
            <div key={issue._id} className="grid-card" onClick={() => setExpandedId(expandedId === issue._id ? null : issue._id)}>
              <div className={`grid-status ${issue.status}`}>
                {getStatusIcon(issue.status)} {issue.status === 'resolved' ? t('resolved') : (t('pending') || 'Pending')}
              </div>
              <div className="grid-category">{getCategoryIcon(issue.category)} {issue.category}</div>
              <h4 className="grid-title">{issue.title}</h4>
              <div className="grid-location">📍 {issue.district}</div>
              <p className="grid-description">{truncateText(issue.description, 80)}</p>
              <div className="grid-date">📅 {new Date(issue.createdAt).toLocaleDateString()}</div>
              
              {expandedId === issue._id && (
                <div className="grid-expanded">
                  <div className="grid-expanded-content">
                    <p><strong>{t('fullDescription') || 'Full Description'}:</strong> {issue.description}</p>
                    {issue.resolution && <p><strong>{t('resolution') || 'Resolution'}:</strong> {issue.resolution}</p>}
                    {issue.images && issue.images.length > 0 && (
                      <div className="grid-images">
                        {issue.images.slice(0, 2).map((img, idx) => (
                          <img key={idx} src={`http://localhost:5001${img}`} alt="" />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="grid-expand-hint">
                {expandedId === issue._id ? `▲ ${t('tapToCollapse') || 'Tap to collapse'}` : `▼ ${t('tapToExpand') || 'Tap to expand'}`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default DatabaseViewer;