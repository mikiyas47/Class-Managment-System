import { FaHome, FaBook, FaUserGraduate, FaSignOutAlt, FaChalkboardTeacher, FaClipboardList, FaBullhorn, FaQuestionCircle, FaFileAlt, FaChartBar } from 'react-icons/fa';

const TeacherSidebar = ({ user, activeTab, setActiveTab, onLogout, sidebarOpen, setSidebarOpen }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: FaHome },
    { id: 'myclasses', label: 'My Classes', icon: FaChalkboardTeacher },
    { id: 'exams', label: 'Exams', icon: FaClipboardList },
    { id: 'questions', label: 'Questions', icon: FaQuestionCircle },
    { id: 'assignments', label: 'Assignments', icon: FaFileAlt },
    { id: 'announcements', label: 'Announcements', icon: FaBullhorn },
    { id: 'students', label: 'Students', icon: FaUserGraduate },
    { id: 'scores', label: 'Student Scores', icon: FaChartBar },
  ];

  return (
    <>
      {/* Mobile sidebar overlay */}
      <div 
        className={`fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden ${sidebarOpen ? 'block' : 'hidden'}`} 
        onClick={() => setSidebarOpen(false)}
      ></div>
      
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
                      md:relative md:translate-x-0 w-64 bg-gradient-to-b from-blue-800 to-blue-900 text-white shadow-2xl z-30 transition-transform duration-300 ease-in-out`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-5 border-b border-blue-700">
            <div className="flex items-center space-x-2">
              <div className="bg-white p-1 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h1 className="text-xl font-bold">EduPortal</h1>
            </div>
            <button 
              className="md:hidden text-white hover:text-blue-200"
              onClick={() => setSidebarOpen(false)}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* User Profile */}
          <div className="p-5 border-b border-blue-700">
            <div className="flex items-center">
              <div className="h-14 w-14 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                {user?.name?.charAt(0) || 'T'}
              </div>
              <div className="ml-4 overflow-hidden">
                <p className="font-semibold truncate">{user?.name || 'Teacher'}</p>
                <p className="text-blue-200 text-sm truncate">{user?.email || 'teacher@example.com'}</p>
                <span className="inline-flex items-center px-2 py-1 mt-1 rounded-full text-xs font-medium bg-blue-600 bg-opacity-50 text-blue-100">
                  Teacher
                </span>
              </div>
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-6">
            <ul className="space-y-2 px-3">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => setActiveTab(item.id)}
                      className={`flex items-center w-full px-4 py-3.5 text-base font-medium rounded-xl transition-all duration-200 ${
                        activeTab === item.id 
                          ? 'bg-white text-blue-700 shadow-lg transform scale-105' 
                          : 'text-blue-100 hover:bg-blue-700 hover:text-white hover:shadow-md'
                      }`}
                    >
                      <Icon className="mr-4 text-xl" />
                      <span>{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
          
          {/* Logout */}
          <div className="p-5 border-t border-blue-700">
            <button
              onClick={onLogout}
              className="flex items-center w-full px-4 py-3.5 text-base font-medium text-blue-100 rounded-xl hover:bg-red-500 hover:text-white transition-all duration-200 hover:shadow-lg"
            >
              <FaSignOutAlt className="mr-4 text-xl" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default TeacherSidebar;