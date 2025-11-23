import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBook, FaClipboardList, FaBell, FaUser, FaSignOutAlt } from 'react-icons/fa';
import ExamRow from './ExamRow';

console.log('Environment variables:');
console.log('  NODE_ENV:', process.env.NODE_ENV);
console.log('  REACT_APP_API_URL:', process.env.REACT_APP_API_URL);

const StudentDashboard = ({ user, token, onLogout }) => {
  console.log('=== StudentDashboard Component Render ===');
  console.log('User prop:', user);
  console.log('Token prop:', token);
  
  const [exams, setExams] = useState([]);
  const [courses, setCourses] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    console.log('=== StudentDashboard useEffect triggered ===');
    console.log('User in useEffect:', user);
    console.log('User ID in useEffect:', user?._id);
    console.log('Token in useEffect:', token);
    
    if (user && user._id) {
      console.log('Calling fetchData...');
      fetchData();
    } else {
      console.log('No user or user ID, skipping fetchData');
      if (!user) {
        console.error('User prop is null or undefined');
      }
      if (user && !user._id) {
        console.error('User prop exists but has no _id:', user);
      }
    }
  }, [user, token]);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('=== Fetching Student Data ===');
      console.log('User ID:', user._id);
      console.log('User data:', user);
      
      const token = localStorage.getItem('token');
      console.log('Token exists:', !!token);
      if (token) {
        console.log('Token length:', token.length);
        // Log first and last 10 characters of token for debugging (but not the full token for security)
        console.log('Token preview:', token.substring(0, 10) + '...' + token.substring(token.length - 10));
      } else {
        console.error('No authentication token found!');
        setError('Authentication error: No token found');
        return;
      }
      
      // Import the API base URL
      const { API_BASE_URL } = await import('../api');
      console.log('API Base URL:', API_BASE_URL);
      
      // Fetch student's courses
      console.log('Fetching courses...');
      const coursesResponse = await fetch(`${API_BASE_URL}/api/students/${user._id}/courses`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('Courses response status:', coursesResponse.status);
      
      if (coursesResponse.ok) {
        // Check content type before parsing JSON
        const contentType = coursesResponse.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const coursesData = await coursesResponse.json();
          console.log('Courses data:', coursesData);
          setCourses(coursesData.data || []);
          console.log('Number of courses:', (coursesData.data || []).length);
        } else {
          console.error('Courses response is not JSON:', contentType);
          const errorText = await coursesResponse.text();
          console.error('Courses error response:', errorText);
        }
      } else {
        console.error('Failed to fetch courses:', coursesResponse.status);
        const errorText = await coursesResponse.text();
        console.error('Courses error response:', errorText);
      }
      
      // Fetch exams
      console.log('Fetching exams from:', `${API_BASE_URL}/api/exams/student/${user._id}`);
      const examsResponse = await fetch(`${API_BASE_URL}/api/exams/student/${user._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('Exams response status:', examsResponse.status);
      console.log('Exams response headers:', [...examsResponse.headers.entries()]);
      
      // Check for CORS or network issues
      if (!examsResponse.ok) {
        console.error('Exams fetch failed:');
        console.error('  Status:', examsResponse.status);
        console.error('  Status Text:', examsResponse.statusText);
        console.error('  URL:', examsResponse.url);
        
        // Try to get error details
        try {
          const errorText = await examsResponse.text();
          console.error('  Error response body:', errorText);
        } catch (e) {
          console.error('  Could not read error response body:', e);
        }
        
        setError(`Failed to fetch exams: ${examsResponse.status} ${examsResponse.statusText}`);
        return;
      }
      
      if (examsResponse.ok) {
        // Check content type before parsing JSON
        const contentType = examsResponse.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const examsData = await examsResponse.json();
          console.log('Exams data received:', examsData);
          setExams(examsData.data || []);
          console.log('Exams set in state:', examsData.data || []);
        } else {
          console.error('Exams response is not JSON:', contentType);
          const errorText = await examsResponse.text();
          console.error('Exams error response:', errorText);
          setError(`Failed to fetch exams: Server returned HTML instead of JSON`);
        }
      } else {
        const errorText = await examsResponse.text();
        console.error('Exams fetch failed with status:', examsResponse.status);
        console.error('Exams fetch error response:', errorText);
        setError(`Failed to fetch exams: ${examsResponse.status} - ${errorText}`);
      }
      
      // Fetch announcements
      console.log('Fetching announcements...');
      const announcementsResponse = await fetch(`${API_BASE_URL}/api/announcements`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('Announcements response status:', announcementsResponse.status);
      
      if (announcementsResponse.ok) {
        // Check content type before parsing JSON
        const contentType = announcementsResponse.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const announcementsData = await announcementsResponse.json();
          console.log('Announcements data:', announcementsData);
          setAnnouncements(announcementsData.data || []);
        } else {
          console.error('Announcements response is not JSON:', contentType);
          const errorText = await announcementsResponse.text();
          console.error('Announcements error response:', errorText);
        }
      }
    } catch (err) {
      console.error('Error in fetchData:', err);
      setError(err.message);
    } finally {
      console.log('Fetch data completed');
      setLoading(false);
    }
  };

  const calculateExamEndTime = (exam) => {
    console.log('Calculating end time for exam:', exam);
    console.log('Exam ID:', exam._id);
    console.log('Exam start time:', exam.startTime);
    console.log('Exam duration (minutes):', exam.duration);
    
    const startTime = new Date(exam.startTime);
    console.log('Parsed start time:', startTime);
    console.log('Parsed start time timestamp:', startTime.getTime());
    
    const durationMs = exam.duration * 60000;
    console.log('Duration in milliseconds:', durationMs);
    
    const endTime = new Date(startTime.getTime() + durationMs);
    console.log('Calculated end time:', endTime);
    console.log('Calculated end time timestamp:', endTime.getTime());
    
    return endTime;
  };

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
          onClick={fetchData}
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
              onClick={onLogout}
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
                {console.log('Rendering exams:', exams)}
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

export default StudentDashboard;