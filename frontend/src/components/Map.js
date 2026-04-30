import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import IssueDetailModal from './IssueDetailModal';

// Fix default icon issues
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons based on category
const getMarkerIcon = (category, status) => {
  if (status === 'resolved') {
    return L.divIcon({
      className: 'custom-marker resolved-marker',
      html: `<div class="marker-content resolved">
              <span>✅</span>
             </div>`,
      iconSize: [40, 40],
      popupAnchor: [0, -20]
    });
  }

  const normalizedCategory = category ? category.trim() : '';
  
  const categoryIcons = {
    'Waste & Pollution': '🗑️',
    'Waste and Pollution': '🗑️',
    'Deforestation': '🌳',
    'Water Contamination': '💧',
    'Air Pollution': '🌫️',
    'Soil Erosion': '⛰️',
    'Wildlife Conflict': '🐘'
  };

  let icon = categoryIcons[normalizedCategory];
  let gradient = 'linear-gradient(135deg, #2d6a4f, #1b4332)';
  
  if (!icon) {
    if (normalizedCategory.includes('Waste') || normalizedCategory.includes('Pollution')) {
      icon = '🗑️';
      gradient = 'linear-gradient(135deg, #e74c3c, #c0392b)';
    } else if (normalizedCategory.includes('Deforestation')) {
      icon = '🌳';
      gradient = 'linear-gradient(135deg, #27ae60, #1e8449)';
    } else if (normalizedCategory.includes('Water')) {
      icon = '💧';
      gradient = 'linear-gradient(135deg, #3498db, #2980b9)';
    } else if (normalizedCategory.includes('Air')) {
      icon = '🌫️';
      gradient = 'linear-gradient(135deg, #95a5a6, #7f8c8d)';
    } else if (normalizedCategory.includes('Soil')) {
      icon = '⛰️';
      gradient = 'linear-gradient(135deg, #d35400, #a04000)';
    } else if (normalizedCategory.includes('Wildlife')) {
      icon = '🐘';
      gradient = 'linear-gradient(135deg, #f39c12, #e67e22)';
    } else {
      icon = '📍';
    }
  }
  
  return L.divIcon({
    className: 'custom-marker',
    html: `<div class="marker-content" style="background: ${gradient};">
            <span>${icon}</span>
           </div>`,
    iconSize: [45, 45],
    popupAnchor: [0, -22]
  });
};

const getDistrictFromNominatim = async (lat, lng) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
      { headers: { 'User-Agent': 'EcoGuardian-App/1.0' } }
    );
    const data = await response.json();
    const district = data.address?.county || data.address?.state_district || data.address?.region;
    
    const sriLankaDistricts = [
      'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
      'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
      'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
      'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
      'Monaragala', 'Ratnapura', 'Kegalle'
    ];
    
    for (const d of sriLankaDistricts) {
      if (district && district.includes(d)) return d;
    }
    return district || null;
  } catch (error) {
    console.error('Error getting district:', error);
    return null;
  }
};

const getSelectedMarkerIcon = () => {
  return L.divIcon({
    className: 'selected-marker',
    html: `<div class="selected-marker-content">
            <span>📍</span>
            <div class="pulse-ring"></div>
           </div>`,
    iconSize: [50, 50],
    popupAnchor: [0, -25]
  });
};

const getCategoryColor = (category) => {
  const colors = {
    'Waste & Pollution': '#e74c3c',
    'Deforestation': '#27ae60',
    'Water Contamination': '#3498db',
    'Air Pollution': '#95a5a6',
    'Soil Erosion': '#d35400',
    'Wildlife Conflict': '#f39c12'
  };
  return colors[category] || '#2d6a4f';
};

const escapeHtml = (text) => {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

function Map({ issues, onMapClick, language, t }) {
  const mapRef = useRef(null);
  const markerClusterRef = useRef(null);
  const selectedMarkerRef = useRef(null);
  const legendRef = useRef(null);
  const searchMarkerRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mapInitialized, setMapInitialized] = useState(false);

  // Search location function
  const searchLocation = async (query) => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    setShowSuggestions(false);
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&countrycodes=lk`,
        {
          headers: {
            'User-Agent': 'EcoGuardian-App/1.0'
          }
        }
      );
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        setSearchResults(data);
        setShowSuggestions(true);
      } else {
        const notification = document.createElement('div');
        notification.textContent = 'No locations found. Try a different search term.';
        notification.style.cssText = `
          position: fixed;
          top: 80px;
          right: 20px;
          background: #e74c3c;
          color: white;
          padding: 10px 20px;
          border-radius: 8px;
          z-index: 2000;
          font-size: 14px;
          animation: fadeOut 3s ease-in-out;
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
      }
    } catch (error) {
      console.error('Error searching location:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Fly to selected location
  const flyToLocation = (lat, lon, displayName) => {
    if (mapRef.current) {
      // Disable animation temporarily to avoid errors
      const originalZoomAnimation = mapRef.current.options.zoomAnimation;
      mapRef.current.options.zoomAnimation = false;
      
      try {
        mapRef.current.flyTo([parseFloat(lat), parseFloat(lon)], 14, {
          duration: 1.5,
          easeLinearity: 0.25
        });
      } catch (error) {
        console.warn('FlyTo error, using setView instead:', error);
        mapRef.current.setView([parseFloat(lat), parseFloat(lon)], 14);
      }
      
      // Restore animation
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.options.zoomAnimation = originalZoomAnimation;
        }
      }, 2000);
      
      // Remove previous search marker if exists
      if (searchMarkerRef.current) {
        mapRef.current.removeLayer(searchMarkerRef.current);
      }
      
      // Add a temporary marker for the searched location
      const searchIcon = L.divIcon({
        className: 'search-marker',
        html: `<div class="search-marker-content">
                <span>🔍</span>
                <div class="search-pulse"></div>
               </div>`,
        iconSize: [40, 40],
        popupAnchor: [0, -20]
      });
      
      searchMarkerRef.current = L.marker([parseFloat(lat), parseFloat(lon)], {
        icon: searchIcon,
        zIndexOffset: 1000
      }).addTo(mapRef.current);
      
      searchMarkerRef.current.bindPopup(`
        <div class="search-popup">
          <strong>🔍 Searched Location</strong><br/>
          <small>${escapeHtml(displayName)}</small>
        </div>
      `).openPopup();
      
      // Remove marker after 5 seconds
      setTimeout(() => {
        if (searchMarkerRef.current && mapRef.current) {
          mapRef.current.removeLayer(searchMarkerRef.current);
          searchMarkerRef.current = null;
        }
      }, 5000);
    }
    setShowSuggestions(false);
    setSearchQuery('');
  };

  // Handle search input submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      searchLocation(searchQuery);
    }
  };

  // Initialize map
  useEffect(() => {
    // Make sure the map container exists
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
      console.error('Map container not found!');
      return;
    }

    // Check if map is already initialized
    if (mapRef.current || mapInitialized) return;

    // Wait for container to be ready
    const timer = setTimeout(() => {
      try {
        // Create map with safe options (disable animations to prevent errors)
        mapRef.current = L.map('map', {
          zoomAnimation: false,
          fadeAnimation: false,
          markerZoomAnimation: false,
          inertia: false
        }).setView([7.8731, 80.7718], 7.5);
        
        // Add tile layer
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 18,
          minZoom: 6
        }).addTo(mapRef.current);
        
        // Add scale control
        L.control.scale({ metric: true, imperial: false, position: 'bottomleft' }).addTo(mapRef.current);
        
        // Set bounds for Sri Lanka
        mapRef.current.setMaxBounds(L.latLngBounds([5.8, 79.4], [9.9, 82.0]));
        
        // Handle map click
        mapRef.current.on('click', async (e) => {
          const { lat, lng } = e.latlng;
          
          if (selectedMarkerRef.current) {
            mapRef.current.removeLayer(selectedMarkerRef.current);
          }
          
          selectedMarkerRef.current = L.marker([lat, lng], {
            icon: getSelectedMarkerIcon(),
            zIndexOffset: 1000
          }).addTo(mapRef.current);
          
          selectedMarkerRef.current.bindPopup(`
            <div class="selected-popup">
              <strong>📍 Selected Location</strong><br/>
              <small>Lat: ${lat.toFixed(6)}<br/>Lng: ${lng.toFixed(6)}</small>
              <br/><br/>
              <em>Getting district information...</em>
            </div>
          `).openPopup();
          
          let district = await getDistrictFromNominatim(lat, lng);
          
          if (selectedMarkerRef.current && mapRef.current) {
            selectedMarkerRef.current.setPopupContent(`
              <div class="selected-popup">
                <strong>📍 Selected Location</strong><br/>
                <small>Lat: ${lat.toFixed(6)}<br/>Lng: ${lng.toFixed(6)}</small>
                ${district ? `<br/><br/><strong>District:</strong> ${district}` : ''}
                <br/><br/>
                <button onclick="window.reportIssueHere()" 
                        style="background: #2d6a4f; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer;">
                  Report Issue Here →
                </button>
              </div>
            `);
          }
          
          onMapClick({ lat, lng, district: district || 'Unknown' });
        });
        
        setMapLoaded(true);
        setMapInitialized(true);
        console.log('Map initialized successfully');
        
        // Force a resize after map is loaded
        setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.invalidateSize();
          }
        }, 200);
        
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    }, 150); // Increased delay to ensure DOM is ready
    
    return () => {
      clearTimeout(timer);
      if (mapRef.current) {
        try {
          // Clean up marker cluster if exists
          if (markerClusterRef.current) {
            mapRef.current.removeLayer(markerClusterRef.current);
            markerClusterRef.current = null;
          }
          // Clean up legend
          if (legendRef.current) {
            mapRef.current.removeControl(legendRef.current);
            legendRef.current = null;
          }
          // Clean up search marker
          if (searchMarkerRef.current) {
            mapRef.current.removeLayer(searchMarkerRef.current);
            searchMarkerRef.current = null;
          }
          // Remove map
          mapRef.current.remove();
        } catch (error) {
          console.warn('Error cleaning up map:', error);
        }
        mapRef.current = null;
        setMapLoaded(false);
        setMapInitialized(false);
      }
    };
  }, [onMapClick]);

  // Display issue markers with clustering
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !mapInitialized) {
      console.log('Map not ready for markers');
      return;
    }
    
    console.log('Updating markers with issues:', issues.length);
    
    // Remove existing marker cluster safely
    if (markerClusterRef.current) {
      try {
        mapRef.current.removeLayer(markerClusterRef.current);
      } catch (error) {
        console.warn('Error removing cluster layer:', error);
      }
      markerClusterRef.current = null;
    }
    
    if (issues.length === 0) {
      console.log('No issues to display');
      return;
    }
    
    // Create new marker cluster group with safe options
    markerClusterRef.current = L.markerClusterGroup({
      maxClusterRadius: 80,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: true,
      zoomToBoundsOnClick: true,
      animateAddingMarkers: false, // Disable animation to prevent errors
      disableClusteringAtZoom: 18,
      iconCreateFunction: function(cluster) {
        const childCount = cluster.getChildCount();
        let size = 'small';
        let backgroundColor = '#2d6a4f';
        
        if (childCount < 10) {
          size = 'small';
          backgroundColor = '#2d6a4f';
        } else if (childCount < 50) {
          size = 'medium';
          backgroundColor = '#40916c';
        } else {
          size = 'large';
          backgroundColor = '#1b4332';
        }
        
        return L.divIcon({
          html: `<div class="cluster-marker ${size}" style="background-color: ${backgroundColor}">
                  <span>${childCount}</span>
                 </div>`,
          className: 'marker-cluster-custom',
          iconSize: size === 'small' ? [40, 40] : size === 'medium' ? [50, 50] : [60, 60]
        });
      }
    });
    
    // Add markers for each issue
    let addedCount = 0;
    const markers = [];
    
    issues.forEach(issue => {
      // Validate coordinates
      if (!issue.lat || !issue.lng || isNaN(issue.lat) || isNaN(issue.lng)) {
        console.warn('Invalid coordinates for issue:', issue._id);
        return;
      }
      
      try {
        const markerIcon = getMarkerIcon(issue.category, issue.status);
        const marker = L.marker([issue.lat, issue.lng], { icon: markerIcon });
        
        const buttonId = `btn-${issue._id}-${Date.now()}-${Math.random()}`;
        const popupContent = `
          <div class="issue-popup">
            <div class="popup-header" style="border-left-color: ${getCategoryColor(issue.category)}">
              <h3>${escapeHtml(issue.title)}</h3>
              <span class="popup-category">${issue.category}</span>
            </div>
            <div class="popup-body">
              <p class="popup-description">${escapeHtml(issue.description.substring(0, 150))}${issue.description.length > 150 ? '...' : ''}</p>
              <div class="popup-details">
                <div class="detail-item">
                  <span class="detail-icon">📍</span>
                  <span class="detail-text">${issue.district || 'Unknown District'}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-icon">📅</span>
                  <span class="detail-text">${new Date(issue.createdAt).toLocaleDateString()}</span>
                </div>
                ${issue.status === 'resolved' ? `
                  <div class="detail-item resolved-badge">
                    <span class="detail-icon">✅</span>
                    <span class="detail-text">Resolved</span>
                  </div>
                ` : `
                  <div class="detail-item pending-badge">
                    <span class="detail-icon">⏳</span>
                    <span class="detail-text">Pending</span>
                  </div>
                `}
              </div>
            </div>
            <div class="popup-footer">
              <button id="${buttonId}" class="view-details-btn" data-issue-id="${issue._id}">
                View Full Details →
              </button>
            </div>
          </div>
        `;
        
        marker.bindPopup(popupContent, {
          maxWidth: 320,
          minWidth: 280,
          className: 'custom-popup'
        });
        
        marker.on('popupopen', function() {
          setTimeout(() => {
            const button = document.getElementById(buttonId);
            if (button) {
              const newButton = button.cloneNode(true);
              button.parentNode.replaceChild(newButton, button);
              
              newButton.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                setSelectedIssue(issue);
                marker.closePopup();
              });
            }
          }, 100);
        });
        
        markerClusterRef.current.addLayer(marker);
        markers.push(marker);
        addedCount++;
      } catch (error) {
        console.warn('Error adding marker for issue:', issue._id, error);
      }
    });
    
    console.log(`Added ${addedCount} markers to map`);
    
    if (addedCount > 0 && mapRef.current) {
      try {
        mapRef.current.addLayer(markerClusterRef.current);
      } catch (error) {
        console.warn('Error adding cluster layer to map:', error);
      }
      
      // Fit bounds to show all markers (with delay)
      setTimeout(() => {
        if (markerClusterRef.current && mapRef.current) {
          try {
            const bounds = markerClusterRef.current.getBounds();
            if (bounds && bounds.isValid()) {
              mapRef.current.fitBounds(bounds, { padding: [50, 50] });
            }
          } catch (error) {
            console.warn('Error fitting bounds:', error);
          }
        }
      }, 300);
    }
    
    // Add legend (only if not already added)
    if (legendRef.current && mapRef.current) {
      try {
        mapRef.current.removeControl(legendRef.current);
      } catch (error) {
        console.warn('Error removing legend:', error);
      }
      legendRef.current = null;
    }
    
    const LegendControl = L.Control.extend({
      onAdd: function() {
        const div = L.DomUtil.create('div', 'info legend');
        div.innerHTML = `
          <div class="map-legend">
            <h4>📊 Issue Categories</h4>
            <div class="legend-item">
              <div class="legend-marker-icon" style="background: linear-gradient(135deg, #e74c3c, #c0392b);">
                <span>🗑️</span>
              </div>
              <span>Waste & Pollution</span>
            </div>
            <div class="legend-item">
              <div class="legend-marker-icon" style="background: linear-gradient(135deg, #27ae60, #1e8449);">
                <span>🌳</span>
              </div>
              <span>Deforestation</span>
            </div>
            <div class="legend-item">
              <div class="legend-marker-icon" style="background: linear-gradient(135deg, #3498db, #2980b9);">
                <span>💧</span>
              </div>
              <span>Water Contamination</span>
            </div>
            <div class="legend-item">
              <div class="legend-marker-icon" style="background: linear-gradient(135deg, #95a5a6, #7f8c8d);">
                <span>🌫️</span>
              </div>
              <span>Air Pollution</span>
            </div>
            <div class="legend-item">
              <div class="legend-marker-icon" style="background: linear-gradient(135deg, #d35400, #a04000);">
                <span>⛰️</span>
              </div>
              <span>Soil Erosion</span>
            </div>
            <div class="legend-item">
              <div class="legend-marker-icon" style="background: linear-gradient(135deg, #f39c12, #e67e22);">
                <span>🐘</span>
              </div>
              <span>Wildlife Conflict</span>
            </div>
            <div class="legend-item">
              <div class="legend-marker-icon resolved" style="background: linear-gradient(135deg, #2ecc71, #27ae60);">
                <span>✅</span>
              </div>
              <span>Resolved Issues</span>
            </div>
            <hr/>
            <div class="legend-stat">
              <strong>Total Issues: ${issues.length}</strong>
            </div>
            <div class="legend-stat">
              <strong>Resolved: ${issues.filter(i => i.status === 'resolved').length}</strong>
            </div>
            <div class="legend-stat">
              <strong>Pending: ${issues.filter(i => i.status !== 'resolved').length}</strong>
            </div>
          </div>
        `;
        return div;
      }
    });
    
    legendRef.current = new LegendControl({ position: 'bottomright' });
    if (mapRef.current) {
      try {
        legendRef.current.addTo(mapRef.current);
      } catch (error) {
        console.warn('Error adding legend to map:', error);
      }
    }
    
  }, [issues, mapLoaded, mapInitialized]);
  
  const fitBoundsToMarkers = () => {
    if (markerClusterRef.current && issues.length > 0 && mapRef.current) {
      try {
        const bounds = markerClusterRef.current.getBounds();
        if (bounds && bounds.isValid()) {
          // Disable animation temporarily
          const originalZoomAnimation = mapRef.current.options.zoomAnimation;
          mapRef.current.options.zoomAnimation = false;
          mapRef.current.fitBounds(bounds, { padding: [50, 50] });
          setTimeout(() => {
            if (mapRef.current) {
              mapRef.current.options.zoomAnimation = originalZoomAnimation;
            }
          }, 500);
        }
      } catch (error) {
        console.warn('Error fitting bounds:', error);
      }
    }
  };
  
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 'calc(100vh - 200px)' }}>
      {/* Search Bar */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        width: '90%',
        maxWidth: '500px',
      }}>
        <form onSubmit={handleSearchSubmit} style={{ width: '100%' }}>
          <div style={{
            display: 'flex',
            gap: '10px',
            background: 'white',
            borderRadius: '50px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            padding: '5px',
            backdropFilter: 'blur(10px)',
          }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t ? t('searchLocation') : "🔍 Search for a location in Sri Lanka (e.g., Colombo, Kandy, Galle)..."}
              style={{
                flex: 1,
                padding: '12px 20px',
                border: 'none',
                borderRadius: '50px',
                fontSize: '16px',
                outline: 'none',
                background: 'transparent',
              }}
              onFocus={() => searchResults.length > 0 && setShowSuggestions(true)}
            />
            <button
              type="submit"
              disabled={isSearching}
              style={{
                padding: '10px 25px',
                background: '#2d6a4f',
                color: 'white',
                border: 'none',
                borderRadius: '50px',
                cursor: isSearching ? 'wait' : 'pointer',
                fontSize: '16px',
                fontWeight: '500',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => e.target.style.background = '#1b4332'}
              onMouseLeave={(e) => e.target.style.background = '#2d6a4f'}
            >
              {isSearching ? '🔍 Searching...' : 'Search'}
            </button>
          </div>
        </form>
        
        {/* Search Suggestions Dropdown */}
        {showSuggestions && searchResults.length > 0 && (
          <div style={{
            marginTop: '10px',
            background: 'white',
            borderRadius: '15px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            overflow: 'hidden',
            maxHeight: '300px',
            overflowY: 'auto',
          }}>
            {searchResults.map((result, index) => (
              <div
                key={index}
                onClick={() => flyToLocation(result.lat, result.lon, result.display_name)}
                style={{
                  padding: '12px 20px',
                  cursor: 'pointer',
                  borderBottom: index < searchResults.length - 1 ? '1px solid #e0e0e0' : 'none',
                  transition: 'background 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
              >
                <span style={{ fontSize: '20px' }}>📍</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '500', color: '#2d6a4f' }}>
                    {result.display_name.split(',')[0]}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {result.display_name}
                  </div>
                </div>
                <span style={{ color: '#2d6a4f' }}>→</span>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div 
        id="map" 
        style={{ 
          width: '100%', 
          height: '100%', 
          minHeight: '500px',
          backgroundColor: '#f0f0f0',
          position: 'relative',
          zIndex: 1
        }} 
      />
      
      {issues.length > 0 && mapLoaded && (
        <button 
          onClick={fitBoundsToMarkers}
          style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            zIndex: 1000,
            background: 'white',
            border: 'none',
            borderRadius: '30px',
            padding: '10px 15px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: '500'
          }}
        >
          🗺️ Show All Issues ({issues.length})
        </button>
      )}
      
      {selectedIssue && (
        <IssueDetailModal 
          issue={selectedIssue} 
          onClose={() => setSelectedIssue(null)} 
        />
      )}
    </div>
  );
}

// Add global function for report button
window.reportIssueHere = () => {
  const reportTab = document.querySelector('.nav-tabs button:nth-child(2)');
  if (reportTab) {
    reportTab.click();
  }
};

export default Map;