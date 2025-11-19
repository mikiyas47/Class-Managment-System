// For production, replace with your actual Render backend URL
const API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-render-app-url.onrender.com/api' 
  : 'http://localhost:5000/api';

export const verifyToken = async (token) => {
  try {
    console.log('Verifying token with backend...');
    const response = await fetch(`${API_URL}/auth/verify-token`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    console.log('Token verification response:', data);

    if (!response.ok) {
      throw new Error(data.message || 'Token verification failed');
    }

    // The backend returns user data in data.data
    const userData = data.data || {};
    
    // Ensure we have all required fields
    return {
      ...userData,
      id: userData.id || userData._id,
      type: userData.role || userData.type || 'user'
    };
  } catch (error) {
    console.error('Error verifying token:', error);
    throw error;
  }
};

// Add other API calls here
export default {
  verifyToken,
};
