import { useState, useEffect } from 'react';
import { 
  FaBars, 
  FaTachometerAlt,
  FaUserShield, 
  FaChalkboardTeacher,
  FaUserGraduate,
  FaBuilding,
  FaBook,
  FaTasks,
  FaChartLine, 
  FaSignOutAlt
} from 'react-icons/fa';
import AdminSidebar from './AdminSidebar';
import AddDepartmentHead from './AddDepartmentHead';
import DepartmentsPage from './DepartmentsPage';
import AddStudentsPage from './AddStudentsPage';
import SettingsPage from './SettingsPage';

const AdminDashboard = ({ user, onLogout }) => {
  const [stats, setStats] = useState({
    departmentHeads: 0,
    teachers: 0,
    students: 0,
    departments: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('dashboard');

  useEffect(() => {
    fetchStats();
    
    // Close sidebar on mobile when clicking outside
    const handleClickOutside = (e) => {
      if (window.innerWidth <= 1023 && isSidebarOpen && !e.target.closest('.admin-sidebar-wrapper') && !e.target.closest('.menu-toggle')) {
        setIsSidebarOpen(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isSidebarOpen]);
  
  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get token from localStorage
      const token = localStorage.getItem('token');
      
      // Fetch counts from different endpoints
      const [departmentHeadsRes, teachersRes, studentsRes, departmentsRes] = await Promise.all([
        fetch('http://localhost:5000/api/department-heads', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }),
        fetch('http://localhost:5000/api/teachers', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }),
        fetch('http://localhost:5000/api/students', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }),
        fetch('http://localhost:5000/api/departments', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      ]);
      
      const departmentHeadsData = await departmentHeadsRes.json();
      const teachersData = await teachersRes.json();
      const studentsData = await studentsRes.json();
      const departmentsData = await departmentsRes.json();
      
      setStats({
        departmentHeads: departmentHeadsData.count || departmentHeadsData.data?.length || 0,
        teachers: teachersData.count || teachersData.data?.length || 0,
        students: studentsData.count || studentsData.data?.length || 0,
        departments: departmentsData.count || departmentsData.data?.length || 0
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError('Failed to fetch dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  const toggleSidebar = (e) => {
    e.stopPropagation();
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Dashboard content component
  const DashboardContent = () => (
    <>
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded mb-6">
          <p>{error}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
                  <FaUserShield className="text-xl" />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Department Heads</p>
                  <p className="text-2xl font-bold">{stats.departmentHeads}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
                  <FaChalkboardTeacher className="text-xl" />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Teachers</p>
                  <p className="text-2xl font-bold">{stats.teachers}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-purple-100 text-purple-600 mr-4">
                  <FaUserGraduate className="text-xl" />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Students</p>
                  <p className="text-2xl font-bold">{stats.students}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-yellow-500">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-yellow-100 text-yellow-600 mr-4">
                  <FaBuilding className="text-xl" />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Departments</p>
                  <p className="text-2xl font-bold">{stats.departments}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Recent Activity</h2>
              <button className="text-blue-600 hover:text-blue-800 font-medium">View All</button>
            </div>
            <ul className="space-y-4">
              <li className="flex items-start border-b pb-4 last:border-0 last:pb-0">
                <div className="p-2 rounded-full bg-blue-100 text-blue-600 mr-3 mt-1">
                  <FaUserShield />
                </div>
                <div>
                  <p className="text-gray-800">New department head registered: Sarah Johnson (Computer Science)</p>
                  <span className="text-gray-500 text-sm">2 hours ago</span>
                </div>
              </li>
              <li className="flex items-start border-b pb-4 last:border-0 last:pb-0">
                <div className="p-2 rounded-full bg-green-100 text-green-600 mr-3 mt-1">
                  <FaChalkboardTeacher />
                </div>
                <div>
                  <p className="text-gray-800">Teacher added: Michael Brown (Mathematics)</p>
                  <span className="text-gray-500 text-sm">5 hours ago</span>
                </div>
              </li>
              <li className="flex items-start border-b pb-4 last:border-0 last:pb-0">
                <div className="p-2 rounded-full bg-purple-100 text-purple-600 mr-3 mt-1">
                  <FaUserGraduate />
                </div>
                <div>
                  <p className="text-gray-800">Student enrolled: Emily Davis (Computer Science)</p>
                  <span className="text-gray-500 text-sm">1 day ago</span>
                </div>
              </li>
              <li className="flex items-start">
                <div className="p-2 rounded-full bg-yellow-100 text-yellow-600 mr-3 mt-1">
                  <FaBook />
                </div>
                <div>
                  <p className="text-gray-800">Course created: Advanced Algorithms</p>
                  <span className="text-gray-500 text-sm">2 days ago</span>
                </div>
              </li>
            </ul>
          </div>
        </>
      )}
    </>
  );

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Admin Sidebar */}
      <div className={`fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden ${isSidebarOpen ? 'block' : 'hidden'}`} onClick={toggleSidebar}></div>
      <div className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <AdminSidebar 
          activeNav={activeNav}
          setActiveNav={setActiveNav}
          onLogout={onLogout}
          user={user}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm z-10">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center">
              <button 
                className="text-gray-500 hover:text-gray-700 mr-4 lg:hidden" 
                onClick={toggleSidebar}
              >
                <FaBars className="text-xl" />
              </button>
              <h1 className="text-xl font-semibold text-gray-800">
                {activeNav === 'dashboard' ? 'Dashboard' : activeNav.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
              </h1>
            </div>
            <div className="flex items-center">
              <span className="text-gray-600 mr-4 hidden md:block">Welcome back, {user?.name || 'Admin'}</span>
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                {user?.name?.charAt(0).toUpperCase() || 'A'}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            {activeNav === 'dashboard' ? (
              <DashboardContent />
            ) : activeNav === 'add-department-head' ? (
              <AddDepartmentHead setActiveNav={setActiveNav} user={user} />
            ) : activeNav === 'add-department' ? (
              <DepartmentsPage />
            ) : activeNav === 'add-students' ? (
              <AddStudentsPage />
            ) : activeNav === 'settings' ? (
              <SettingsPage user={user} />
            ) : (
              <DashboardContent />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;