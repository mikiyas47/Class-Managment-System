import { useState, useEffect } from 'react';
import { FaHome, FaBook, FaCalendarAlt, FaUserGraduate, FaSignOutAlt, FaBars } from 'react-icons/fa';
import TeacherSidebar from './TeacherSidebar';
import MyClassesPage from './MyClassesPage';
import ExamsPage from './ExamsPage';
import AnnouncementsPage from './AnnouncementsPage';
import QuestionsPage from './QuestionsPage';
import AssignmentsPage from './AssignmentsPage';
import TeacherStudentsPage from './TeacherStudentsPage';
import TeacherScoresPage from './TeacherScoresPage';
import SettingsPage from './SettingsPage';
import './TeacherDashboard.css';

const TeacherDashboard = ({ user, onLogout, courses = [], announcements = [], loading: externalLoading = false }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [internalLoading, setInternalLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalClasses: 0,
    upcomingClasses: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [upcomingClasses, setUpcomingClasses] = useState([]);

  // Use either external loading state or internal loading state
  const loading = externalLoading || internalLoading;

  useEffect(() => {
    // Fetch real data for stats
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        
        // Import the API base URL
        const { API_BASE_URL } = await import('../api');
        
        // Fetch total students count for this teacher only
        const studentsRes = await fetch(`${API_BASE_URL}/api/teachers/${user._id}/students`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        let totalStudents = 0;
        if (studentsRes.ok) {
          const studentsData = await studentsRes.json();
          totalStudents = studentsData.count || 0;
        }
        
        // Use real courses count
        const totalClasses = courses.length || 0;
        
        // For upcoming classes, we'll use a simple count for now
        const upcomingClasses = Math.min(totalClasses, 3);
        
        setStats({
          totalStudents,
          totalClasses,
          upcomingClasses,
        });
        
        // Fetch recent activity (assignments and exams) - only for this teacher
        const assignmentsRes = await fetch(`${API_BASE_URL}/api/assignments`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const examsRes = await fetch(`${API_BASE_URL}/api/exams`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const recentActivityItems = [];
        
        if (assignmentsRes.ok) {
          const assignmentsData = await assignmentsRes.json();
          const assignments = assignmentsData.data || [];
          
          assignments.slice(0, 2).forEach(assignment => {
            recentActivityItems.push({
              id: assignment._id,
              type: 'assignment',
              title: `New assignment created`,
              description: `${assignment.filename} - ${new Date(assignment.createdAt).toLocaleString()}`,
              icon: 'FaBook'
            });
          });
        }
        
        if (examsRes.ok) {
          const examsData = await examsRes.json();
          const exams = examsData.data || [];
          
          exams.slice(0, 1).forEach(exam => {
            recentActivityItems.push({
              id: exam._id,
              type: 'exam',
              title: `New exam scheduled`,
              description: `${exam.title} - ${new Date(exam.date).toLocaleDateString()}`,
              icon: 'FaCalendarAlt'
            });
          });
        }
        
        setRecentActivity(recentActivityItems);
        
        // Set upcoming classes based on courses
        const upcomingClassesItems = courses.slice(0, 3).map((course, index) => ({
          id: course._id,
          title: course.subject || 'Class',
          room: `Room ${index + 1}0${index + 1}`,
          time: `${9 + index}:00 AM - ${10 + index}:30 AM`,
          date: 'Today'
        }));
        
        setUpcomingClasses(upcomingClassesItems);
        
        setInternalLoading(false);
      } catch (error) {
        console.error('Error fetching stats:', error);
        setInternalLoading(false);
      }
    };

    if (!externalLoading) {
      fetchStats();
    } else {
      setInternalLoading(false);
    }
  }, [externalLoading, courses.length, user._id]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      onLogout();
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="p-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-8">Dashboard Overview</h2>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white transform transition-transform hover:scale-105 teacher-dashboard-card">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-blue-400 bg-opacity-30">
                    <FaUserGraduate className="text-2xl" />
                  </div>
                  <div className="ml-4">
                    <p className="text-blue-100">Total Students</p>
                    <p className="text-3xl font-bold">{stats.totalStudents}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white transform transition-transform hover:scale-105 teacher-dashboard-card">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-green-400 bg-opacity-30">
                    <FaBook className="text-2xl" />
                  </div>
                  <div className="ml-4">
                    <p className="text-green-100">Total Classes</p>
                    <p className="text-3xl font-bold">{stats.totalClasses}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-6 text-white transform transition-transform hover:scale-105 teacher-dashboard-card">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-yellow-400 bg-opacity-30">
                    <FaCalendarAlt className="text-2xl" />
                  </div>
                  <div className="ml-4">
                    <p className="text-yellow-100">Upcoming Classes</p>
                    <p className="text-3xl font-bold">{stats.upcomingClasses}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity and Schedule */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <div className="bg-white rounded-xl shadow-md p-6 teacher-dashboard-card">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-800">Recent Activity</h3>
                  <button className="text-blue-500 hover:text-blue-700 text-sm font-medium">View All</button>
                </div>
                <div className="space-y-4">
                  {recentActivity.length > 0 ? (
                    recentActivity.map(activity => (
                      <div key={activity.id} className="flex items-start p-4 hover:bg-gray-50 rounded-lg transition-colors">
                        <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                          <FaBook className="text-sm" />
                        </div>
                        <div className="ml-4">
                          <p className="font-medium text-gray-800">{activity.title}</p>
                          <p className="text-sm text-gray-500">{activity.description}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500">No recent activity</p>
                  )}
                </div>
              </div>
              
              {/* Upcoming Classes */}
              <div className="bg-white rounded-xl shadow-md p-6 teacher-dashboard-card">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-800">Upcoming Classes</h3>
                  <button className="text-blue-500 hover:text-blue-700 text-sm font-medium">View Schedule</button>
                </div>
                <div className="space-y-4">
                  {upcomingClasses.length > 0 ? (
                    upcomingClasses.map(cls => (
                      <div key={cls.id} className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <FaBook className="text-blue-500 text-xl" />
                        </div>
                        <div className="ml-4 flex-1">
                          <p className="font-medium text-gray-800">{cls.title}</p>
                          <p className="text-sm text-gray-500">{cls.room} • {cls.time}</p>
                        </div>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">{cls.date}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500">No upcoming classes</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      case 'myclasses':
        return <MyClassesPage user={user} />;
      case 'exams':
        return <ExamsPage user={user} />;
      case 'questions':
        return <QuestionsPage user={user} />;
      case 'assignments':
        return <AssignmentsPage user={user} />;
      case 'announcements':
        return <AnnouncementsPage user={user} />;
      case 'students':
        return <TeacherStudentsPage user={user} />;
      case 'scores':
        return <TeacherScoresPage user={user} />;
      case 'settings':
        return <SettingsPage user={user} />;
      default:
        return <div>Page not found</div>;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 teacher-dashboard-container">
      <TeacherSidebar 
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
        <header className="bg-white shadow-sm z-10 teacher-dashboard-header">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center">
              <button 
                className="mr-4 text-gray-500 hover:text-gray-700"
                onClick={toggleSidebar}
              >
                <FaBars className="h-6 w-6" />
              </button>
              <h1 className="text-xl font-semibold text-gray-800">
                {activeTab === 'dashboard' ? 'Dashboard' : 
                 activeTab === 'myclasses' ? 'My Classes' : 
                 activeTab === 'exams' ? 'Exams' : 
                 activeTab === 'questions' ? 'Questions' : 
                 activeTab === 'assignments' ? 'Assignments' : 
                 activeTab === 'announcements' ? 'Announcements' : 
                 activeTab === 'students' ? 'Students' : 
                 activeTab === 'scores' ? 'Student Scores' : 
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
              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center teacher-dashboard-user-avatar">
                <span className="text-white font-medium">
                  {user?.name?.charAt(0) || 'T'}
                </span>
              </div>
            </div>
          </div>
        </header>
        
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100">
          {loading && activeTab !== 'myclasses' ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            renderContent()
          )}
        </main>
      </div>
    </div>
  );
};

export default TeacherDashboard;