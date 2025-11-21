import { useState, useEffect } from 'react';
import { FaUser, FaBuilding, FaUsers, FaChalkboardTeacher, FaBars, FaHome, FaUserGraduate, FaChalkboard, FaBook, FaUserTie, FaCog, FaClock } from 'react-icons/fa';
import DepartmentHeadSidebar from './DepartmentHeadSidebar.jsx';
import TeachersPage from './TeachersPage.jsx';
import StudentsPage from './StudentsPage.jsx';
import ClassesPage from './ClassesPage.jsx';
import CoursesPage from './CoursesPage.jsx';
import SettingsPage from './SettingsPage.jsx';
import SchedulesPage from './SchedulesPage.jsx';

const DepartmentHeadDashboard = ({ user, onLogout }) => {
  // Debug: Log the user data when component mounts
  console.log('DepartmentHeadDashboard - User prop:', user);
  
  // Safely get department data with fallbacks
  const getInitialDepartmentData = (userData) => {
    if (!userData) {
      console.error('No user data provided to DepartmentHeadDashboard');
      return {
        id: 'unknown',
        name: 'Department Head',
        email: '',
        phone: '',
        department: 'Not assigned',
        departmentInfo: {
          name: 'Not assigned',
          science: 'N/A',
          head: 'Department Head',
          established: 'N/A',
          location: 'Not specified'
        }
      };
    }
    
    return {
      id: userData._id || userData.id || 'unknown',
      name: userData.name || 'Department Head',
      email: userData.email || '',
      phone: userData.phoneNo || '',
      department: userData.department?.name || 'Not assigned',
      departmentInfo: {
        name: userData.department?.name || 'Not assigned',
        science: userData.department?.science || 'N/A',
        head: userData.name || 'Department Head',
        established: userData.department?.established || 'N/A',
        location: userData.department?.location || 'Not specified'
      }
    };
  };
  
  const [departmentData, setDepartmentData] = useState(() => getInitialDepartmentData(user));
  
  const [stats, setStats] = useState({
    totalTeachers: 0,
    totalStudents: 0,
    activeCourses: 0,
    loading: true
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  useEffect(() => {
    // Set initial state from user prop
    if (user) {
      const newDeptData = getInitialDepartmentData(user);
      console.log('Setting department data:', newDeptData);
      setDepartmentData(newDeptData);
    } else {
      console.error('User data is missing in DepartmentHeadDashboard');
      setError('User information is missing. Please log in again.');
      setLoading(false);
      return;
    }
    
    const fetchStats = async () => {
      try {
        setLoading(true);
        
        // Import the API base URL
        const { API_BASE_URL } = await import('../api');
        
        const [teachersRes, studentsRes, coursesRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/teachers`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            }
          }),
          fetch(`${API_BASE_URL}/api/students`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            }
          }),
          fetch(`${API_BASE_URL}/api/courses`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            }
          })
        ]);

        const teachersData = await teachersRes.json();
        const studentsData = await studentsRes.json();
        const coursesData = await coursesRes.json();
        
        console.log('Fetched stats:', { teachersData, studentsData, coursesData });

        setStats({
          totalTeachers: teachersData.data?.length || 0,
          totalStudents: studentsData.data?.length || 0,
          activeCourses: coursesData.data?.length || 0,
          loading: false
        });
      } catch (err) {
        console.error('Error fetching stats:', err);
        setError('Failed to load statistics. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]); // Add user to dependency array to update when user changes

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <span className="ml-4 text-gray-600 dark:text-gray-300">Loading dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
          <p className="font-bold">Error</p>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-40 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={toggleSidebar}></div>
        <div className="fixed inset-y-0 left-0 flex w-64">
          <DepartmentHeadSidebar 
            isOpen={sidebarOpen} 
            onClose={toggleSidebar} 
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onLogout={onLogout}
          />
        </div>
      </div>

      {/* Static sidebar for desktop */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Department Head</h1>
              </div>
              <nav className="mt-5 flex-1 px-2 space-y-1">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-md w-full text-left ${activeTab === 'dashboard' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-200' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'}`}
                >
                  <FaHome className="mr-3 h-6 w-6" />
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('teachers')}
                  className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'teachers' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}`}
                >
                  <FaUserTie className="mr-3" />
                  Teachers
                </button>
                <button
                  onClick={() => setActiveTab('students')}
                  className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'students' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}`}
                >
                  <FaUsers className="mr-3" />
                  Students
                </button>
                <button
                  onClick={() => setActiveTab('classes')}
                  className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'classes' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}`}
                >
                  <FaChalkboard className="mr-3" />
                  Classes
                </button>
                <button
                  onClick={() => setActiveTab('courses')}
                  className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'courses' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}`}
                >
                  <FaBook className="mr-3" />
                  Courses
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'settings' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}`}
                >
                  <FaCog className="mr-3" />
                  Settings
                </button>
                <button
                  onClick={() => setActiveTab('schedules')}
                  className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'schedules' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}`}
                >
                  <FaClock className="mr-3" />
                  Schedules
                </button>
              </nav>
            </div>
            <div className="flex-shrink-0 flex border-t border-gray-200 dark:border-gray-700 p-4">
              <button
                onClick={onLogout}
                className="flex-shrink-0 w-full group block"
              >
                <div className="flex items-center">
                  <div>
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <FaUser className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                          {user?.name || 'User'}
                        </p>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200">
                          Sign out
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white dark:bg-gray-800 shadow-sm z-10">
          <div className="flex items-center justify-between px-4 py-3 h-16">
            <div className="flex items-center">
              <button
                type="button"
                className="text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 lg:hidden"
                onClick={toggleSidebar}
              >
                <span className="sr-only">Open sidebar</span>
                <FaBars className="h-6 w-6" />
              </button>
              <h1 className="ml-4 text-xl font-semibold text-gray-900 dark:text-white">
                {activeTab === 'dashboard' ? 'Dashboard' : 
                 activeTab === 'teachers' ? 'Teachers Management' : 
                 activeTab === 'students' ? 'Students Management' : 
                 activeTab === 'classes' ? 'Classes Management' : 
                 activeTab === 'courses' ? 'Courses Management' : 
                 activeTab === 'schedules' ? 'Class Schedules' : 'Settings'}
              </h1>
            </div>
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <FaUser className="h-5 w-5 text-blue-600 dark:text-blue-300" />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-0 w-full bg-white">
          {activeTab === 'teachers' ? (
            <TeachersPage />
          ) : activeTab === 'students' ? (
            <StudentsPage />
          ) : activeTab === 'classes' ? (
            <ClassesPage user={user} /> // Pass user data to ClassesPage
          ) : activeTab === 'courses' ? (
            <CoursesPage />
          ) : activeTab === 'schedules' ? (
            <SchedulesPage user={user} />
          ) : activeTab === 'settings' ? (
            <SettingsPage user={user} />
          ) : (
            <>
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : error ? (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 m-4" role="alert">
                  <p className="font-bold">Error</p>
                  <p>{error}</p>
                </div>
              ) : departmentData ? (
                <div className="w-full p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                    {/* Profile Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
                      <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 flex items-center">
                        <FaUser className="text-white mr-3 text-xl" />
                        <h2 className="text-lg font-semibold text-white">Profile Information</h2>
                      </div>
                      <div className="p-6">
                        <div className="space-y-4">
                          <div className="flex justify-between border-b border-gray-100 dark:border-gray-700 pb-2">
                            <span className="font-medium text-gray-600 dark:text-gray-300">Name:</span>
                            <span className="text-gray-800 dark:text-white">{departmentData.name}</span>
                          </div>
                          <div className="flex justify-between border-b border-gray-100 dark:border-gray-700 pb-2">
                            <span className="font-medium text-gray-600 dark:text-gray-300">Email:</span>
                            <span className="text-gray-800 dark:text-white">{departmentData.email}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium text-gray-600 dark:text-gray-300">Department:</span>
                            <span className="text-gray-800 dark:text-white">
                              {departmentData.department || 'Not assigned'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Stats Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden md:col-span-2 lg:col-span-1">
                      <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4 flex items-center">
                        <FaUsers className="text-white mr-3 text-xl" />
                        <h2 className="text-lg font-semibold text-white">Department Stats</h2>
                      </div>
                      <div className="p-6">
                        <div className="space-y-4">
                          {stats.loading ? (
                            <div className="flex justify-center items-center h-32">
                              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                            </div>
                          ) : (
                            <>
                              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Teachers</p>
                                <p className="text-2xl font-semibold text-gray-800 dark:text-white">
                                  {stats.totalTeachers.toLocaleString()}
                                </p>
                              </div>
                              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Students</p>
                                <p className="text-2xl font-semibold text-gray-800 dark:text-white">
                                  {stats.totalStudents.toLocaleString()}
                                </p>
                              </div>
                              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Courses</p>
                                <p className="text-2xl font-semibold text-gray-800 dark:text-white">
                                  {stats.activeCourses.toLocaleString()}
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-600 dark:text-gray-400">No department data available</p>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default DepartmentHeadDashboard;