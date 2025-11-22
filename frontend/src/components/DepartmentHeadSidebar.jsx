import React from 'react';
import { 
  FaHome, 
  FaUserTie, 
  FaUsers, 
  FaChalkboard,
  FaBook, 
  FaClock,
  FaCog,
  FaSignOutAlt
} from 'react-icons/fa';

const DepartmentHeadSidebar = ({ isOpen, onClose, activeTab, setActiveTab, onLogout }) => {
  // Menu items without router paths for direct rendering
  const menuItems = [
    { 
      name: 'Dashboard', 
      icon: <FaHome className="w-5 h-5" />, 
      tab: 'dashboard'
    },
    { 
      name: 'Teachers', 
      icon: <FaUserTie className="w-5 h-5" />, 
      tab: 'teachers'
    },
    { 
      name: 'Students', 
      icon: <FaUsers className="w-5 h-5" />, 
      tab: 'students'
    },
    { 
      name: 'Classes', 
      icon: <FaChalkboard className="w-5 h-5" />, 
      tab: 'classes'
    },
    { 
      name: 'Courses', 
      icon: <FaBook className="w-5 h-5" />, 
      tab: 'courses'
    },
    { 
      name: 'Schedules', 
      icon: <FaClock className="w-5 h-5" />, 
      tab: 'schedules'
    },
    { 
      name: 'Settings', 
      icon: <FaCog className="w-5 h-5" />, 
      tab: 'settings'
    },
  ];

  return (
    <div className="h-full w-64 bg-white dark:bg-gray-800 shadow-lg flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Department</h2>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {menuItems.map((item) => (
            <li key={item.tab}>
              <button
                className={`flex items-center w-full px-4 py-3 rounded-lg transition-colors text-left ${
                  activeTab === item.tab
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900 dark:text-blue-100'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
                onClick={() => {
                  setActiveTab(item.tab);
                  if (onClose) onClose();
                }}
              >
                <span className="mr-3">{item.icon}</span>
                <span className="font-medium">{item.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <button
          className="flex items-center w-full px-4 py-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900 rounded-lg transition-colors"
          onClick={() => {
            // Handle logout properly by calling the onLogout function
            if (onLogout) {
              onLogout();
            }
            if (onClose) onClose();
          }}
        >
          <FaSignOutAlt className="mr-3" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default DepartmentHeadSidebar;