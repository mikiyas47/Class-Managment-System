import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBook, FaClipboardList, FaBell, FaUser, FaSignOutAlt } from 'react-icons/fa';

import ExamRow from './ExamRow';

const StudentDashboard = ({ user, token, onLogout }) => {
  const [exams, setExams] = useState([]);
  const [courses, setCourses] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch student's courses
      const coursesResponse = await fetch(`/api/students/${user._id}/courses`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (coursesResponse.ok) {
        const coursesData = await coursesResponse.json();
        setCourses(coursesData.data || []);
      }
      
      // Fetch exams
      const examsResponse = await fetch('/api/exams', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (examsResponse.ok) {
        const examsData = await examsResponse.json();
        setExams(examsData.data || []);
      }
      
      // Fetch announcements
      const announcementsResponse = await fetch('/api/announcements', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (announcementsResponse.ok) {
        const announcementsData = await announcementsResponse.json();
        setAnnouncements(announcementsData.data || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateExamEndTime = (exam) => {
    const startTime = new Date(exam.startTime);
    return new Date(startTime.getTime() + exam.duration * 60000);
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