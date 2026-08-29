// API Service for communicating with backend server
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const checkHealth = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return await response.json();
  } catch (error) {
    console.error('Error reaching backend server:', error);
    throw error;
  }
};
