import { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaSave, FaTimes, FaBullhorn } from 'react-icons/fa';

const AnnouncementsPage = ({ user }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [formData, setFormData] = useState({
    class: '',
    title: '',
    message: ''
  });

  useEffect(() => {
    fetchAnnouncements();
    fetchTeacherClasses();
  }, [user]);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Import the API base URL
      const { API_BASE_URL } = await import('../api');
      const response = await fetch(`${API_BASE_URL}/api/announcements`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch announcements');
      }

      const data = await response.json();
      // Filter announcements to only show those created by this teacher
      const teacherAnnouncements = data.data.filter(announcement => 
        announcement.teacher._id === user._id || announcement.teacher === user._id
      );
      setAnnouncements(teacherAnnouncements);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch only classes that the teacher teaches
  const fetchTeacherClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Import the API base URL
      const { API_BASE_URL } = await import('../api');
      
      // First, get the courses the teacher teaches
      const coursesResponse = await fetch(`${API_BASE_URL}/api/teachers/${user._id}/courses`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!coursesResponse.ok) {
        throw new Error('Failed to fetch teacher courses');
      }

      const coursesData = await coursesResponse.json();
      const teacherCourses = coursesData.data || [];
      
      // Extract unique class IDs from the courses
      const classIds = [...new Set(teacherCourses.map(course => course.class._id || course.class))];
      
      // Fetch class details for these classes
      const classesData = await Promise.all(classIds.map(async (classId) => {
        try {
          const classResponse = await fetch(`${API_BASE_URL}/api/classes/${classId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (classResponse.ok) {
            const classData = await classResponse.json();
            return classData.data;
          }
          return null;
        } catch (err) {
          console.error(`Error fetching class ${classId}:`, err);
          return null;
        }
      }));
      
      // Filter out any null values and set the classes state
      setClasses(classesData.filter(cls => cls !== null));
    } catch (err) {
      console.error('Error fetching teacher classes:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate that the selected class is one the teacher teaches
    const isValidClass = classes.some(cls => cls._id === formData.class);
    if (!isValidClass) {
      setError('Please select a valid class that you teach');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      
      // Import the API base URL
      const { API_BASE_URL } = await import('../api');
      const url = editingAnnouncement 
        ? `${API_BASE_URL}/api/announcements/${editingAnnouncement._id}` 
        : `${API_BASE_URL}/api/announcements`;
      
      const method = editingAnnouncement ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          teacher: user._id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save announcement');
      }

      // Reset form and refresh data
      setFormData({
        class: '',
        title: '',
        message: ''
      });
      setEditingAnnouncement(null);
      setShowForm(false);
      fetchAnnouncements();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (announcement) => {
    // Verify that the announcement's class is one the teacher teaches
    const isValidClass = classes.some(cls => 
      cls._id === (announcement.class._id || announcement.class)
    );
    
    if (!isValidClass) {
      setError('This announcement is for a class you do not teach');
      return;
    }
    
    setEditingAnnouncement(announcement);
    setFormData({
      class: announcement.class._id || announcement.class,
      title: announcement.title,
      message: announcement.message
    });
    setShowForm(true);
  };

  const handleDelete = async (announcementId) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      
      // Import the API base URL
      const { API_BASE_URL } = await import('../api');
      
      const response = await fetch(`${API_BASE_URL}/api/announcements/${announcementId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete announcement');
      }

      fetchAnnouncements();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancel = () => {
    setFormData({
      class: '',
      title: '',
      message: ''
    });
    setEditingAnnouncement(null);
    setShowForm(false);
  };

  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getClassInfo = (classId) => {
    const classItem = classes.find(c => c._id === classId || c._id === classId._id);
    if (!classItem) return 'Unknown Class';
    
    // Display "4th Year, First Semester - Software" instead of "4A - Software"
    const yearSuffix = ['1st', '2nd', '3rd', '4th'][classItem.year - 1] || `${classItem.year}th`;
    const semesterText = classItem.semester === 'first' ? 'First Semester' : 'Second Semester';
    
    return `${yearSuffix} Year, ${semesterText} - ${classItem.department?.name || 'Department'}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
        <p>Error: {error}</p>
        <button 
          onClick={() => {
            setError(null);
            fetchAnnouncements();
            fetchTeacherClasses();
          }}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Announcements</h1>
          <p className="text-gray-600 mt-2">Manage your class announcements</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="mt-4 md:mt-0 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
        >
          <FaPlus className="mr-2" />
          Create Announcement
        </button>
      </div>

      {/* Announcement Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            {editingAnnouncement ? 'Edit Announcement' : 'Create New Announcement'}
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Class *
                </label>
                <select
                  name="class"
                  value={formData.class}
                  onChange={handleInputChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a class you teach</option>
                  {classes.map((cls) => (
                    <option key={cls._id} value={cls._id}>
                      {['1st', '2nd', '3rd', '4th'][cls.year - 1] || `${cls.year}th`} Year, {cls.semester === 'first' ? 'First Semester' : 'Second Semester'} - {cls.department?.name || 'Department'}
                    </option>
                  ))}
                </select>
                {classes.length === 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    You don't have any classes assigned. Please contact your administrator.
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Important Exam Information"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message *
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  rows="4"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your announcement message here..."
                  required
                />
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
              >
                <FaSave className="mr-2" />
                {editingAnnouncement ? 'Update Announcement' : 'Create Announcement'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg flex items-center transition-colors"
              >
                <FaTimes className="mr-2" />
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Announcements List */}
      {announcements.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-8 text-center">
          <FaBullhorn className="mx-auto text-gray-400 text-4xl" />
          <h3 className="text-xl font-semibold text-gray-800 mt-4">No Announcements</h3>
          <p className="text-gray-600 mt-2">You haven't created any announcements yet.</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Create Your First Announcement
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Class
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Message
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {announcements.map((announcement) => (
                  <tr key={announcement._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{announcement.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {getClassInfo(announcement.class)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-md truncate">
                        {announcement.message}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(announcement.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEdit(announcement)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(announcement._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnouncementsPage;