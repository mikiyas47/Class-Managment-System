import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import AdminDashboard from './components/AdminDashboard';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';
import DepartmentHeadDashboard from './components/DepartmentHeadDashboard';
import { API_BASE_URL } from './api';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on app load
  useEffect(() => {
    console.log("=== Checking authentication status ===");
    console.log("API_BASE_URL:", API_BASE_URL);
    console.log("NODE_ENV:", process.env.NODE_ENV);
    
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    console.log("Token from localStorage:", storedToken);
    console.log("User data from localStorage:", storedUser);
    
    if (storedToken && storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        console.log("Parsed user data:", userData);
        
        // Verify token is still valid by making a simple request
        verifyToken(storedToken, userData);
      } catch (error) {
        console.error("Error parsing stored user data:", error);
        clearSession();
      }
    } else {
      console.log("No valid session found in localStorage");
      setIsLoading(false);
    }
    
    console.log("=== Finished checking authentication status ===");
  }, []);

  const verifyToken = async (token, userData) => {
    try {
      // Simple verification - you might want to implement a proper token verification endpoint
      const response = await fetch(`${API_BASE_URL}/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        setUser(userData);
        setToken(token);
        console.log("Token verified, setting user state");
      } else {
        console.log("Token verification failed, clearing session");
        clearSession();
      }
    } catch (error) {
      console.error("Error verifying token:", error);
      clearSession();
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = (userData, token) => {
    console.log("handleLoginSuccess called with:", { userData, token });
    
    setUser(userData);
    setToken(token);
    
    // Store in localStorage for persistence
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    
    console.log("User and token stored in localStorage");
  };

  const handleLogout = () => {
    console.log("handleLogout called");
    clearSession();
  };

  const clearSession = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    console.log("Session cleared");
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="App">
      <Routes>
        <Route 
          path="/login" 
          element={user ? <Navigate to={`/${user.type}-dashboard`} /> : <Login onLoginSuccess={handleLoginSuccess} />} 
        />
        <Route 
          path="/admin-dashboard/*" 
          element={user && user.type === 'admin' ? <AdminDashboard user={user} token={token} onLogout={handleLogout} /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/teacher-dashboard/*" 
          element={user && user.type === 'teacher' ? <TeacherDashboard user={user} token={token} onLogout={handleLogout} /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/student-dashboard/*" 
          element={user && user.type === 'student' ? <StudentDashboard user={user} token={token} onLogout={handleLogout} /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/department-head-dashboard/*" 
          element={user && user.type === 'department-head' ? <DepartmentHeadDashboard user={user} token={token} onLogout={handleLogout} /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/" 
          element={<Navigate to={user ? `/${user.type}-dashboard` : "/login"} />} 
        />
      </Routes>
    </div>
  );
}

export default App;