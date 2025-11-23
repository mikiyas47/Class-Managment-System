import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentSidebar from './StudentSidebar';
import { FaBook, FaClipboardList, FaBell, FaSignOutAlt } from 'react-icons/fa';

// ExamRow component
const ExamRow = ({ exam, examEndTime, navigate }) => {
  const [timeRemaining, setTimeRemaining] = useState(() => {
    const now = new Date();
    return Math.max(0, Math.floor((examEndTime - now) / 1000));
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const remaining = Math.max(0, Math.floor((examEndTime - now) / 1000));
      setTimeRemaining(remaining);
      
      // If time is up, we might want to refresh the exams list
      if (remaining === 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [examEndTime]);

  // Format time remaining as MM:SS
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Format date in Nairobi timezone
  const formatNairobiDate = (dateString) => {
    const date = new Date(dateString);
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      timeZone: 'Africa/Nairobi'
    };
    return date.toLocaleDateString('en-US', options);
  };

  // Format time in Nairobi timezone
  const formatNairobiTime = (dateString) => {
    const date = new Date(dateString);
    const options = { 
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Africa/Nairobi'
    };
    return date.toLocaleTimeString('en-US', options);
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{exam.title}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{exam.course?.subject}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatNairobiDate(exam.startTime)}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatNairobiTime(exam.startTime)}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{exam.duration} minutes</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
          {formatTime(timeRemaining)}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        <button
          onClick={() => navigate(`/student/exam/${exam._id}`)}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
        >
          Start Exam
        </button>
      </td>
    </tr>
  );
};

const StudentDashboard = ({ user, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [exams, setExams] = useState([]);
  const [courses, setCourses] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      onLogout();
    }
  };

  // Fetch student data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        if (!token) {
          setError('Authentication error: No token found');
          return;
        }
        
        // Import the API base URL
        const { API_BASE_URL } = await import('../api');
        
        // Fetch student's courses
        const coursesResponse = await fetch(`${API_BASE_URL}/api/students/${user._id}/courses`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (coursesResponse.ok) {
          const contentType = coursesResponse.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const coursesData = await coursesResponse.json();
            setCourses(coursesData.data || []);
          }
        }
        
        // Fetch exams
        const examsResponse = await fetch(`${API_BASE_URL}/api/exams/student/${user._id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (examsResponse.ok) {
          const contentType = examsResponse.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const examsData = await examsResponse.json();
            setExams(examsData.data || []);
          }
        }
        
        // Fetch announcements
        const announcementsResponse = await fetch(`${API_BASE_URL}/api/announcements`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (announcementsResponse.ok) {
          const contentType = announcementsResponse.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const announcementsData = await announcementsResponse.json();
            setAnnouncements(announcementsData.data || []);
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (activeTab === 'dashboard' && user && user._id) {
      fetchData();
    }
  }, [activeTab, user]);

  const calculateExamEndTime = (exam) => {
    const startTime = new Date(exam.startTime);
    const durationMs = exam.duration * 60000;
    const endTime = new Date(startTime.getTime() + durationMs);
    return endTime;
  };

  const renderDashboardContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
          <p>Error: {error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Student Dashboard</h1>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user.name}</span>
              <button
                onClick={handleLogout}
                className="flex items-center text-gray-700 hover:text-gray-900"
              >
                <FaSignOutAlt className="mr-1" />
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                  <FaBook size={24} />
                </div>
                <div className="ml-4">
                  <h2 className="text-lg font-semibold text-gray-700">My Courses</h2>
                  <p className="text-2xl font-bold">{courses.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100 text-green-600">
                  <FaClipboardList size={24} />
                </div>
                <div className="ml-4">
                  <h2 className="text-lg font-semibold text-gray-700">Upcoming Exams</h2>
                  <p className="text-2xl font-bold">{exams.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                  <FaBell size={24} />
                </div>
                <div className="ml-4">
                  <h2 className="text-lg font-semibold text-gray-700">Announcements</h2>
                  <p className="text-2xl font-bold">{announcements.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Exams Section */}
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Upcoming Exams</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Exam Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Course
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time Remaining
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {exams.map((exam) => (
                    <ExamRow 
                      key={exam._id} 
                      exam={exam} 
                      examEndTime={calculateExamEndTime(exam)} 
                      navigate={navigate} 
                    />
                  ))}
                  {exams.length === 0 && (
                    <tr>
                      <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                        No upcoming exams
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Announcements Section */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Recent Announcements</h2>
            </div>
            <div className="p-6">
              {announcements.length > 0 ? (
                <ul className="space-y-4">
                  {announcements.slice(0, 5).map((announcement) => (
                    <li key={announcement._id} className="border-b border-gray-200 pb-4 last:border-b-0">
                      <h3 className="font-semibold text-lg text-gray-800">{announcement.title}</h3>
                      <p className="text-gray-600 mt-1">{announcement.content}</p>
                      <p className="text-sm text-gray-500 mt-2">
                        Posted on {new Date(announcement.createdAt).toLocaleDateString()}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-center py-4">No announcements</p>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboardContent();
      case 'courses':
        return <div className="p-6">My Courses content will go here</div>;
      case 'schedule':
        return <div className="p-6">My Schedule content will go here</div>;
      case 'exams':
        return <div className="p-6">Exams content will go here</div>;
      case 'assignments':
        return <div className="p-6">Assignments content will go here</div>;
      case 'results':
        return <div className="p-6">My Results content will go here</div>;
      case 'announcements':
        return <div className="p-6">Announcements content will go here</div>;
      case 'settings':
        return <div className="p-6">Settings content will go here</div>;
      default:
        return <div className="p-6">Page not found</div>;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <StudentSidebar 
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation */}
        <header className="bg-white shadow-sm z-10">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center">
              <button 
                className="mr-4 text-gray-500 hover:text-gray-700 md:hidden"
                onClick={toggleSidebar}
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="text-xl font-semibold text-gray-800">
                {activeTab === 'dashboard' ? 'Dashboard' : 
                 activeTab === 'courses' ? 'My Courses' : 
                 activeTab === 'schedule' ? 'My Schedule' : 
                 activeTab === 'exams' ? 'Exams' : 
                 activeTab === 'assignments' ? 'Assignments' : 
                 activeTab === 'results' ? 'My Results' : 
                 activeTab === 'announcements' ? 'Announcements' : 
                 activeTab === 'settings' ? 'Settings' : ''}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <button className="p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </button>
                <span className="absolute top-1 right-1 h-3 w-3 rounded-full bg-red-500"></span>
              </div>
              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
                <span className="text-white font-medium">
                  {user?.name?.charAt(0) || 'S'}
                </span>
              </div>
            </div>
          </div>
        </header>
        
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default StudentDashboard;