import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentSidebar from './StudentSidebar';
import StudentDashboardMain from './StudentDashboardMain';

const StudentDashboard = ({ user, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const navigate = useNavigate();

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
        return <StudentDashboardMain user={user} onLogout={handleLogout} />;
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