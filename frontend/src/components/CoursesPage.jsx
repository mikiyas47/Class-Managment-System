import { useState, useEffect } from 'react';
import { FaPlus, FaBook, FaChalkboardTeacher, FaUniversity, FaCalendarAlt, FaSearch, FaTimes, FaEdit, FaTrash } from 'react-icons/fa';

const CoursesPage = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalError, setModalError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [editingCourse, setEditingCourse] = useState(null);
  
  const [formData, setFormData] = useState({
    subject: '',
    code: '',
    crh: 3,
    department: '',
    teacher: '',
    class: ''
  });

  // Helper function to get department name
  const getDepartmentName = (department) => {
    // If department is already an object with name property
    if (department && typeof department === 'object' && department.name) {
      return department.name;
    }
    
    // If department is an ID (string)
    if (typeof department === 'string') {
      const dept = departments.find(d => d._id === department);
      if (dept) {
        return dept.name;
      }
    }
    
    // If department is an object with _id
    if (department && department._id) {
      const dept = departments.find(d => d._id === department._id);
      if (dept) {
        return dept.name;
      }
    }
    
    return 'N/A';
  };

  // Helper function to get teacher name
  const getTeacherName = (teacher) => {
    // If teacher is already an object with name property
    if (teacher && typeof teacher === 'object' && teacher.name) {
      return teacher.name;
    }
    
    // If teacher is an ID (string)
    if (typeof teacher === 'string') {
      const teach = teachers.find(t => t._id === teacher);
      if (teach) {
        return teach.name;
      }
    }
    
    // If teacher is an object with _id
    if (teacher && teacher._id) {
      const teach = teachers.find(t => t._id === teacher._id);
      if (teach) {
        return teach.name;
      }
    }
    
    return 'N/A';
  };

  // Helper function to get class name
  const getClassName = (cls) => {
    // If class is already an object with year and semester properties
    if (cls && typeof cls === 'object' && cls.year && cls.semester) {
      return `Year ${cls.year}, ${cls.semester === 'first' ? 'First' : 'Second'} Semester`;
    }
    
    // If class is an ID (string)
    if (typeof cls === 'string') {
      const classObj = classes.find(c => c._id === cls);
      if (classObj) {
        return `Year ${classObj.year}, ${classObj.semester === 'first' ? 'First' : 'Second'} Semester`;
      }
    }
    
    // If class is an object with _id
    if (cls && cls._id) {
      const classObj = classes.find(c => c._id === cls._id);
      if (classObj) {
        return `Year ${classObj.year}, ${classObj.semester === 'first' ? 'First' : 'Second'} Semester`;
      }
    }
    
    return 'N/A';
  };

  // Fetch courses
  const fetchCourses = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/courses', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch courses');
      }
      
      const data = await response.json();
      setCourses(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/departments', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDepartments(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  };

  // Fetch teachers
  const fetchTeachers = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/teachers', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTeachers(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching teachers:', err);
    }
  };

  // Fetch classes
  const fetchClasses = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/classes', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setClasses(data.data || []);
      } else {
        console.error('Failed to fetch classes:', await response.text());
        setClasses([]);
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle class selection change
  const handleClassChange = (e) => {
    const classId = e.target.value;
    setSelectedClass(classId);
    
    // Set the department ID from the selected class
    if (classId) {
      const selectedClassObj = classes.find(c => c._id === classId);
      if (selectedClassObj && selectedClassObj.department) {
        const deptId = typeof selectedClassObj.department === 'string' 
          ? selectedClassObj.department 
          : selectedClassObj.department._id;
        setSelectedDepartmentId(deptId);
      } else {
        setSelectedDepartmentId('');
      }
    } else {
      setSelectedDepartmentId('');
    }
    
    // Filter courses by selected class
    fetchCourses();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleEditCourse = (course) => {
    setEditingCourse(course);
    setFormData({
      subject: course.subject,
      code: course.code,
      crh: course.crh,
      department: course.department?._id || '',
      teacher: course.teacher?._id || '',
      class: course.class?._id || ''
    });
    setIsModalOpen(true);
  };

  const handleDeleteCourse = async (courseId) => {
    if (window.confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      try {
        const response = await fetch(`http://localhost:5000/api/courses/${courseId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to delete course');
        }

        // Refresh the courses list
        await fetchCourses();
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingCourse(null);
    setModalError(null);
    setFormData({
      subject: '',
      code: '',
      crh: 3,
      department: '',
      teacher: '',
      class: ''
    });
  };

  // Handle add course button click
  const handleAddCourseClick = () => {
    if (!selectedClass) {
      setError('Please select a class first');
      return;
    }
    setIsModalOpen(true);
  };

  // Add new course
  const handleAddCourse = async (e) => {
    e.preventDefault();
    
    try {
      // Clear any previous modal errors
      setModalError(null);
      setError(null);
      
      // Validate required fields (excluding department and class since they're pre-selected)
      const requiredFields = ['subject', 'code', 'crh', 'teacher'];
      const missingFields = requiredFields.filter(field => !formData[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }
      
      // Check if class is selected
      if (!selectedClass) {
        throw new Error('Please select a class first');
      }
      
      // Prepare the course data according to the backend model
      const requestBody = {
        subject: formData.subject,
        code: formData.code,
        crh: formData.crh,
        department: selectedDepartmentId, // Use the pre-selected department
        teacher: formData.teacher,
        class: selectedClass // Use the pre-selected class
      };
      
      // Determine URL and method based on whether we're editing or adding
      const url = editingCourse 
        ? `http://localhost:5000/api/courses/${editingCourse._id}`
        : 'http://localhost:5000/api/courses';
      
      const method = editingCourse ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${editingCourse ? 'update' : 'add'} course`);
      }

      // Refresh the courses list
      await fetchCourses();
      handleModalClose();
    } catch (err) {
      setModalError(err.message);
      // Keep the modal open to show the error
    }
  };

  useEffect(() => {
    fetchCourses();
    fetchDepartments();
    fetchTeachers();
    fetchClasses();
  }, []);

  // Filter courses for display
  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.code.toLowerCase().includes(searchTerm.toLowerCase());
    
    // If a class is selected, only show courses for that class
    const matchesClass = selectedClass ? course.class?._id === selectedClass : true;
    
    return matchesSearch && matchesClass;
  });

  if (loading && courses.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Error banner at the top of the page */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
          <p className="font-bold">Error</p>
          <p>{error}</p>
          <button 
            onClick={() => setError(null)}
            className="mt-2 text-red-800 hover:text-red-900 font-medium"
          >
            Dismiss
          </button>
        </div>
      )}
      
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-800 mb-4 md:mb-0">Course Management</h1>
        <div className="flex items-center space-x-2">
          {selectedClass && (
            <button
              onClick={handleAddCourseClick}
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 text-sm rounded-md flex items-center justify-center transition-colors"
            >
              <FaPlus className="mr-1.5" size={14} /> Add Course
            </button>
          )}
        </div>
      </div>
      
      {/* Class Selection and Search */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="class" className="block text-sm font-medium text-black dark:text-black-300 mb-1">
            Select Class
          </label>
          <select
            id="class"
            value={selectedClass}
            onChange={handleClassChange}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-2"
          >
            <option value="">All Classes</option>
            {classes.map((cls) => (
              <option key={cls._id} value={cls._id}>
                {cls.name || `Year ${cls.year}, Sem ${cls.semester}`}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-black dark:text-black mb-1">
            Search Courses
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              id="search"
              placeholder="Search by subject or code..."
              className="block w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Courses Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Subject
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Credit Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Teacher
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Class
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCourses.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-900">
                    No courses found
                  </td>
                </tr>
              ) : (
                filteredCourses.map((course) => (
                  <tr key={course._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {course.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {course.subject}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {course.crh}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getDepartmentName(course.department)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getTeacherName(course.teacher)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getClassName(course.class)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditCourse(course)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                        title="Edit course"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDeleteCourse(course._id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete course"
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

      {/* Add/Edit Course Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                {editingCourse ? 'Edit Course' : 'Add New Course'}
              </h2>
              <button 
                onClick={handleModalClose}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <FaTimes />
              </button>
            </div>
            {modalError && (
              <div className="mx-6 mt-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded" role="alert">
                <p className="font-bold">Error</p>
                <p>{modalError}</p>
              </div>
            )}
            
            <form onSubmit={handleAddCourse} className="px-6 py-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Subject *
                  </label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter subject name"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Course Code *
                  </label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter course code"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Credit Hours (CRH) *
                  </label>
                  <input
                    type="number"
                    name="crh"
                    min="1"
                    max="6"
                    value={formData.crh}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Teacher *
                  </label>
                  <select
                    name="teacher"
                    value={formData.teacher}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Teacher</option>
                    {teachers.map(teacher => (
                      <option key={teacher._id} value={teacher._id}>
                        {teacher.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Display selected class information instead of dropdowns */}
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Selected Class
                  </label>
                  <div className="text-sm text-gray-900 dark:text-white">
                    {selectedClass 
                      ? (() => {
                          const selectedClassObj = classes.find(c => c._id === selectedClass);
                          return selectedClassObj 
                            ? `${selectedClassObj.year || ''}${selectedClassObj.year ? ' Year' : ''}, ${selectedClassObj.semester === 'first' ? 'First' : 'Second'} Semester - ${selectedClassObj.department?.name || 'Department'}`
                            : 'Not selected';
                        })()
                      : 'Not selected'}
                  </div>
                  <input
                    type="hidden"
                    name="class"
                    value={selectedClass}
                  />
                  <input
                    type="hidden"
                    name="department"
                    value={selectedDepartmentId}
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
                >
                  {editingCourse ? 'Update Course' : 'Add Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoursesPage;