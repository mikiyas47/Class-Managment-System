import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentSidebar from './StudentSidebar';
import { FaBook, FaTasks, FaClipboardList, FaChartBar, FaBell, FaBars, FaDownload } from 'react-icons/fa';
import io from 'socket.io-client';
import SettingsPage from './SettingsPage';

// ExamRow component for real-time countdown
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

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{exam.title}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{exam.course?.subject}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(exam.startTime).toLocaleDateString()}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(exam.startTime).toLocaleTimeString()}</td>
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
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [courses, setCourses] = useState([]);
  const [exams, setExams] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [results, setResults] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Initialize WebSocket connection
  useEffect(() => {
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    // Connect to server
    newSocket.emit('student-connect', user._id);

    // Listen for exam updates
    newSocket.on('exam-upcoming', (examData) => {
      console.log('Upcoming exam notification:', examData);
      // Refresh exams when an exam is about to start
      fetchExams();
    });

    newSocket.on('exam-active', (examData) => {
      console.log('Active exam notification:', examData);
      // Refresh exams when an exam becomes active
      fetchExams();
    });

    return () => {
      newSocket.close();
    };
  }, [user._id]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const studentId = user._id;

        // Fetch all student data in parallel
        // Note: We're using the new student-specific endpoints that filter by enrolled courses
        const [
          coursesRes,
          examsRes,
          assignmentsRes,
          resultsRes,
          announcementsRes
        ] = await Promise.all([
          fetch(`http://localhost:5000/api/students/${studentId}/courses`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`http://localhost:5000/api/exams/student/${studentId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`http://localhost:5000/api/students/${studentId}/assignments`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`http://localhost:5000/api/results/student/${studentId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`http://localhost:5000/api/students/${studentId}/announcements`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        const coursesData = await coursesRes.json();
        const examsData = await examsRes.json();
        const assignmentsData = await assignmentsRes.json();
        const resultsData = await resultsRes.json();
        const announcementsData = await announcementsRes.json();

        if (coursesData.status === 'success') {
          setCourses(coursesData.data);
        }

        if (examsData.status === 'success') {
          setExams(examsData.data);
        }

        if (assignmentsData.status === 'success') {
          setAssignments(assignmentsData.data);
        }

        if (resultsData.status === 'success') {
          setResults(resultsData.data);
        } else {
          console.log('Error fetching results:', resultsData);
        }

        if (announcementsData.status === 'success') {
          setAnnouncements(announcementsData.data);
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

      const examsRes = await fetch(`http://localhost:5000/api/exams/student/${studentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const examsData = await examsRes.json();

      if (examsData.status === 'success') {
        setExams(examsData.data);
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
      
      const response = await fetch(`http://localhost:5000/api/assignments/${assignmentId}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to download file');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
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
                  <div key={announcement._id} className="border-l-4 border-blue-500 pl-4 py-2">
                    <h4 className="font-medium text-gray-800">{announcement.title}</h4>
                    <p className="text-gray-600 text-sm mt-1">{announcement.message}</p>
                    <p className="text-gray-500 text-xs mt-2">{formatDate(announcement.createdAt)}</p>
                  </div>
                ))}
                {announcements.length === 0 && (
                  <p className="text-gray-500">No recent announcements</p>
                )}
              </div>
            </div>
          </div>
        );
      case 'courses':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">My Courses</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map(course => (
                <div key={course._id} className={`bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow ${course.isRetake ? 'border-l-4 border-yellow-500' : ''}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">{course.subject}</h3>
                      <p className="text-gray-600 mb-1">Code: {course.code || 'N/A'}</p>
                      <p className="text-gray-600 mb-1">Class: Year {course.class?.year} - {course.class?.semester} Semester</p>
                      <p className="text-gray-600">Teacher: {course.teacher?.name || 'N/A'}</p>
                    </div>
                    {course.isRetake && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Retake
                      </span>
                    )}
                  </div>
                  {course.isRetake && (
                    <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                      <p className="text-sm text-yellow-700">
                        <span className="font-medium">Retake Information:</span> Originally from Year {course.originalClass?.year || 'N/A'}
                      </p>
                      <p className="text-sm text-yellow-700">
                        Retaking in Year {course.assignedClass?.year || 'N/A'} - {course.retakeSemester?.semester || 'N/A'} Semester
                      </p>
                    </div>
                  )}
                </div>
              ))}
              {courses.length === 0 && (
                <p className="text-gray-500 col-span-full">No courses found.</p>
              )}
            </div>
          </div>
        );
      case 'exams':
        // Filter exams to only show available ones (currently active)
        const availableExams = exams.filter(exam => {
          const now = new Date();
          const examStartTime = new Date(exam.startTime);
          const examEndTime = new Date(examStartTime.getTime() + exam.duration * 60000);
          return now >= examStartTime && now < examEndTime;
        });
        
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Available Exams</h2>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time Remaining</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {availableExams.map(exam => {
                    const examStartTime = new Date(exam.startTime);
                    const examEndTime = new Date(examStartTime.getTime() + exam.duration * 60000);
                    
                    return (
                      <ExamRow 
                        key={exam._id} 
                        exam={exam} 
                        examEndTime={examEndTime} 
                        navigate={navigate} 
                      />
                    );
                  })}
                  {availableExams.length === 0 && (
                    <tr>
                      <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500">
                        No exams available at this time.
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
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Recent Assignments</h2>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {assignments.map(assignment => (
                    <tr key={assignment._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="flex items-center">
                          <button 
                            onClick={() => handleDownloadAssignment(assignment._id, assignment.filename)}
                            className="text-blue-600 hover:text-blue-800 hover:underline flex items-center"
                          >
                            {assignment.filename}
                            <FaDownload className="ml-2 text-gray-500" />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {assignment.course ? assignment.course.subject : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {assignment.class ? `Year ${assignment.class.year} - ${assignment.class.semester} Semester` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(assignment.createdAt)}</td>
                    </tr>
                  ))}
                  {assignments.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                        No assignments found.
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mid Exam</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Final Exam</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assignment</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {results.map(result => (
                    <tr key={result._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{result.course?.subject}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{result.midExamScore !== undefined && result.midExamScore !== null ? result.midExamScore : 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{result.finalExamScore !== undefined && result.finalExamScore !== null ? result.finalExamScore : 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{result.assignmentScore !== undefined && result.assignmentScore !== null ? result.assignmentScore : 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{result.overallScore !== undefined && result.overallScore !== null ? result.overallScore : 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          result.grade === 'A+' ? 'bg-green-100 text-green-800' :
                          result.grade === 'A' ? 'bg-green-100 text-green-800' :
                          result.grade === 'A-' ? 'bg-green-100 text-green-800' :
                          result.grade === 'B+' ? 'bg-blue-100 text-blue-800' :
                          result.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                          result.grade === 'B-' ? 'bg-blue-100 text-blue-800' :
                          result.grade === 'C+' ? 'bg-yellow-100 text-yellow-800' :
                          result.grade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                          result.grade === 'C-' ? 'bg-yellow-100 text-yellow-800' :
                          result.grade === 'D' ? 'bg-orange-100 text-orange-800' :
                          result.grade === 'F' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {result.grade || 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {results.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                        No results found.
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
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Latest Announcements</h2>
            <div className="space-y-6">
              {announcements.map(announcement => (
                <div key={announcement._id} className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">{announcement.title}</h3>
                  <p className="text-gray-600 mb-4">{announcement.message}</p>
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>
                      {announcement.teacher ? `By ${announcement.teacher.name}` : 'By Teacher'}
                    </span>
                    <span>
                      {announcement.class ? `Year ${announcement.class.year} - ${announcement.class.semester} Semester` : ''}
                    </span>
                    <span>{formatDate(announcement.createdAt)}</span>
                  </div>
                </div>
              ))}
              {announcements.length === 0 && (
                <p className="text-gray-500">No announcements found.</p>
              )}
            </div>
          </div>
        );
      case 'settings':
        return <SettingsPage user={user} onLogout={onLogout} />;
      default:
        return <div>Page not found</div>;
    }
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
      <div className="p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error! </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <StudentSidebar 
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={onLogout}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation */}
        <header className="bg-white shadow-sm">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center">
              <button 
                className="mr-4 text-gray-500 hover:text-gray-700 md:hidden"
                onClick={toggleSidebar}
              >
                <FaBars className="h-6 w-6" />
              </button>
              <h1 className="text-xl font-semibold text-gray-800">
                {activeTab === 'dashboard' ? 'Dashboard' : 
                 activeTab === 'courses' ? 'My Courses' : 
                 activeTab === 'exams' ? 'Exams' : 
                 activeTab === 'assignments' ? 'Assignments' : 
                 activeTab === 'results' ? 'My Results' : 
                 activeTab === 'announcements' ? 'Announcements' : 
                 activeTab === 'settings' ? 'Settings' : ''}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
                <span className="text-white font-medium">
                  {user?.name?.charAt(0) || 'S'}
                </span>
              </div>
            </div>
          </div>
        </header>
        
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default StudentDashboard;