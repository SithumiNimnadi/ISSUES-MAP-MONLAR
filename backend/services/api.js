import axios from 'axios';

const API_URL = 'http://localhost:5001/api';

// Get token from localStorage and set it in axios defaults
const token = localStorage.getItem('token');
if (token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Function to set auth token
export const setAuthToken = (token) => {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }
};

export const fetchIssues = async () => {
  const response = await axios.get(`${API_URL}/issues`);
  return response;
};

export const fetchResearch = async () => {
  const response = await axios.get(`${API_URL}/research`);
  return response;
};

export const createIssue = async (formData) => {
  const response = await axios.post(`${API_URL}/issues`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response;
};

export const createResearch = async (formData) => {
  const response = await axios.post(`${API_URL}/research`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response;
};

export const updateIssue = async (id, data) => {
  const response = await axios.put(`${API_URL}/issues/${id}`, data);
  return response;
};

export const deleteIssue = async (id) => {
  const response = await axios.delete(`${API_URL}/issues/${id}`);
  return response;
};

export const updateResearch = async (id, data) => {
  const response = await axios.put(`${API_URL}/research/${id}`, data);
  return response;
};

export const deleteResearch = async (id) => {
  const response = await axios.delete(`${API_URL}/research/${id}`);
  return response;
};

export const resolveIssue = async (id, resolutionNotes, resolvedBy) => {
  const response = await axios.put(`${API_URL}/issues/${id}/resolve`, {
    resolutionNotes,
    resolvedBy
  });
  return response;
};

export const connectResearchToIssue = async (researchId, issueId) => {
  const response = await axios.post(`${API_URL}/research/${researchId}/connect-issue/${issueId}`);
  return response;
};

export const testConnection = async () => {
  const response = await axios.get(`${API_URL}/test`);
  return response;
};