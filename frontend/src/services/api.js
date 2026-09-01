const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL;
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  const hostname = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
  return `http://${hostname}:5000/api`;
};

const API_BASE_URL = getApiBaseUrl();

// Health Check
export const checkHealth = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return await response.json();
  } catch (error) {
    console.error('Error reaching backend server:', error);
    throw error;
  }
};

// Auth API Calls
export const loginUser = async (email, password) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return await response.json();
};

export const registerUser = async (userData) => {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
  return await response.json();
};

export const getCurrentUserProfile = async (token) => {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  return await response.json();
};

export const updateUserProfile = async (token, profileData) => {
  const response = await fetch(`${API_BASE_URL}/auth/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(profileData)
  });
  return await response.json();
};

// Organization & Map API Calls
export const fetchOrganizations = async (type = '', search = '') => {
  const params = new URLSearchParams();
  if (type) params.append('type', type);
  if (search) params.append('search', search);

  const response = await fetch(`${API_BASE_URL}/organizations?${params.toString()}`);
  return await response.json();
};

export const fetchNearbyOrganizations = async (lat, lng, distance = 10) => {
  const response = await fetch(`${API_BASE_URL}/organizations/nearby?lat=${lat}&lng=${lng}&distance=${distance}`);
  return await response.json();
};
