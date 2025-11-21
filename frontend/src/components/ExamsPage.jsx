import { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaSave, FaTimes, FaClipboardList } from 'react-icons/fa';

const ExamsPage = ({ user }) => {
  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [formData, setFormData] = useState({
    class: '',
    title: '',
    duration: '',
    startTime: ''
  });

  useEffect(() => {
    fetchExams();
    fetchTeacherClasses(); // Changed from fetchClasses to fetchTeacherClasses
  }, [user]);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Import the API base URL
      const { API_BASE_URL } = await import('../api');
      const response = await fetch(`${API_BASE_URL}/api/exams?teacher=${user._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch exams');
      }

      const data = await response.json();
      setExams(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Modified to fetch only classes that the teacher teaches
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
      
      // Set courses state
      setCourses(teacherCourses);
      
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
      // Fallback to fetching all classes if there's an error
      fetchAllClasses();
    }
  };

  // Fallback method to fetch all classes (in case the teacher courses endpoint fails)
  const fetchAllClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Import the API base URL
      const { API_BASE_URL } = await import('../api');
      const response = await fetch(`${API_BASE_URL}/api/classes`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch classes');
      }

      const data = await response.json();
      setClasses(data.data || []);
    } catch (err) {
      console.error('Error fetching classes:', err);
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
    const selectedCourse = courses.find(course => course.class._id === formData.class);
    if (!selectedCourse) {
      setError('Please select a valid class that you teach');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      
      // Import the API base URL
      const { API_BASE_URL } = await import('../api');
      const url = editingExam 
        ? `${API_BASE_URL}/api/exams/${editingExam._id}` 
        : `${API_BASE_URL}/api/exams`;
      
      const method = editingExam ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          teacher: user._id,
          course: selectedCourse._id, // Include the course ID
          duration: parseInt(formData.duration)
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save exam');
      }

      // Reset form and refresh data
      setFormData({
        class: '',
        title: '',
        duration: '',
        startTime: ''
      });
      setEditingExam(null);
      setShowForm(false);
      fetchExams();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (exam) => {
    // Verify that the exam's class is one the teacher teaches
    const isValidClass = classes.some(cls => 
      cls._id === (exam.class._id || exam.class)
    );
    
    if (!isValidClass) {
      setError('This exam is for a class you do not teach');
      return;
    }
    
    // Find the course for this exam's class
    const examCourse = courses.find(course => 
      course.class._id === (exam.class._id || exam.class)
    );
    
    setEditingExam(exam);
    setFormData({
      class: exam.class._id || exam.class,
      title: exam.title,
      duration: exam.duration,
      startTime: exam.startTime.split('.')[0] // Remove milliseconds
    });
    setShowForm(true);
  };

  const handleDelete = async (examId) => {
    if (!window.confirm('Are you sure you want to delete this exam?')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      
      // Import the API base URL
      const { API_BASE_URL } = await import('../api');
      const response = await fetch(`${API_BASE_URL}/api/exams/${examId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete exam');
      }

      fetchExams();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancel = () => {
    setFormData({
      class: '',
      title: '',
      duration: '',
      startTime: ''
    });
    setEditingExam(null);
    setShowForm(false);
  };

  const formatDate = (dateString) => {
    // Create a new Date object from the dateString
    const date = new Date(dateString);
    
    // Format the date in Nairobi timezone (UTC+3)
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Africa/Nairobi'
    };
    
    // Use toLocaleDateString with Nairobi timezone
    return date.toLocaleDateString('en-US', options);
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
            fetchExams();
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
          <h1 className="text-3xl font-bold text-gray-800">Exams</h1>
          <p className="text-gray-600 mt-2">Manage your course exams and assessments</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="mt-4 md:mt-0 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
        >
          <FaPlus className="mr-2" />
          Create Exam
        </button>
      </div>

      {/* Exam Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            {editingExam ? 'Edit Exam' : 'Create New Exam'}
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
                  Exam Title *
                </label>
                <select
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select exam type</option>
                  <option value="Mid-exam">Mid-exam</option>
                  <option value="Final-exam">Final-exam</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (minutes) *
                </label>
                <input
                  type="number"
                  name="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                  min="1"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 90"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time *
                </label>
                <input
                  type="datetime-local"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleInputChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                {editingExam ? 'Update Exam' : 'Create Exam'}
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

      {/* Exams List */}
      {exams.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-8 text-center">
          <FaClipboardList className="mx-auto text-gray-400 text-4xl" />
          <h3 className="text-xl font-semibold text-gray-800 mt-4">No Exams Created</h3>
          <p className="text-gray-600 mt-2">You haven't created any exams yet.</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Create Your First Exam
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Exam Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Class
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Start Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {exams.map((exam) => (
                  <tr key={exam._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{exam.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {getClassInfo(exam.class)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{exam.duration} minutes</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(exam.startTime)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEdit(exam)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(exam._id)}
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

export default ExamsPage;