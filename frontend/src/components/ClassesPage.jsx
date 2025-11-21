import { useState, useEffect } from 'react';
import { FaPlus, FaUniversity, FaCalendarAlt, FaListAlt, FaTimes, FaEdit, FaTrash } from 'react-icons/fa';

const ClassesPage = ({ user }) => { // Accept user prop
  const [classes, setClasses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalError, setModalError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredClasses, setFilteredClasses] = useState([]);
  
  const [formData, setFormData] = useState({
    department: '',
    year: '',
    semester: 'first'
  });

  // Add new state variables for edit functionality
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);

  // Get department name by ID or department object
  const getDepartmentName = (department) => {
    console.log('Getting department name for:', department);
    console.log('Available departments:', departments);
    
    // If department is already an object with name property
    if (department && typeof department === 'object' && department.name) {
      console.log('Department is an object with name:', department.name);
      return department.name;
    }
    
    // If department is an ID (string)
    if (typeof department === 'string') {
      const dept = departments.find(d => d._id === department);
      if (dept) {
        console.log('Found department by ID:', dept.name);
        return dept.name;
      }
    }
    
    // If department is an object with _id
    if (department && department._id) {
      const dept = departments.find(d => d._id === department._id);
      if (dept) {
        console.log('Found department by _id:', dept.name);
        return dept.name;
      }
    }
    
    console.log('Department not found or invalid format:', department);
    return 'N/A';
  };

  // Filter classes based on search term
  const filterClasses = (classes, term) => {
    if (!term) return classes;
    const lowerTerm = term.toLowerCase();
    return classes.filter(cls => {
      const deptName = getDepartmentName(cls.department);
      return (
        deptName.toLowerCase().includes(lowerTerm) ||
        (cls.year && cls.year.toString().includes(term)) ||
        (cls.semester && cls.semester.toLowerCase().includes(lowerTerm))
      );
    });
  };

  // Fetch classes from API
  const fetchClasses = async () => {
    try {
      console.log('Fetching classes...');
      // Import the API base URL
      const { API_BASE_URL } = await import('../api');
      const response = await fetch(`${API_BASE_URL}/api/classes`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to fetch classes:', response.status, response.statusText, errorData);
        throw new Error(errorData.message || 'Failed to fetch classes');
      }
      
      const data = await response.json();
      console.log('Classes data:', data);
      const classesList = data.data || [];
      
      // Log the first class to check its structure
      if (classesList.length > 0) {
        console.log('First class data:', classesList[0]);
        console.log('Department field in first class:', {
          raw: classesList[0].department,
          type: typeof classesList[0].department,
          isObject: typeof classesList[0].department === 'object' && classesList[0].department !== null
        });
      }
      
      setClasses(classesList);
      setFilteredClasses(filterClasses(classesList, searchTerm));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      console.log('Fetching departments...');
      // Import the API base URL
      const { API_BASE_URL } = await import('../api');
      const response = await fetch(`${API_BASE_URL}/api/departments`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Departments data:', data);
        setDepartments(data.data || []);
      } else {
        console.error('Failed to fetch departments:', response.status, response.statusText);
      }
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'year' ? parseInt(value) : value
    }));
  };

  // Handle edit class
  const handleEditClass = async (classData) => {
    try {
      // Clear any previous modal errors
      setModalError(null);
      
      // Set the form data to the class being edited
      setFormData({
        department: classData.department._id || classData.department,
        year: classData.year,
        semester: classData.semester
      });
      
      // Set the editing class and open the edit modal
      setEditingClass(classData);
      setIsEditModalOpen(true);
    } catch (err) {
      setModalError(err.message);
    }
  };

  // Handle update class
  const handleUpdateClass = async (e) => {
    e.preventDefault();
    
    try {
      // Clear any previous modal errors
      setModalError(null);
      
      // Validate required fields
      if (!formData.department || !formData.year || !formData.semester) {
        throw new Error('All fields are required');
      }

      // Import the API base URL
      const { API_BASE_URL } = await import('../api');
      const response = await fetch(`${API_BASE_URL}/api/classes/${editingClass._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update class');
      }

      // Refresh the classes list
      await fetchClasses();
      setIsEditModalOpen(false);
      setEditingClass(null);
      // Reset form
      setFormData({
        department: user?.department?._id || '',
        year: '',
        semester: 'first'
      });
    } catch (err) {
      setModalError(err.message);
    }
  };

  // Handle delete class
  const handleDeleteClass = async (classId) => {
    if (!window.confirm('Are you sure you want to delete this class? This action cannot be undone.')) {
      return;
    }
    
    try {
      // Import the API base URL
      const { API_BASE_URL } = await import('../api');
      const response = await fetch(`${API_BASE_URL}/api/classes/${classId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete class');
      }

      // Refresh the classes list
      await fetchClasses();
    } catch (err) {
      setError(err.message);
    }
  };

  // Add new class
  const handleAddClass = async (e) => {
    e.preventDefault();
    
    try {
      // Clear any previous modal errors
      setModalError(null);
      
      // Validate required fields
      if (!formData.department || !formData.year || !formData.semester) {
        throw new Error('All fields are required');
      }

      // Import the API base URL
      const { API_BASE_URL } = await import('../api');
      const response = await fetch(`${API_BASE_URL}/api/classes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add class');
      }

      // Refresh the classes list
      await fetchClasses();
      setIsModalOpen(false);
      // Reset form
      setFormData({
        department: user?.department?._id || '', // Set to department head's department by default
        year: '',
        semester: 'first'
      });
    } catch (err) {
      setModalError(err.message);
    }
  };

  // Close modal and clear errors
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalError(null);
  };

  // Close edit modal and clear errors
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingClass(null);
    setModalError(null);
    // Reset form
    setFormData({
      department: user?.department?._id || '',
      year: '',
      semester: 'first'
    });
  };

  // Format semester for display
  const formatSemester = (semester) => {
    return semester.charAt(0).toUpperCase() + semester.slice(1) + ' Semester';
  };

  // Update filtered classes when search term or classes change
  useEffect(() => {
    setFilteredClasses(filterClasses(classes, searchTerm));
  }, [searchTerm, classes, departments]);

  // Initial data fetch and set default department
  useEffect(() => {
    fetchClasses();
    fetchDepartments();
    
    // Set default department to department head's department
    if (user?.department?._id) {
      setFormData(prev => ({
        ...prev,
        department: user.department._id
      }));
    }
  }, [user]); // Add user to dependency array

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Removed page-level error display since we're now showing errors in the modal

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex flex-col space-y-4">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-800">Classes Management</h1>
          
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Showing {filteredClasses.length} of {classes.length} classes
            {searchTerm && (
              <span className="ml-2 text-black dark:text-black">
                (filtered by: "{searchTerm}")
              </span>
            )}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full items-start sm:items-end">
            <div className="flex-grow max-w-md">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search classes..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md flex items-center w-40 justify-center"
            >
              <FaPlus className="mr-2" /> Add Class
            </button>
          </div>
        </div>
      </div>

      {/* Classes Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Year
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Semester
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredClasses.length === 0 ? (
                <tr key="no-classes" className="hover:bg-gray-50">
                  <td className="px-6 py-12 text-center" colSpan="4">
                    <div className="flex flex-col items-center justify-center">
                      <FaListAlt className="h-12 w-12 text-gray-400 mb-2" />
                      <p className="text-lg font-medium text-gray-900">
                        No classes found
                      </p>
                      {searchTerm && (
                        <p className="text-sm text-gray-900 mt-1">
                          No classes match your search "{searchTerm}"
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredClasses.map((cls) => (
                  <tr key={cls._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FaUniversity className="mr-2 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">
                          {getDepartmentName(cls.department)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FaCalendarAlt className="mr-2 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          Year {cls.year}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FaListAlt className="mr-2 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {formatSemester(cls.semester)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditClass(cls)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                        title="Edit"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDeleteClass(cls._id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))
              )}

            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Class Modal */}
      {(isModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                {isEditModalOpen ? 'Edit Class' : 'Add New Class'}
              </h2>
              <button 
                onClick={isEditModalOpen ? handleCloseEditModal : handleCloseModal}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <FaTimes />
              </button>
            </div>
            
            <form onSubmit={isEditModalOpen ? handleUpdateClass : handleAddClass} className="px-6 py-4">
              {modalError && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                  {modalError}
                </div>
              )}
              
              <div className="space-y-4">
                {/* Display department information instead of dropdown */}
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Department
                  </label>
                  <div className="text-sm text-gray-900 dark:text-white">
                    {(() => {
                      const selectedDepartment = departments.find(d => d._id === formData.department);
                      return selectedDepartment ? selectedDepartment.name : 'Not selected';
                    })()}
                  </div>
                  <input
                    type="hidden"
                    name="department"
                    value={formData.department}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Year *
                  </label>
                  <select
                    name="year"
                    value={formData.year}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Year</option>
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                    <option value="5">5th Year</option>
                    <option value="6">6th Year</option>
                    <option value="7">7th Year</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Semester *
                  </label>
                  <select
                    name="semester"
                    value={formData.semester}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="first">First Semester</option>
                    <option value="second">Second Semester</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={isEditModalOpen ? handleCloseEditModal : handleCloseModal}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
                >
                  {isEditModalOpen ? 'Update Class' : 'Add Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassesPage;
