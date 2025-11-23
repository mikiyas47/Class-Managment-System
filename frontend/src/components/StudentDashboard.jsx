import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentSidebar from './StudentSidebar';
import ExamRow from './ExamRow';
import StudentScheduleView from './StudentScheduleView';
import SettingsPage from './SettingsPage';
import { FaBook, FaTasks, FaClipboardList, FaChartBar, FaBell, FaSignOutAlt } from 'react-icons/fa';

const StudentDashboard = ({ user, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [courses, setCourses] = useState([]);
  const [exams, setExams] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [results, setResults] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
        const studentId = user._id;
        
        if (!token || !studentId) {
          throw new Error('Missing authentication');
        }
        
        // Import the API base URL
        const { API_BASE_URL } = await import('../api');
        
        // Fetch all data in parallel
        const [coursesRes, examsRes, assignmentsRes, resultsRes, announcementsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/students/${studentId}/courses`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${API_BASE_URL}/api/exams/student/${studentId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${API_BASE_URL}/api/students/${studentId}/assignments`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${API_BASE_URL}/api/results/student/${studentId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${API_BASE_URL}/api/students/${studentId}/announcements`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        // Check content type before parsing JSON
        const coursesContentType = coursesRes.headers.get('content-type');
        const examsContentType = examsRes.headers.get('content-type');
        const assignmentsContentType = assignmentsRes.headers.get('content-type');
        const resultsContentType = resultsRes.headers.get('content-type');
        const announcementsContentType = announcementsRes.headers.get('content-type');

        if (coursesContentType && coursesContentType.includes('application/json')) {
          const coursesData = await coursesRes.json();
          if (coursesData.status === 'success') {
            setCourses(coursesData.data);
          }
        }

        if (examsContentType && examsContentType.includes('application/json')) {
          const examsData = await examsRes.json();
          if (examsData.status === 'success') {
            setExams(examsData.data);
          }
        }

        if (assignmentsContentType && assignmentsContentType.includes('application/json')) {
          const assignmentsData = await assignmentsRes.json();
          console.log('Assignments data received:', assignmentsData);
          if (assignmentsData.status === 'success') {
            setAssignments(assignmentsData.data);
            console.log('Assignments set in state:', assignmentsData.data);
          }
        }

        if (resultsContentType && resultsContentType.includes('application/json')) {
          const resultsData = await resultsRes.json();
          if (resultsData.status === 'success') {
            setResults(resultsData.data);
          } else {
            console.log('Error fetching results:', resultsData);
          }
        }

        if (announcementsContentType && announcementsContentType.includes('application/json')) {
          const announcementsData = await announcementsRes.json();
          if (announcementsData.status === 'success') {
            setAnnouncements(announcementsData.data);
          }
        }

        setLoading(false);
      } catch (err) {
        setError('Failed to fetch data');
        setLoading(false);
      }
    };

    fetchData();
  }, [user._id]);

  // Fetch exams function
  const fetchExams = async () => {
    try {
      const token = localStorage.getItem('token');
      const studentId = user._id;
      
      // Import the API base URL
      const { API_BASE_URL } = await import('../api');
      
      const examsRes = await fetch(`${API_BASE_URL}/api/exams/student/${studentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // Check content type before parsing JSON
      const examsContentType = examsRes.headers.get('content-type');
      if (examsContentType && examsContentType.includes('application/json')) {
        const examsData = await examsRes.json();

        if (examsData.status === 'success') {
          setExams(examsData.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch exams:', err);
    }
  };

  // Set up interval to refresh exams periodically
  useEffect(() => {
    if (activeTab === 'exams') {
      // Fetch exams immediately when switching to exams tab
      fetchExams();
      
      // Set up interval to refresh exams every 30 seconds
      const interval = setInterval(fetchExams, 30000);
      
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString();
  };

  const handleDownloadAssignment = async (assignmentId, filename) => {
    try {
      const token = localStorage.getItem('token');
      
      // Import the API base URL
      const { API_BASE_URL } = await import('../api');
      
      // Log the request for debugging
      console.log('Download request:', { assignmentId, filename, API_BASE_URL });
      
      // Validate inputs
      if (!assignmentId) {
        throw new Error('Assignment ID is missing');
      }
      
      if (!token) {
        throw new Error('Authentication token is missing');
      }
      
      const downloadUrl = `${API_BASE_URL}/api/assignments/${assignmentId}/download`;
      console.log('Full download URL:', downloadUrl);
      
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Download response:', { 
        status: response.status, 
        statusText: response.statusText,
        headers: [...response.headers.entries()]
      });
      
      if (!response.ok) {
        // Try to parse error response
        let errorMessage = `Failed to download file (HTTP ${response.status}: ${response.statusText})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // If we can't parse JSON, check if it's HTML (which would indicate a server error)
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('text/html')) {
            errorMessage = `Server error (HTTP ${response.status}: ${response.statusText}). The file may not exist or there was a server issue.`;
          }
        }
        throw new Error(errorMessage);
      }
      
      // Get the filename from the Content-Disposition header if available
      const contentDisposition = response.headers.get('Content-Disposition');
      let downloadFilename = filename;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch && filenameMatch[1]) {
          downloadFilename = filenameMatch[1];
        }
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadFilename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      alert(`Failed to download file: ${error.message}`);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Welcome, {user?.name || user?.userId}!</h2>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                    <FaBook className="text-xl" />
                  </div>
                  <div className="ml-4">
                    <p className="text-gray-500 text-sm">Courses</p>
                    <p className="text-2xl font-bold">{courses.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-green-100 text-green-600">
                    <FaTasks className="text-xl" />
                  </div>
                  <div className="ml-4">
                    <p className="text-gray-500 text-sm">Exams</p>
                    <p className="text-2xl font-bold">{exams.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                    <FaClipboardList className="text-xl" />
                  </div>
                  <div className="ml-4">
                    <p className="text-gray-500 text-sm">Assignments</p>
                    <p className="text-2xl font-bold">{assignments.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                    <FaChartBar className="text-xl" />
                  </div>
                  <div className="ml-4">
                    <p className="text-gray-500 text-sm">Results</p>
                    <p className="text-2xl font-bold">{results.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-red-100 text-red-600">
                    <FaBell className="text-xl" />
                  </div>
                  <div className="ml-4">
                    <p className="text-gray-500 text-sm">Announcements</p>
                    <p className="text-2xl font-bold">{announcements.length}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {announcements.slice(0, 3).map(announcement => (
                  <div key={announcement._id} className="border-b border-gray-200 pb-4 last:border-b-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900">{announcement.title}</h4>
                        <p className="text-gray-600 text-sm mt-1">{announcement.content}</p>
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {formatDate(announcement.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
                {announcements.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No recent announcements</p>
                )}
              </div>
            </div>
          </div>
        );
      case 'courses':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">My Courses</h2>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credits</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teacher</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {courses.map(course => (
                    <tr key={course._id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{course.subject}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{course.code}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{course.crh}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{course.teacher?.name}</td>
                    </tr>
                  ))}
                  {courses.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                        No courses found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'schedule':
        return (
          <StudentScheduleView studentId={user._id} token={localStorage.getItem('token')} />
        );
      case 'exams':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Upcoming Exams</h2>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exam</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {exams.map(exam => (
                    <ExamRow 
                      key={exam._id} 
                      exam={exam} 
                      examEndTime={new Date(new Date(exam.startTime).getTime() + exam.duration * 60000)} 
                      navigate={navigate} 
                    />
                  ))}
                  {exams.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                        No upcoming exams
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'assignments':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Assignments</h2>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {assignments.map(assignment => (
                    <tr key={assignment._id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{assignment.course?.subject}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => handleDownloadAssignment(assignment._id, assignment.filename)}
                          className="flex items-center text-green-600 hover:text-green-800"
                        >
                          <span className="mr-2">{assignment.filename}</span>
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {assignments.length === 0 && (
                    <tr>
                      <td colSpan="2" className="px-6 py-4 text-center text-gray-500">
                        No assignments found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'results':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">My Results</h2>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exam</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {results.map(result => (
                    <tr key={result._id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{result.exam?.course?.subject}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{result.exam?.title}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{result.score}%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(result.submittedAt)}</td>
                    </tr>
                  ))}
                  {results.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                        No results available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'announcements':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Announcements</h2>
            <div className="space-y-4">
              {announcements.map(announcement => (
                <div key={announcement._id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{announcement.title}</h3>
                      <p className="text-gray-600 mt-2">{announcement.content}</p>
                    </div>
                    <span className="text-sm text-gray-500 whitespace-nowrap">
                      {formatDate(announcement.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
              {announcements.length === 0 && (
                <div className="bg-white rounded-lg shadow-md p-6 text-center">
                  <p className="text-gray-500">No announcements found</p>
                </div>
              )}
            </div>
          </div>
        );
      case 'settings':
        return (
          <SettingsPage user={user} />
        );
      default:
        return (
          <div className="p-6">
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <p className="text-gray-500">Page not found</p>
            </div>
          </div>
        );
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
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 m-6 rounded">
              <p>{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          ) : (
            renderContent()
          )}
        </main>
      </div>
    </div>
  );
};

export default StudentDashboard;