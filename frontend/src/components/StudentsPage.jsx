import { useState, useEffect } from 'react';
import { FaPlus, FaUserGraduate, FaEnvelope, FaPhone, FaIdCard, FaUniversity, FaChalkboard, FaUpload, FaSearch, FaEdit, FaTrash, FaTimes, FaUsers } from 'react-icons/fa';
import BulkUpload from './BulkUpload';
import SearchBar from './SearchBar';

const StudentsPage = ({ user }) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]); // For bulk actions
  const [isUpgrading, setIsUpgrading] = useState(false); // For upgrade loading state
  const [nextClassInfo, setNextClassInfo] = useState(null); // For previewing next class
  const [showPreview, setShowPreview] = useState(false); // For showing preview modal
  
  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    userId: '',
    email: '',
    password: '',
    phoneNo: '',
    department: '',
    class: ''
  });
  const [modalError, setModalError] = useState(null);

  // Filter students based on search term and selected class
  const filterStudents = (students, search, classId) => {
    return students.filter(student => {
      const matchesSearch = !search || 
        student.name.toLowerCase().includes(search.toLowerCase()) ||
        student.email.toLowerCase().includes(search.toLowerCase()) ||
        student.userId.toLowerCase().includes(search.toLowerCase());
      
      const matchesClass = !classId || student.class?._id === classId;
      
      return matchesSearch && matchesClass;
    });
  };

  // Update filtered students when search term, selected class, or students change
  useEffect(() => {
    setFilteredStudents(filterStudents(students, searchTerm, selectedClass));
  }, [students, searchTerm, selectedClass]);

  // Fetch students from API
  const fetchStudents = async (classId = '') => {
    try {
      setLoading(true);
      // Import the API base URL
      const { API_BASE_URL } = await import('../api');
      
      // For department heads, only fetch students from their department
      let url = `${API_BASE_URL}/api/students`;
      
      // If user is a department head, filter by their department
      if (user && user.department && user.department._id) {
        url += `?department=${user.department._id}`;
      } else if (classId) {
        // If classId is provided, filter by class
        url += `?class=${classId}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch students');
      }
      
      const data = await response.json();
      // Ensure class and department are properly populated
      const studentsWithPopulatedFields = (data.data || []).map(student => ({
        ...student,
        class: student.class || {},
        department: student.department || {}
      }));
      
      setStudents(studentsWithPopulatedFields);
      setFilteredStudents(studentsWithPopulatedFields);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      // Import the API base URL
      const { API_BASE_URL } = await import('../api');
      
      // For department heads, only fetch their own department
      let url = `${API_BASE_URL}/api/departments`;
      if (user && user.department && user.department._id) {
        url += `/${user.department._id}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // If fetching a single department, wrap it in an array
        if (user && user.department && user.department._id) {
          setDepartments([data.data || data]);
        } else {
          setDepartments(data.data || []);
        }
      }
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  };

  // Fetch all classes
  const fetchClasses = async (departmentId = '') => {
    try {
      setLoading(true);
      // Import the API base URL
      const { API_BASE_URL } = await import('../api');
      
      // For department heads, only fetch classes from their department
      let url = `${API_BASE_URL}/api/classes`;
      const deptId = departmentId || (user && user.department && user.department._id);
      
      if (deptId) {
        url += `?department=${deptId}`;
      }
      
      const response = await fetch(url, {
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
    
    // Update filtered students when class changes
    setFilteredStudents(filterStudents(students, searchTerm, classId));
    
    // Clear student selection when class changes
    setSelectedStudents([]);
  };

  // Get department ID from selected class
  const getDepartmentIdFromClass = (classId) => {
    if (!classId) return '';
    const selectedClassObj = classes.find(cls => cls._id === classId);
    // Return the department ID, not the entire department object
    return selectedClassObj && selectedClassObj.department ? selectedClassObj.department._id || selectedClassObj.department : '';
  };

  // Handle department change
  const handleDepartmentChange = (e) => {
    const deptId = e.target.value;
    setFormData(prev => ({
      ...prev,
      department: deptId,
      class: '' // Reset class when department changes
    }));
    
    // Only fetch classes if a department is selected
    if (deptId) {
      fetchClasses(deptId);
    } else {
      setClasses([]);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle edit student
  const handleEditStudent = (student) => {
    setEditingStudent(student);
    setFormData({
      name: student.name,
      userId: student.userId,
      email: student.email,
      password: '', // Password is not shown for security
      phoneNo: student.phoneNo || '',
      department: student.department?._id || '',
      class: student.class?._id || ''
    });
    setIsModalOpen(true);
  };

  // Initialize component
  useEffect(() => {
    // Fetch students, departments, and classes
    fetchStudents();
    fetchDepartments();
    fetchClasses();
  }, [user]); // Add user to dependency array to re-fetch when user changes

  // Filter students for display
  const displayStudents = searchTerm || selectedClass ? filteredStudents : students;

  if (loading && students.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Handle student selection for bulk actions
  const handleStudentSelect = (studentId) => {
    setSelectedStudents(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  // Handle select all students in current view (filtered students)
  const handleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length && filteredStudents.length > 0) {
      // If all filtered students are selected, deselect all
      const currentFilteredStudentIds = filteredStudents.map(student => student._id);
      setSelectedStudents(prev => prev.filter(id => !currentFilteredStudentIds.includes(id)));
    } else {
      // Select all filtered students
      const currentFilteredStudentIds = filteredStudents.map(student => student._id);
      setSelectedStudents(prev => {
        // Keep previously selected students that are not in current view
        const otherSelected = prev.filter(id => !currentFilteredStudentIds.includes(id));
        // Add all currently filtered students
        return [...otherSelected, ...currentFilteredStudentIds];
      });
    }
  };

  // Select all students in the currently selected class
  const handleSelectAllInClass = async () => {
    if (!selectedClass) {
      setError('Please select a class first');
      return;
    }

    try {
      setLoading(true);
      // Import the API base URL
      const { API_BASE_URL } = await import('../api');
      // Fetch all students in the selected class
      const response = await fetch(`${API_BASE_URL}/api/students/class/${selectedClass}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch students in class');
      }
      
      const data = await response.json();
      const classStudents = data.data || [];
      
      // Select all students in this class
      setSelectedStudents(classStudents.map(student => student._id));
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Get next class information for a student
  const getNextClassInfo = async (studentId) => {
    try {
      // Import the API base URL
      const { API_BASE_URL } = await import('../api');
      const response = await fetch(`${API_BASE_URL}/api/students/next-class`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ studentId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get next class information');
      }

      return data.data;
    } catch (err) {
      throw new Error(err.message);
    }
  };

  // Preview next class for selected students
  const handlePreviewNextClass = async () => {
    if (selectedStudents.length === 0) {
      setError('Please select at least one student to preview');
      return;
    }

    if (selectedStudents.length > 1) {
      setError('Please select only one student to preview');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const info = await getNextClassInfo(selectedStudents[0]);
      setNextClassInfo(info);
      setShowPreview(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Upgrade selected students
  const handleUpgradeStudents = async () => {
    if (selectedStudents.length === 0) {
      setError('Please select at least one student to upgrade');
      return;
    }

    // Show preview before upgrading if only one student is selected
    if (selectedStudents.length === 1) {
      try {
        const info = await getNextClassInfo(selectedStudents[0]);
        setNextClassInfo(info);
        setShowPreview(true);
        return;
      } catch (err) {
        setError(err.message);
        return;
      }
    }

    // For multiple students, confirm directly
    if (!window.confirm(`Are you sure you want to upgrade ${selectedStudents.length} student(s) to the next semester?`)) {
      return;
    }

    try {
      setIsUpgrading(true);
      setError(null);
      
      // Import the API base URL
      const { API_BASE_URL } = await import('../api');
      const response = await fetch(`${API_BASE_URL}/api/students/upgrade-class`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ studentIds: selectedStudents })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to upgrade students');
      }

      // Refresh the student list
      await fetchStudents(selectedClass);
      
      // Clear selection
      setSelectedStudents([]);
      
      // Show success message
      alert(`${data.data.updatedStudents.length} students upgraded successfully`);
      
      // Show any errors
      if (data.data.errors && data.data.errors.length > 0) {
        setError(`Some students could not be upgraded: ${data.data.errors.join(', ')}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUpgrading(false);
    }
  };

  // Confirm upgrade after preview
  const confirmUpgrade = async () => {
    try {
      setIsUpgrading(true);
      setShowPreview(false);
      setError(null);
      
      // Import the API base URL
      const { API_BASE_URL } = await import('../api');
      const response = await fetch(`${API_BASE_URL}/api/students/upgrade-class`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ studentIds: selectedStudents })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to upgrade students');
      }

      // Refresh the student list
      await fetchStudents(selectedClass);
      
      // Clear selection
      setSelectedStudents([]);
      
      // Show success message
      alert(`${data.data.updatedStudents.length} students upgraded successfully`);
      
      // Show any errors
      if (data.data.errors && data.data.errors.length > 0) {
        setError(`Some students could not be upgraded: ${data.data.errors.join(', ')}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col space-y-4 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
          <h1 className="text-2xl font-bold text-gray-800">Students Management</h1>
          <div className="w-full md:w-1/3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search students..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Class Filter */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="w-full sm:w-64">
            <label htmlFor="class-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Class
            </label>
            <select
              id="class-filter"
              value={selectedClass}
              onChange={handleClassChange}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Classes</option>
              {classes.map((cls) => (
                <option key={cls._id} value={cls._id}>
                  Year {cls.year}, {cls.semester === 'first' ? 'First' : 'Second'} Semester
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <BulkUpload 
              onUpload={fetchStudents} 
              entityName="student" 
              endpoint="students"
              token={localStorage.getItem('token')}
              departmentId={getDepartmentIdFromClass(selectedClass)}
              classId={selectedClass}
              compact={true}
            />
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 text-sm rounded-md flex items-center justify-center transition-colors"
            >
              <FaPlus className="mr-1.5" size={14} /> Add Student
            </button>
          </div>
        </div>
        
        {/* Action buttons - only show when students are selected */}
        {selectedStudents.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-gray-50 p-4 rounded-md">
            <div className="flex items-center">
              <span className="text-sm font-medium text-gray-700">
                {selectedStudents.length} student{selectedStudents.length > 1 ? 's' : ''} selected
              </span>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handlePreviewNextClass}
                className="flex items-center px-3 py-1.5 bg-blue-500 hover:bg-blue-600 rounded-md text-white text-sm font-medium"
              >
                <FaUniversity className="mr-2" />
                Preview Next Class
              </button>
              <button
                onClick={handleUpgradeStudents}
                disabled={isUpgrading}
                className={`flex items-center px-3 py-1.5 rounded-md text-white text-sm font-medium ${
                  isUpgrading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-green-500 hover:bg-green-600'
                }`}
              >
                {isUpgrading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Upgrading...
                  </>
                ) : (
                  <>
                    <FaUniversity className="mr-2" />
                    Upgrade Selected
                  </>
                )}
              </button>
              {selectedClass && (
                <button
                  onClick={handleSelectAllInClass}
                  className="flex items-center px-3 py-1.5 bg-purple-500 hover:bg-purple-600 rounded-md text-white text-sm font-medium"
                >
                  <FaUsers className="mr-2" />
                  Select All in Class
                </button>
              )}
              <button
                onClick={() => setSelectedStudents([])}
                className="flex items-center px-3 py-1.5 text-gray-600 hover:text-gray-800 text-sm font-medium"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            Showing {filteredStudents.length} of {students.length} students
            {selectedClass && (
              <span className="ml-2 text-blue-600">
                (filtered by class)
              </span>
            )}
            {searchTerm && (
              <span className="ml-2 text-blue-600">
                (filtered by: "{searchTerm}")
              </span>
            )}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={filteredStudents.length > 0 && filteredStudents.every(student => selectedStudents.includes(student._id))}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Email</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Phone</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">User ID</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Department</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Class</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-900 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-4 text-center text-gray-900">
                    {loading ? 'Loading...' : 'No students found'}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                <tr key={student._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(student._id)}
                      onChange={() => handleStudentSelect(student._id)}
                      className="h-4 w-4 text-blue-600 rounded"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <FaUserGraduate className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{student.name}</div>
                        <div className="text-xs text-gray-500">{student.userId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <FaEnvelope className="mr-2 text-gray-400" />
                      {student.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <FaPhone className="mr-2 text-gray-400" />
                      {student.phoneNo || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <FaIdCard className="mr-2 text-gray-400" />
                      {student.userId}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <FaUniversity className="mr-2 text-gray-400" />
                      {student.department?.name || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <FaChalkboard className="mr-2 text-gray-400" />
                      {student.class ? `Year ${student.class.year}, ${student.class.semester === 'first' ? 'First' : 'Second'} Semester` : 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => handleEditStudent(student)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                      title="Edit student"
                    >
                      <FaEdit />
                    </button>
                    <button 
                      onClick={() => handleDeleteStudent(student._id)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete student"
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

      {/* Preview Modal */}
      {showPreview && nextClassInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Class Upgrade Preview</h2>
            </div>
            
            <div className="p-6">
              {!nextClassInfo.canUpgrade ? (
                <div className="text-center py-4">
                  <div className="text-red-500 font-medium mb-2">Cannot Upgrade</div>
                  <p className="text-gray-600">{nextClassInfo.reason}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Current Class</h3>
                    <p className="text-gray-900">
                      Year {nextClassInfo.currentClass.year}, {nextClassInfo.currentClass.semester === 'first' ? 'First' : 'Second'} Semester
                    </p>
                  </div>
                  
                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="text-sm font-medium text-gray-500">Next Class</h3>
                    <p className="text-gray-900">
                      Year {nextClassInfo.nextClass.year}, {nextClassInfo.nextClass.semester === 'first' ? 'First' : 'Second'} Semester
                    </p>
                  </div>
                  
                  <div className="bg-blue-50 p-3 rounded-md">
                    <p className="text-sm text-blue-800">
                      {selectedStudents.length > 1 
                        ? `${selectedStudents.length} students will be upgraded` 
                        : 'Student will be upgraded'} from Year {nextClassInfo.currentClass.year}, {nextClassInfo.currentClass.semester === 'first' ? 'First' : 'Second'} Semester 
                      to Year {nextClassInfo.nextClass.year}, {nextClassInfo.nextClass.semester === 'first' ? 'First' : 'Second'} Semester
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3 rounded-b-lg">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              
              {nextClassInfo.canUpgrade && (
                <button
                  onClick={confirmUpgrade}
                  disabled={isUpgrading}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
                    isUpgrading 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {isUpgrading ? 'Upgrading...' : 'Confirm Upgrade'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                {editingStudent ? 'Edit Student' : 'Add New Student'}
              </h2>
              <button 
                onClick={handleModalClose}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <FaTimes />
              </button>
            </div>
            
            <form onSubmit={handleAddStudent} className="px-6 py-4">
              {/* Error message in modal */}
              {modalError && (
                <div className="mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded" role="alert">
                  <p className="font-bold">Error</p>
                  <p>{modalError}</p>
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter student name"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    User ID *
                  </label>
                  <input
                    type="text"
                    name="userId"
                    value={formData.userId}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter user ID"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter email address"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phoneNo"
                    value={formData.phoneNo}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter phone number"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Password {!editingStudent && '*'}
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={editingStudent ? "Leave blank to keep current password" : "Enter password"}
                    required={!editingStudent}
                  />
                  {editingStudent && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Leave blank to keep current password
                    </p>
                  )}
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
                  {editingStudent ? 'Update Student' : 'Add Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentsPage;
