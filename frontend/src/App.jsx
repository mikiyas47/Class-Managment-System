import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import './components/TeacherDashboard.css';
import Login from './Login';
import AdminDashboard from './components/AdminDashboard';
import DepartmentHeadDashboard from './components/DepartmentHeadDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';
import StudentExamPage from './components/StudentExamPage';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Simple token validation without backend call
  const isTokenValid = (token) => {
    if (!token) {
      console.log('No token provided for validation');
      return false;
    }
    
    try {
      // Split the token and check if it has the right format
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.log('Invalid token format');
        return false;
      }
      
      // Decode the JWT token to check expiration
      const payload = JSON.parse(atob(parts[1]));
      const currentTime = Date.now() / 1000;
      
      // Check if token is expired
      const isValid = payload.exp > currentTime;
      console.log('Token validation result:', isValid, 'Expiration:', new Date(payload.exp * 1000), 'Current time:', new Date());
      return isValid;
    } catch (error) {
      console.error('Error decoding token:', error);
      return false;
    }
  };

  // Check for existing session on initial load
  useEffect(() => {
    const checkAuth = async () => {
      console.log('=== Checking authentication status ===');
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      
      console.log('Token from localStorage:', token);
      console.log('User data from localStorage:', userData);
      
      if (token && userData) {
        try {
          const parsedUserData = JSON.parse(userData);
          console.log('Parsed user data:', parsedUserData);
          
          if (isTokenValid(token)) {
            // Token is valid, set user as authenticated
            setCurrentUser(parsedUserData);
            setIsLoggedIn(true);
            console.log('User authenticated from localStorage');
          } else {
            console.log('Token is invalid or expired');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        } catch (error) {
          console.error('Error parsing user data:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      } else {
        console.log('No valid session found in localStorage');
        if (token) localStorage.removeItem('token');
        if (userData) localStorage.removeItem('user');
      }
      setIsLoading(false);
      console.log('=== Finished checking authentication status ===');
    };

    checkAuth();
  }, [navigate, location.pathname]);

  const handleLoginSuccess = (userData, token) => {
    console.log('Login successful, setting user data', { userData, token });
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    
    setCurrentUser(userData);
    setIsLoggedIn(true);
    
    // Redirect based on user type
    if (userData.type === 'teacher') {
      navigate('/teacher/dashboard');
    } else if (userData.type === 'admin') {
      navigate('/admin/dashboard');
    } else if (userData.type === 'departmentHead') {
      navigate('/department/dashboard');
    } else if (userData.type === 'student') {
      navigate('/student/dashboard');
    }
  };

  const handleLogout = () => {
    console.log('Logging out...');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setCurrentUser(null);
    navigate('/login');
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Render all routes
  return (
    <Routes>
      {/* Root path - redirect to login or appropriate dashboard */}
      <Route path="/" element={
        isLoggedIn ? (
          // If logged in, redirect to appropriate dashboard
          (() => {
            const userType = currentUser?.type || currentUser?.role;
            if (userType) {
              let dashboardPath = '/login';
              switch (userType.toLowerCase()) {
                case 'admin':
                  dashboardPath = '/admin/dashboard';
                  break;
                case 'departmenthead':
                case 'department-head':
                  dashboardPath = '/department/dashboard';
                  break;
                case 'teacher':
                  dashboardPath = '/teacher/dashboard';
                  break;
                case 'student':
                  dashboardPath = '/student/dashboard';
                  break;
                default:
                  dashboardPath = '/login';
              }
              return <Navigate to={dashboardPath} replace />;
            }
            return <Navigate to="/login" replace />;
          })()
        ) : (
          // If not logged in, redirect to login
          <Navigate to="/login" replace />
        )
      } />
      
      {/* Login route */}
      <Route path="/login" element={
        isLoggedIn ? (
          // If already logged in, redirect to appropriate dashboard
          (() => {
            const userType = currentUser?.type || currentUser?.role;
            if (userType) {
              let dashboardPath = '/login';
              switch (userType.toLowerCase()) {
                case 'admin':
                  dashboardPath = '/admin/dashboard';
                  break;
                case 'departmenthead':
                case 'department-head':
                  dashboardPath = '/department/dashboard';
                  break;
                case 'teacher':
                  dashboardPath = '/teacher/dashboard';
                  break;
                case 'student':
                  dashboardPath = '/student/dashboard';
                  break;
                default:
                  dashboardPath = '/login';
              }
              return <Navigate to={dashboardPath} replace />;
            }
            return <Login onLoginSuccess={handleLoginSuccess} />;
          })()
        ) : (
          <Login onLoginSuccess={handleLoginSuccess} />
        )
      } />
      
      {/* Admin routes */}
      <Route path="/admin/dashboard" element={
        isLoggedIn && (currentUser?.type === 'admin' || currentUser?.role === 'admin') ? (
          <AdminDashboard user={currentUser} onLogout={handleLogout} />
        ) : (
          <Navigate to="/login" replace />
        )
      } />
      
      {/* Department Head routes */}
      <Route path="/department/dashboard" element={
        isLoggedIn && (currentUser?.type === 'departmentHead' || currentUser?.type === 'department-head') ? (
          <DepartmentHeadDashboard user={currentUser} onLogout={handleLogout} />
        ) : (
          <Navigate to="/login" replace />
        )
      } />
      
      {/* Teacher routes */}
      <Route path="/teacher/dashboard" element={
        isLoggedIn && currentUser?.type === 'teacher' ? (
          <TeacherDashboard user={currentUser} onLogout={handleLogout} />
        ) : (
          <Navigate to="/login" replace />
        )
      } />
      
      {/* Student routes */}
      <Route path="/student/dashboard" element={
        isLoggedIn && currentUser?.type === 'student' ? (
          <StudentDashboard user={currentUser} onLogout={handleLogout} />
        ) : (
          <Navigate to="/login" replace />
        )
      } />
      
      <Route path="/student/exam/:examId" element={
        isLoggedIn && currentUser?.type === 'student' ? (
          <StudentExamPage user={currentUser} />
        ) : (
          <Navigate to="/login" replace />
        )
      } />
      
      {/* Catch-all route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;