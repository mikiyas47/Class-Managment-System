import { useState, useEffect } from 'react';
import { FaPlus, FaUserGraduate, FaEnvelope, FaPhone, FaIdCard, FaUniversity, FaChalkboard, FaUpload, FaSearch, FaEdit, FaTrash, FaTimes } from 'react-icons/fa';
import BulkUpload from './BulkUpload';
import SearchBar from './SearchBar';

const StudentsPage = () => {
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
      let url = 'http://localhost:5000/api/students';
      if (classId) {
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

  // Fetch all classes
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
    const selectedClassObj = classes.find(c => c._id === classId);
    setSelectedClass(classId);
    
    // Set the department ID from the selected class
    if (selectedClassObj && selectedClassObj.department) {
      const deptId = typeof selectedClassObj.department === 'string' 
        ? selectedClassObj.department 
        : selectedClassObj.department._id;
      setSelectedDepartmentId(deptId);
    } else {
      setSelectedDepartmentId('');
    }
    
    fetchStudents(classId);
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

  // Handle delete student
  const handleDeleteStudent = async (studentId) => {
    if (window.confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
      try {
        const response = await fetch(`http://localhost:5000/api/students/${studentId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to delete student');
        }

        // Refresh the students list
        await fetchStudents(selectedClass);
      } catch (err) {
        setError(err.message);
      }
    }
  };

  // Reset form when modal is closed
  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingStudent(null);
    setModalError(null);
    setFormData({
      name: '',
      userId: '',
      email: '',
      password: '',
      phoneNo: '',
      department: '',
      class: ''
    });
  };

  // Handle successful bulk upload
  const handleBulkUploadSuccess = () => {
    // Refresh the students list after successful upload
    fetchStudents(selectedClass);
  };
  
  // Handle search
  const handleSearch = (term) => {
    setSearchTerm(term);
  };

  // Add new student
  const handleAddStudent = async (e) => {
    e.preventDefault();
    
    try {
      setError(null);
      setModalError(null);
      
      // Log the current form data for debugging
      console.log('Form data:', formData);
      
      // Validate required fields
      const requiredFields = editingStudent 
        ? ['name', 'userId', 'email', 'phoneNo']  // Password not required when editing
        : ['name', 'userId', 'email', 'password', 'phoneNo'];  // Password required when adding
      
      const missingFields = requiredFields.filter(field => !formData[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }
      
      // Validate password only when adding a new student or when a new password is provided for editing
      if ((!editingStudent && formData.password.length < 6) || 
          (editingStudent && formData.password && formData.password.length < 6)) {
        throw new Error('Password must be at least 6 characters long');
      }
      
      // Check if class is selected
      if (!selectedClass) {
        throw new Error('Please select a class first');
      }
      
      // Prepare the student data according to the backend model
      const requestBody = {
        name: formData.name,
        userId: formData.userId,
        email: formData.email,
        phoneNo: formData.phoneNo,
        department: selectedDepartmentId, // Use the pre-selected department
        class: selectedClass // Use the pre-selected class
      };
      
      // Only include password if it's provided (for both add and edit)
      if (formData.password) {
        requestBody.password = formData.password;
      }
      
      // Determine URL and method based on whether we're editing or adding
      const url = editingStudent 
        ? `http://localhost:5000/api/students/${editingStudent._id}`
        : 'http://localhost:5000/api/students';
      
      const method = editingStudent ? 'PUT' : 'POST';
      
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
        throw new Error(errorData.message || `Failed to ${editingStudent ? 'update' : 'add'} student`);
      }

      // Refresh the students list
      await fetchStudents(selectedClass);
      handleModalClose();
    } catch (err) {
      setModalError(err.message);
      // Keep the modal open to show the error
      // Don't close the modal on error
    }
  };

  // Handle add student button click
  const handleAddStudentClick = () => {
    if (!selectedClass) {
      setError('Please select a class first');
      return;
    }
    setIsModalOpen(true);
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchStudents(selectedClass);
    fetchDepartments();
    fetchClasses();
  }, []);

  // Filter students for display
  const displayStudents = searchTerm || selectedClass ? filteredStudents : students;

  if (loading && students.length === 0) {
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
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-800 mb-4 md:mb-0">Students Management</h1>
        <div className="flex items-center space-x-2">
          {selectedClass && (
            <BulkUpload 
              onUpload={handleBulkUploadSuccess} 
              entityName="student" 
              endpoint="students"
              token={localStorage.getItem('token')}
              departmentId={selectedDepartmentId}
              classId={selectedClass}
              compact={true}
              disabled={!selectedClass}
            />
          )}
          <button
            onClick={handleAddStudentClick}
            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 text-sm rounded-md flex items-center justify-center transition-colors"
          >
            <FaPlus className="mr-1.5" size={14} /> Add Student
          </button>
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
            Search Students
          </label>
          <SearchBar 
            onSearch={handleSearch}
            placeholder="Search by name, email, or ID..."
            className="w-full"
          />
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  User ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Department
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
              {displayStudents.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-900">
                    {loading ? 'Loading...' : 'No students found'}
                  </td>
                </tr>
              ) : (
                displayStudents.map((student) => (
                <tr key={student._id} className="hover:bg-gray-50">
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
                      {student.class ? `Year ${student.class.year}, Sem ${student.class.semester}` : 'N/A'}
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
