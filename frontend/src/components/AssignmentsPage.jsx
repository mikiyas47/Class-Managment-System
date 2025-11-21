import { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaSave, FaTimes, FaFileAlt, FaDownload } from 'react-icons/fa';

const AssignmentsPage = ({ user }) => {
  const [assignments, setAssignments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [formData, setFormData] = useState({
    class: '',
    filename: '',
    assignmentFile: null
  });

  useEffect(() => {
    fetchAssignments();
    fetchTeacherClasses();
  }, [user]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Import the API base URL
      const { API_BASE_URL } = await import('../api');
      const response = await fetch(`${API_BASE_URL}/api/assignments`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch assignments');
      }

      const data = await response.json();
      setAssignments(data.data || []);
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

  const handleFileChange = (e) => {
    setFormData({
      ...formData,
      assignmentFile: e.target.files[0]
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
    
    // Validate that a file is selected
    if (!formData.assignmentFile && !editingAssignment) {
      setError('Please select a file to upload');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      
      // Import the API base URL
      const { API_BASE_URL } = await import('../api');
      
      // Create FormData for file upload
      const formDataToSend = new FormData();
      formDataToSend.append('class', formData.class);
      formDataToSend.append('teacher', user._id);
      
      if (!editingAssignment) {
        // Only append file when creating new assignment
        formDataToSend.append('file', formData.assignmentFile);
        // Use the original file name as the filename
        formDataToSend.append('filename', formData.assignmentFile.name);
      } else {
        // For editing, we still need to send the filename
        formDataToSend.append('filename', editingAssignment.filename);
      }
      
      const url = editingAssignment 
        ? `${API_BASE_URL}/api/assignments/${editingAssignment._id}` 
        : `${API_BASE_URL}/api/assignments`;
      
      const method = editingAssignment ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save assignment');
      }

      // Reset form and refresh data
      setFormData({
        class: '',
        filename: '',
        assignmentFile: null
      });
      setEditingAssignment(null);
      setShowForm(false);
      fetchAssignments();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (assignment) => {
    // Verify that the assignment's class is one the teacher teaches
    const isValidClass = classes.some(cls => 
      cls._id === (assignment.class._id || assignment.class)
    );
    
    if (!isValidClass) {
      setError('This assignment is for a class you do not teach');
      return;
    }
    
    setEditingAssignment(assignment);
    setFormData({
      class: assignment.class._id || assignment.class,
      filename: assignment.filename,
      assignmentFile: null
    });
    setShowForm(true);
  };

  const handleDelete = async (assignmentId) => {
    if (!window.confirm('Are you sure you want to delete this assignment?')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      
      // Import the API base URL
      const { API_BASE_URL } = await import('../api');
      
      const response = await fetch(`${API_BASE_URL}/api/assignments/${assignmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete assignment');
      }

      fetchAssignments();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDownload = async (assignmentId, filename) => {
    try {
      const token = localStorage.getItem('token');
      
      // Import the API base URL
      const { API_BASE_URL } = await import('../api');
      
      const response = await fetch(`${API_BASE_URL}/api/assignments/${assignmentId}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download assignment');
      }

      // Create a blob from the response
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancel = () => {
    setFormData({
      class: '',
      filename: '',
      assignmentFile: null
    });
    setEditingAssignment(null);
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
            fetchAssignments();
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
          <h1 className="text-3xl font-bold text-gray-800">Assignments</h1>
          <p className="text-gray-600 mt-2">Manage your class assignments</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="mt-4 md:mt-0 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
        >
          <FaPlus className="mr-2" />
          Create Assignment
        </button>
      </div>

      {/* Assignment Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            {editingAssignment ? 'Edit Assignment' : 'Create New Assignment'}
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
              
              {!editingAssignment && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assignment File *
                  </label>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
                    required={!editingAssignment}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Supported formats: PDF, Word, PowerPoint, Excel, Text files
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex space-x-3">
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
              >
                <FaSave className="mr-2" />
                {editingAssignment ? 'Update Assignment' : 'Create Assignment'}
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

      {/* Assignments List */}
      {assignments.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-8 text-center">
          <FaFileAlt className="mx-auto text-gray-400 text-4xl" />
          <h3 className="text-xl font-semibold text-gray-800 mt-4">No Assignments</h3>
          <p className="text-gray-600 mt-2">You haven't created any assignments yet.</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Create Your First Assignment
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Filename
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Class
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
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
                {assignments.map((assignment) => (
                  <tr key={assignment._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{assignment.originalName || assignment.filename}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {getClassInfo(assignment.class)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {assignment.size ? (assignment.size / 1024).toFixed(1) + ' KB' : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(assignment.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleDownload(assignment._id, assignment.originalName || assignment.filename)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                        title="Download"
                      >
                        <FaDownload />
                      </button>
                      <button
                        onClick={() => handleEdit(assignment)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                        title="Edit"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(assignment._id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
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

export default AssignmentsPage;