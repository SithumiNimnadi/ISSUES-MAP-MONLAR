import axios from 'axios';

const API_URL = 'http://localhost:5001/api';

// Helper function to show toast notifications
const showToast = (message, type = 'info') => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('showToast', {
      detail: { message, type }
    }));
  }
};

// Helper function to show browser notifications
const showBrowserNotification = (title, body, type = 'info') => {
  if (typeof window !== 'undefined' && "Notification" in window && Notification.permission === "granted") {
    const icon = type === 'success' ? '/success-icon.png' : 
                 type === 'error' ? '/error-icon.png' : 
                 '/info-icon.png';
    
    new Notification(title, {
      body: body,
      icon: icon,
      vibrate: type === 'error' ? [300, 200, 300] : [200, 100]
    });
  }
};

export const testConnection = async () => {
  try {
    const response = await axios.get(`${API_URL}/health`);
    showToast('✅ Connected to backend server', 'success');
    showBrowserNotification('Backend Connected', 'Successfully connected to server', 'success');
    return response;
  } catch (error) {
    console.error('Connection test failed:', error);
    showToast('❌ Cannot connect to backend server', 'error');
    showBrowserNotification('Connection Failed', 'Cannot connect to backend server', 'error');
    throw error;
  }
};

export const fetchIssues = async () => {
  try {
    const response = await axios.get(`${API_URL}/issues`);
    showToast(`📊 Loaded ${response.data.length} issues`, 'success');
    return response;
  } catch (error) {
    console.error('Error fetching issues:', error);
    showToast('❌ Failed to load issues', 'error');
    throw error;
  }
};

export const createIssue = async (formData) => {
  try {
    const response = await axios.post(`${API_URL}/issues`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    const title = formData.get('title');
    const district = formData.get('district');
    
    showToast(`✅ "${title}" reported successfully in ${district}!`, 'success');
    showBrowserNotification(
      '✅ Issue Reported', 
      `"${title}" has been reported in ${district}`,
      'success'
    );
    
    return response;
  } catch (error) {
    console.error('Error creating issue:', error);
    showToast('❌ Failed to report issue', 'error');
    showBrowserNotification('❌ Report Failed', 'Failed to report issue', 'error');
    throw error;
  }
};

export const deleteIssue = async (id) => {
  try {
    const response = await axios.delete(`${API_URL}/issues/${id}`);
    showToast(`🗑️ Issue deleted successfully`, 'success');
    showBrowserNotification('🗑️ Issue Deleted', 'The issue has been deleted', 'info');
    return response;
  } catch (error) {
    console.error('Error deleting issue:', error);
    showToast('❌ Failed to delete issue', 'error');
    showBrowserNotification('❌ Delete Failed', 'Failed to delete issue', 'error');
    throw error;
  }
};

export const updateIssue = async (id, data) => {
  try {
    const response = await axios.put(`${API_URL}/issues/${id}`, data);
    showToast(`✏️ Issue updated successfully`, 'success');
    showBrowserNotification('✏️ Issue Updated', 'The issue has been updated', 'info');
    return response;
  } catch (error) {
    console.error('Error updating issue:', error);
    showToast('❌ Failed to update issue', 'error');
    showBrowserNotification('❌ Update Failed', 'Failed to update issue', 'error');
    throw error;
  }
};

export const resolveIssue = async (id, resolutionNotes) => {
  try {
    const response = await axios.put(`${API_URL}/issues/${id}/resolve`, {
      resolutionNotes,
      resolvedBy: 'Admin'
    });
    showToast(`✅ Issue marked as resolved!`, 'success');
    showBrowserNotification('✅ Issue Resolved', 'The issue has been resolved', 'success');
    return response;
  } catch (error) {
    console.error('Error resolving issue:', error);
    showToast('❌ Failed to resolve issue', 'error');
    showBrowserNotification('❌ Resolve Failed', 'Failed to resolve issue', 'error');
    throw error;
  }
};

// ============= RESEARCH FUNCTIONS =============

export const fetchResearch = async () => {
  try {
    const response = await axios.get(`${API_URL}/research`);
    showToast(`📚 Loaded ${response.data.length} research papers`, 'success');
    return response;
  } catch (error) {
    console.error('Error fetching research:', error);
    showToast('❌ Failed to load research', 'error');
    throw error;
  }
};

export const createResearch = async (formData) => {
  try {
    const response = await axios.post(`${API_URL}/research`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    const title = formData.get('data') ? JSON.parse(formData.get('data')).title : 'Research';
    
    showToast(`📚 "${title}" published successfully!`, 'success');
    showBrowserNotification('📚 Research Published', `"${title}" has been added to the library`, 'success');
    
    return response;
  } catch (error) {
    console.error('Error creating research:', error);
    showToast('❌ Failed to publish research', 'error');
    showBrowserNotification('❌ Publication Failed', 'Failed to publish research', 'error');
    throw error;
  }
};

export const deleteResearch = async (id) => {
  try {
    const response = await axios.delete(`${API_URL}/research/${id}`);
    showToast(`🗑️ Research deleted successfully`, 'success');
    showBrowserNotification('🗑️ Research Deleted', 'The research has been deleted', 'info');
    return response;
  } catch (error) {
    console.error('Error deleting research:', error);
    showToast('❌ Failed to delete research', 'error');
    showBrowserNotification('❌ Delete Failed', 'Failed to delete research', 'error');
    throw error;
  }
};

export const updateResearch = async (id, data) => {
  try {
    const response = await axios.put(`${API_URL}/research/${id}`, data);
    showToast(`✏️ Research updated successfully`, 'success');
    showBrowserNotification('✏️ Research Updated', 'The research has been updated', 'info');
    return response;
  } catch (error) {
    console.error('Error updating research:', error);
    showToast('❌ Failed to update research', 'error');
    showBrowserNotification('❌ Update Failed', 'Failed to update research', 'error');
    throw error;
  }
};

export const fetchResearchById = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/research/${id}`);
    return response;
  } catch (error) {
    console.error('Error fetching research by id:', error);
    showToast('❌ Failed to load research details', 'error');
    throw error;
  }
};

// New function to connect research to issue with notifications
export const connectResearchToIssue = async (researchId, issueId) => {
  try {
    const response = await axios.post(`${API_URL}/research/${researchId}/connect-issue/${issueId}`);
    showToast(`🔗 Research connected to issue successfully!`, 'success');
    showBrowserNotification('🔗 Connected', 'Research has been connected to the issue', 'success');
    return response;
  } catch (error) {
    console.error('Error connecting research to issue:', error);
    showToast('❌ Failed to connect', 'error');
    throw error;
  }
};