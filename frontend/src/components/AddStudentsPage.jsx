import React, { useState, useEffect, useRef } from 'react';
import { FaPlus, FaEdit, FaTrash, FaCheck, FaTimes, FaSearch } from 'react-icons/fa';

const AddStudentsPage = () => {
  const [addStudents, setAddStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingAddStudent, setEditingAddStudent] = useState(null);
  const [formData, setFormData] = useState({
    originalClassId: '',
    studentId: '',
    classId: '',
    courseId: '',
    assignedClassId: '',
    retakeSemester: {
      year: new Date().getFullYear(),
      semester: 'first'
    }
  });
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [classes, setClasses] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // New states for searchable dropdown
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  
  // Ref for student dropdown
  const studentDropdownRef = useRef(null);

  // Fetch add students data
  useEffect(() => {
    fetchAddStudents();
    fetchStudents();
    fetchCourses();
    fetchClasses();
  }, []);

  const fetchAddStudents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/add-students', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setAddStudents(data.data);
      } else {
        setError('Failed to fetch add students data');
      }
    } catch (err) {
      setError('Error fetching add students data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    // This function is no longer used as we fetch students by class
    // Keeping it for backward compatibility
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/students', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setStudents(data.data);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
    }
  };

  const fetchCourses = async () => {
    // This function is no longer used as we fetch courses by class
    // Keeping it for backward compatibility
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/courses', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setCourses(data.data);
      }
    } catch (err) {
      console.error('Error fetching courses:', err);
    }
  };

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/classes', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setClasses(data.data);
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  // Fetch students by class ID
  const fetchStudentsByClass = async (classId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/add-students/students-by-class/${classId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setFilteredStudents(data.data);
      } else {
        setFilteredStudents([]);
        setError(data.message || 'Failed to fetch students');
      }
    } catch (err) {
      console.error('Error fetching students by class:', err);
      setFilteredStudents([]);
    }
  };

  // Fetch courses by class ID
  const fetchCoursesByClass = async (classId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/add-students/courses-by-class/${classId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setFilteredCourses(data.data);
      } else {
        setFilteredCourses([]);
        setError(data.message || 'Failed to fetch courses');
      }
    } catch (err) {
      console.error('Error fetching courses by class:', err);
      setFilteredCourses([]);
    }
  };

  // Filter students and courses when form data changes
  useEffect(() => {
    // Fetch students when original class is selected
    if (formData.originalClassId) {
      fetchStudentsByClass(formData.originalClassId);
    } else {
      setFilteredStudents([]);
      setFormData(prev => ({
        ...prev,
        studentId: ''
      }));
      setStudentSearchTerm('');
      setShowStudentDropdown(false);
    }

    // Fetch courses when class is selected
    if (formData.classId) {
      fetchCoursesByClass(formData.classId);
    } else {
      setFilteredCourses([]);
      setFormData(prev => ({
        ...prev,
        courseId: ''
      }));
    }

    // Reset dependent fields when parent fields change
    if (!formData.originalClassId) {
      setFormData(prev => ({
        ...prev,
        studentId: '',
        classId: '',
        courseId: ''
      }));
      setStudentSearchTerm('');
      setShowStudentDropdown(false);
    } else if (!formData.classId) {
      setFormData(prev => ({
        ...prev,
        courseId: ''
      }));
    }
  }, [formData.originalClassId, formData.classId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      // Handle nested properties like retakeSemester.year
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
      
      // Reset dependent fields when parent fields change
      if (name === 'originalClassId') {
        setFormData(prev => ({
          ...prev,
          studentId: '',
          classId: '',
          courseId: ''
        }));
        setStudentSearchTerm('');
      } else if (name === 'classId') {
        setFormData(prev => ({
          ...prev,
          courseId: ''
        }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const url = editingAddStudent 
        ? `http://localhost:5000/api/add-students/${editingAddStudent._id}`
        : 'http://localhost:5000/api/add-students';
      
      const method = editingAddStudent ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editingAddStudent ? {
          assignedClassId: formData.assignedClassId,
          status: formData.status
        } : {
          studentId: formData.studentId,
          courseId: formData.courseId,
          retakeSemester: formData.retakeSemester
        })
      });

      const data = await response.json();

      if (data.status === 'success') {
        setShowModal(false);
        setEditingAddStudent(null);
        setFormData({
          originalClassId: '',
          studentId: '',
          classId: '',
          courseId: '',
          assignedClassId: '',
          retakeSemester: {
            year: new Date().getFullYear(),
            semester: 'first'
          }
        });
        fetchAddStudents();
      } else {
        setError(data.message || `Failed to ${editingAddStudent ? 'update' : 'create'} add student record`);
      }
    } catch (err) {
      setError(`Error ${editingAddStudent ? 'updating' : 'creating'} add student record: ` + err.message);
    }
  };

  const handleEdit = (addStudent) => {
    setEditingAddStudent(addStudent);
    setFormData({
      assignedClassId: addStudent.assignedClass._id,
      status: addStudent.status
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this add student record?')) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:5000/api/add-students/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
          fetchAddStudents();
        } else {
          setError('Failed to delete add student record');
        }
      } catch (err) {
        setError('Error deleting add student record: ' + err.message);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      originalClassId: '',
      studentId: '',
      classId: '',
      courseId: '',
      assignedClassId: '',
      retakeSemester: {
        year: new Date().getFullYear(),
        semester: 'first'
      }
    });
    setFilteredStudents([]);
    setFilteredCourses([]);
    setStudentSearchTerm('');
    setShowStudentDropdown(false);
  };

  const openModal = () => {
    setEditingAddStudent(null);
    resetForm();
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingAddStudent(null);
    resetForm();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (studentDropdownRef.current && !studentDropdownRef.current.contains(event.target)) {
        setShowStudentDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter add students based on search term
  const filteredAddStudents = addStudents.filter(addStudent => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
      (addStudent.student && addStudent.student.name && addStudent.student.name.toLowerCase().includes(searchTermLower)) ||
      (addStudent.student && addStudent.student.userId && addStudent.student.userId.toLowerCase().includes(searchTermLower)) ||
      (addStudent.course && addStudent.course.subject && addStudent.course.subject.toLowerCase().includes(searchTermLower)) ||
      (addStudent.course && addStudent.course.code && addStudent.course.code.toLowerCase().includes(searchTermLower))
    );
  });

  // Filter students based on search term
  const getFilteredStudents = () => {
    if (!studentSearchTerm) return filteredStudents;
    return filteredStudents.filter(student => 
      (student.name && student.name.toLowerCase().includes(studentSearchTerm.toLowerCase())) ||
      (student.userId && student.userId.toLowerCase().includes(studentSearchTerm.toLowerCase()))
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center">
            <FaPlus className="mr-2 text-blue-600" /> Add Students
          </h1>
          <p className="text-gray-600 mt-1">Manage students who need to retake courses</p>
        </div>
        <button 
          className="mt-4 md:mt-0 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          onClick={openModal}
        >
          <FaPlus className="mr-2" /> Add Student
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded mb-6">
          <p>{error}</p>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FaSearch className="text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Original Class</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Class</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAddStudents.map((addStudent) => (
                <tr key={addStudent._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {addStudent.student && addStudent.student.name ? addStudent.student.name : 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {addStudent.student && addStudent.student.userId ? addStudent.student.userId : 'N/A'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {addStudent.course && addStudent.course.subject ? addStudent.course.subject : 'N/A'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {addStudent.course && addStudent.course.code ? addStudent.course.code : 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {addStudent.originalClass ? 
                      `Year ${addStudent.originalClass.year} - ${addStudent.originalClass.semester} Semester` : 
                      'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {addStudent.assignedClass ? 
                      `Year ${addStudent.assignedClass.year} - ${addStudent.assignedClass.semester} Semester` : 
                      'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      addStudent.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      addStudent.status === 'enrolled' ? 'bg-green-100 text-green-800' :
                      addStudent.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {addStudent.status || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      className="text-blue-600 hover:text-blue-900 mr-3"
                      onClick={() => handleEdit(addStudent)}
                      title="Edit"
                    >
                      <FaEdit />
                    </button>
                    <button 
                      className="text-red-600 hover:text-red-900"
                      onClick={() => handleDelete(addStudent._id)}
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
        
        {filteredAddStudents.length === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <FaPlus className="mx-auto text-gray-400 text-4xl mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No add student records found</h3>
            <p className="text-gray-500 mb-4">Get started by adding a new student who needs to retake a course.</p>
            <button 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={openModal}
            >
              <FaPlus className="mr-2" /> Add Student
            </button>
          </div>
        )}
      </div>

      {/* Modal for adding/editing add students */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">
                {editingAddStudent ? 'Edit Add Student Record' : 'Add Student to Retake Course'}
              </h2>
              <button 
                className="text-gray-500 hover:text-gray-700"
                onClick={closeModal}
              >
                <FaTimes />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              {!editingAddStudent ? (
                <>
                  {/* Original Class Selection */}
                  <div className="mb-4">
                    <label htmlFor="originalClassId" className="block text-sm font-medium text-gray-700 mb-1">Original Class *</label>
                    <select
                      id="originalClassId"
                      name="originalClassId"
                      value={formData.originalClassId}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select original class</option>
                      {classes.map(cls => (
                        <option key={cls._id} value={cls._id}>
                          Year {cls.year} - {cls.semester} Semester
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Select the class the student originally belongs to
                    </p>
                  </div>
                  
                  {/* Student Selection (filtered by original class) */}
                  <div className="mb-4 relative">
                    <label htmlFor="studentId" className="block text-sm font-medium text-gray-700 mb-1">Student *</label>
                    <input
                      id="studentId"
                      name="studentId"
                      type="text"
                      placeholder="Search students..."
                      value={studentSearchTerm}
                      onChange={(e) => {
                        setStudentSearchTerm(e.target.value);
                        setShowStudentDropdown(true);
                      }}
                      required
                      disabled={!formData.originalClassId}
                      className={`w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        !formData.originalClassId ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                    />
                    {showStudentDropdown && filteredStudents.length > 0 && (
                      <div className="absolute mt-1 max-h-40 overflow-y-auto w-full bg-white border border-gray-300 rounded-md shadow-lg z-10" ref={studentDropdownRef}>
                        {getFilteredStudents().map(student => (
                          <div
                            key={student._id}
                            className="px-3 py-2 cursor-pointer hover:bg-gray-100"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                studentId: student._id
                              }));
                              setStudentSearchTerm(`${student.name} (${student.userId})`);
                              setShowStudentDropdown(false);
                            }}
                          >
                            {student.name} ({student.userId})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Class Selection for Course */}
                  <div className="mb-4">
                    <label htmlFor="classId" className="block text-sm font-medium text-gray-700 mb-1">Class for Course *</label>
                    <select
                      id="classId"
                      name="classId"
                      value={formData.classId}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select class</option>
                      {classes.map(cls => (
                        <option key={cls._id} value={cls._id}>
                          Year {cls.year} - {cls.semester} Semester
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Select the class to filter available courses
                    </p>
                  </div>
                  
                  {/* Course Selection (filtered by class) */}
                  <div className="mb-4">
                    <label htmlFor="courseId" className="block text-sm font-medium text-gray-700 mb-1">Course *</label>
                    <select
                      id="courseId"
                      name="courseId"
                      value={formData.courseId}
                      onChange={handleInputChange}
                      required
                      disabled={!formData.classId}
                      className={`w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        !formData.classId ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                    >
                      <option value="">{formData.classId ? 'Select a course' : 'Select class first'}</option>
                      {filteredCourses.map(course => (
                        <option key={course._id} value={course._id}>
                          {course.subject} ({course.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : null}
              
              {editingAddStudent && (
                <div className="mb-4">
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="enrolled">Enrolled</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              )}
              
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button 
                  type="button" 
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors duration-200"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-200 flex items-center"
                >
                  {editingAddStudent ? 'Update Record' : 'Add Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddStudentsPage;