import { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaUserGraduate, FaEnvelope, FaPhone, FaIdCard, FaUpload } from 'react-icons/fa';
import BulkUpload from './BulkUpload';

const TeachersPage = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalError, setModalError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredTeachers, setFilteredTeachers] = useState([]);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    userId: '',
    password: ''
  });

  // Fetch teachers from API
  const filterTeachers = (teachers, term) => {
    if (!term) return teachers;
    const lowerTerm = term.toLowerCase();
    return teachers.filter(teacher => 
      teacher.name.toLowerCase().includes(lowerTerm) ||
      teacher.email.toLowerCase().includes(lowerTerm) ||
      teacher.userId.toLowerCase().includes(lowerTerm) ||
      teacher.phoneNumber?.toLowerCase().includes(lowerTerm)
    );
  };

  const fetchTeachers = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/teachers', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch teachers');
      }
      
      const data = await response.json();
      const teachersList = data.data || [];
      setTeachers(teachersList);
      setFilteredTeachers(filterTeachers(teachersList, searchTerm));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Update filtered teachers when search term changes
  useEffect(() => {
    setFilteredTeachers(filterTeachers(teachers, searchTerm));
  }, [searchTerm, teachers]);

  // Add new teacher
  const handleAddTeacher = async (e) => {
    e.preventDefault();
    try {
      // Clear any previous modal errors
      setModalError(null);
      
      // Ensure required fields are present
      if (!formData.name || !formData.email || !formData.phoneNumber || !formData.userId || (!editingTeacher && !formData.password)) {
        throw new Error('All fields are required');
      }
      
      if (!editingTeacher && formData.password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      const url = editingTeacher 
        ? `http://localhost:5000/api/teachers/${editingTeacher._id}`
        : 'http://localhost:5000/api/teachers';

      const method = editingTeacher ? 'PUT' : 'POST';
      
      const requestBody = { ...formData };
      // Don't send password if it's not being updated
      if (editingTeacher && !formData.password) {
        delete requestBody.password;
      }

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
        throw new Error(errorData.message || `Failed to ${editingTeacher ? 'update' : 'add'} teacher`);
      }

      // Refresh the teachers list
      await fetchTeachers();
      setIsModalOpen(false);
      setEditingTeacher(null);
      setFormData({
        name: '',
        email: '',
        phoneNumber: '',
        userId: '',
        password: ''
      });
    } catch (err) {
      setModalError(err.message);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditTeacher = (teacher) => {
    setEditingTeacher(teacher);
    setFormData({
      name: teacher.name,
      email: teacher.email,
      phoneNumber: teacher.phoneNumber || '',
      userId: teacher.userId,
      password: '' // Don't pre-fill password for security
    });
    setIsModalOpen(true);
  };

  const handleDeleteTeacher = async (teacherId, teacherName) => {
    if (!window.confirm(`Are you sure you want to delete teacher ${teacherName}? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/teachers/${teacherId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete teacher');
      }

      // Refresh the teachers list
      await fetchTeachers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingTeacher(null);
    setModalError(null);
    setFormData({
      name: '',
      email: '',
      phoneNumber: '',
      userId: '',
      password: ''
    });
  };

  // Handle successful bulk upload
  const handleBulkUploadSuccess = () => {
    // Refresh the teachers list after successful upload
    fetchTeachers();
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  if (loading) return <div className="flex justify-center items-center h-64">Loading...</div>;
  if (error) return <div className="text-red-500 text-center p-4">Error: {error}</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col space-y-4 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-800">Teachers Management</h1>
          <div className="w-full md:w-1/3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search teachers..."
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
        </div>
        <div className="flex items-center space-x-2">
          <BulkUpload 
            onUpload={handleBulkUploadSuccess} 
            entityName="teacher" 
            endpoint="teachers"
            token={localStorage.getItem('token')}
            compact={true}
          />
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 text-sm rounded-md flex items-center justify-center transition-colors"
          >
            <FaPlus className="mr-1.5" size={14} /> Add Teacher
          </button>
        </div>
      </div>

      {/* Teachers Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Showing {filteredTeachers.length} of {teachers.length} teachers
            {searchTerm && (
              <span className="ml-2 text-blue-600 dark:text-blue-400">
                (filtered by: "{searchTerm}")
              </span>
            )}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Phone</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">User ID</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredTeachers.map((teacher) => (
                <tr key={teacher._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <FaUserGraduate className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{teacher.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    <div className="flex items-center">
                      <FaEnvelope className="mr-2 text-gray-400" />
                      {teacher.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    <div className="flex items-center">
                      <FaPhone className="mr-2 text-gray-400" />
                      {teacher.phoneNumber || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    <div className="flex items-center">
                      <FaIdCard className="mr-2 text-gray-400" />
                      {teacher.userId}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => handleEditTeacher(teacher)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
                      title="Edit teacher"
                    >
                      <FaEdit />
                    </button>
                    <button 
                      onClick={() => handleDeleteTeacher(teacher._id, teacher.name)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      title="Delete teacher"
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

      {/* Add Teacher Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                {editingTeacher ? 'Edit Teacher' : 'Add New Teacher'}
              </h2>
            </div>
            {modalError && (
              <div className="mx-6 mt-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded" role="alert">
                <p className="font-bold">Error</p>
                <p>{modalError}</p>
              </div>
            )}
            <form onSubmit={handleAddTeacher}>
              <div className="p-6 space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      id="phoneNumber"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="userId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      User ID *
                    </label>
                    <input
                      type="text"
                      id="userId"
                      name="userId"
                      value={formData.userId}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Password *
                    </label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      required={!editingTeacher}
                      minLength={editingTeacher ? '0' : '6'}
                      placeholder={editingTeacher ? 'Leave empty to keep current password' : ''}
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {editingTeacher ? 'Leave empty to keep current password' : 'Minimum 6 characters'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 flex justify-end space-x-3 rounded-b-lg">
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {editingTeacher ? 'Update Teacher' : 'Add Teacher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeachersPage;
