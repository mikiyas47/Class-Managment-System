import React from 'react';
import { 
  FaTachometerAlt,
  FaUsers, 
  FaUserShield, 
  FaBuilding,
  FaChartLine, 
  FaCog, 
  FaSignOutAlt,
  FaUserPlus
} from 'react-icons/fa';

const AdminSidebar = ({ activeNav, setActiveNav, onLogout, user }) => {
  const adminNavItems = [
    { 
      id: 'dashboard', 
      icon: <FaTachometerAlt />, 
      label: 'Dashboard',
      subItems: []
    },
    { 
      id: 'add-admin', 
      icon: <FaUserPlus />, 
      label: 'Add Admin',
      subItems: []
    },
    { 
      id: 'add-department', 
      icon: <FaBuilding />, 
      label: 'Departments',
      subItems: []
    },
    { 
      id: 'add-department-head', 
      icon: <FaUserShield />, 
      label: 'Department Heads',
      subItems: []
    },
    { 
      id: 'add-students', 
      icon: <FaUserPlus />, 
      label: 'Add Students',
      subItems: []
    },

    { 
      id: 'settings', 
      icon: <FaCog />, 
      label: 'Settings',
      subItems: []
    },
  ];

  const [expandedItems, setExpandedItems] = React.useState({
    dashboard: false,
    departments: false,
    'department-heads': false,
    settings: false
  });

  const toggleSubItems = (itemId) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  return (
    <aside className="flex flex-col h-full bg-indigo-800 text-white">
      <div className="p-4 border-b border-indigo-700">
        <h2 className="text-xl font-bold">Class Management</h2>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-4">
        {adminNavItems.map((item) => (
          <div key={item.id} className="px-2">
            <button
              className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors duration-200 ${
                activeNav === item.id 
                  ? 'bg-indigo-900 text-white' 
                  : 'text-indigo-100 hover:bg-indigo-700'
              }`}
              onClick={() => {
                if (item.subItems && item.subItems.length > 0) {
                  toggleSubItems(item.id);
                } else {
                  setActiveNav(item.id);
                }
              }}
            >
              <span className="text-lg mr-3">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
              {item.subItems && item.subItems.length > 0 && (
                <span className="ml-auto">
                  {expandedItems[item.id] ? '▼' : '►'}
                </span>
              )}
            </button>
            
            {item.subItems && item.subItems.length > 0 && expandedItems[item.id] && (
              <div className="pl-4 py-2 space-y-1">
                {item.subItems.map((subItem) => (
                  <button
                    key={subItem.id}
                    className={`w-full flex items-center px-4 py-2 text-left rounded-lg transition-colors duration-200 text-sm ${
                      activeNav === subItem.id 
                        ? 'bg-indigo-900 text-white' 
                        : 'text-indigo-200 hover:bg-indigo-700'
                    }`}
                    onClick={() => setActiveNav(subItem.id)}
                  >
                    <span className="mr-2">{subItem.icon}</span>
                    <span>{subItem.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
      
      <div className="p-4 border-t border-indigo-700">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold mr-3">
            {user?.name?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name || 'Admin'}</p>
            <p className="text-xs text-indigo-200">Administrator</p>
          </div>
        </div>
        <button 
          className="w-full flex items-center justify-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200"
          onClick={onLogout}
          title="Logout"
        >
          <FaSignOutAlt className="mr-2" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;