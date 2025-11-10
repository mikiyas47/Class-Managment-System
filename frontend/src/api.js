// API utility functions for communicating with the backend

const API_BASE_URL = 'http://localhost:5000';

export const api = {
  // Fetch basic backend status
  getStatus: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/`);
      return await response.text();
    } catch (error) {
      throw new Error(`Failed to fetch status: ${error.message}`);
    }
  },

  // Fetch data from /api/data endpoint
  getData: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/data`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      throw new Error(`Failed to fetch data: ${error.message}`);
    }
  },

  // Submit form data to the backend
  submitData: async (data) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      throw new Error(`Failed to submit data: ${error.message}`);
    }
  },

  // Fetch users from the backend
  getUsers: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }
  }
};