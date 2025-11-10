import { useState } from 'react';
import './Login.css';

const Login = ({ onLoginSuccess }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Use the unified login endpoint
      const endpoint = 'http://localhost:5000/api/login';
      
      // Call backend API for authentication
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (response.ok && data.status === "success") {
        // Extract user data and type from the response
        const { user, userType, token } = data.data;
        
        // Create user object with type information
        const userData = {
          ...user,
          type: userType,
          token
        };
        
        console.log('Login successful, user data:', userData);
        
        // Call the parent callback if provided
        if (onLoginSuccess) {
          console.log('Calling onLoginSuccess callback');
          onLoginSuccess(userData, token);
        }
        
        console.log(`${userType} login successful:`, userData);
      } else {
        setError(data.message || 'Invalid credentials');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="glass-card">
        <h2 className="login-title">Login</h2>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="form-input"
              placeholder="Enter your email"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="form-input"
              placeholder="Enter your password"
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <div className="login-footer">
          <p>© 2023 Admin Dashboard</p>
        </div>
      </div>
    </div>
  );
};

export default Login;