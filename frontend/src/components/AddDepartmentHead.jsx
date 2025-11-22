import { useState, useEffect } from 'react';
import { FaUserShield, FaPlus, FaEdit, FaTrash, FaTimes, FaEye, FaEyeSlash, FaSearch } from 'react-icons/fa';

const AddDepartmentHead = ({ setActiveNav, user }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNo: '',
    password: '',
    department: ''
  });
  const [departmentHeads, setDepartmentHeads] = useState([]);
  const [filteredDepartmentHeads, setFilteredDepartmentHeads] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modalError, setModalError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingDepartmentHead, setEditingDepartmentHead] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter department heads based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredDepartmentHeads(departmentHeads);
    } else {
      const filtered = departmentHeads.filter(head => 
        head.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        head.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (head.department && head.department.name && head.department.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredDepartmentHeads(filtered);
    }
  }, [searchTerm, departmentHeads]);

  // Fetch department heads and departments when component mounts
  useEffect(() => {
    fetchDepartmentHeads();
    fetchDepartments();
  }, []);

  const fetchDepartmentHeads = async () => {
    try {
      // Import the API base URL
      const { API_BASE_URL } = await import('../api');
      const response = await fetch(`${API_BASE_URL}/api/department-heads`);
      const data = await response.json();
      if (data.status === 'success') {
        setDepartmentHeads(data.data);
        setFilteredDepartmentHeads(data.data);
      } else {
        setError('Failed to fetch department heads');
      }
    } catch (err) {
      setError('Error fetching department heads: ' + err.message);
    }
  };

  const fetchDepartments = async () => {
    try {
      // Import the API base URL
      const { API_BASE_URL } = await import('../api');
      const response = await fetch(`${API_BASE_URL}/api/departments`);
      const data = await response.json();
      if (data.status === 'success') {
        setDepartments(data.data);
      } else {
        setError('Failed to fetch departments');
      }
    } catch (err) {
      setError('Error fetching departments: ' + err.message);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setModalError(null);
    setSuccess(false);

    // Check if department already has a head (for new department heads)
    if (!editingDepartmentHead) {
      const departmentHasHead = departmentHeads.some(head => 
        head.department._id === formData.department || head.department === formData.department
      );
      
      if (departmentHasHead) {
        setModalError('This department already has a department head. Each department can only have one head.');
        setLoading(false);
        return;
      }
    }

    try {
      // Import the API base URL
      const { API_BASE_URL } = await import('../api');
      const url = editingDepartmentHead 
        ? `${API_BASE_URL}/api/department-heads/${editingDepartmentHead._id}`
        : `${API_BASE_URL}/api/department-heads`;
      
      const method = editingDepartmentHead ? 'PUT' : 'POST';
      
      // Get token from localStorage
      const token = localStorage.getItem('token');
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.status === 'success') {
        setSuccess(true);
        setShowModal(false);
        setEditingDepartmentHead(null);
        // Reset form
        setFormData({
          name: '',
          email: '',
          phoneNo: '',
          password: '',
          department: ''
        });
        // Refresh the list
        fetchDepartmentHeads();
      } else {
        // Display validation errors in the modal
        setModalError(data.message || `Failed to ${editingDepartmentHead ? 'update' : 'create'} department head`);
      }
    } catch (err) {
      // Display network errors in the modal
      setModalError(`Error ${editingDepartmentHead ? 'updating' : 'creating'} department head: ` + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (departmentHead) => {
    setEditingDepartmentHead(departmentHead);
    setFormData({
      name: departmentHead.name,
      email: departmentHead.email,
      phoneNo: departmentHead.phoneNo,
      password: '', // Don't prefill password
      department: departmentHead.department._id || departmentHead.department
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this department head?')) {
      try {
        // Import the API base URL
        const { API_BASE_URL } = await import('../api');
        
        // Get token from localStorage
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_BASE_URL}/api/department-heads/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
          fetchDepartmentHeads(); // Refresh the list
        } else {
          setError('Failed to delete department head');
        }
      } catch (err) {
        setError('Error deleting department head: ' + err.message);
      }
    }
  };

  const openModal = () => {
    setEditingDepartmentHead(null);
    setFormData({
      name: '',
      email: '',
      phoneNo: '',
      password: '',
      department: ''
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingDepartmentHead(null);
    setModalError(null);
    setFormData({
      name: '',
      email: '',
      phoneNo: '',
      password: '',
      department: ''
    });
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center">
            <FaUserShield className="mr-2 text-blue-600" /> Department Heads
          </h1>
          <p className="text-gray-600 mt-1">Manage department heads and their assigned departments</p>
        </div>
        <button 
          className="mt-4 md:mt-0 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          onClick={openModal}
        >
          <FaPlus className="mr-2" /> Add Department Head
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FaSearch className="text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Search department heads by name, email, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded mb-6">
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded mb-6">
          <p>Operation completed successfully!</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDepartmentHeads.length > 0 ? (
                filteredDepartmentHeads.map((head) => (
                  <tr key={head._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {head.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {head.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {head.phoneNo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {head.department?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEdit(head)}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(head._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                    {searchTerm ? 'No department heads found matching your search' : 'No department heads found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">
                {editingDepartmentHead ? 'Edit Department Head' : 'Add New Department Head'}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-500"
              >
                <FaTimes />
              </button>
            </div>
            
            <div className="p-6">
              {modalError && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded">
                  <p>{modalError}</p>
                </div>
              )}
              
              {success && (
                <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4 rounded">
                  <p>Department head {editingDepartmentHead ? 'updated' : 'created'} successfully!</p>
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter full name"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter email address"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="phoneNo" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phoneNo"
                    name="phoneNo"
                    value={formData.phoneNo}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter phone number"
                    required
                  />
                </div>
                
                {!editingDepartmentHead && (
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                        placeholder="Enter password"
                        required
                        minLength="6"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <FaEyeSlash className="text-gray-400" /> : <FaEye className="text-gray-400" />}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Password must be at least 6 characters</p>
                  </div>
                )}
                
                {editingDepartmentHead && (
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                      New Password (optional)
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                        placeholder="Enter new password (optional)"
                        minLength="6"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <FaEyeSlash className="text-gray-400" /> : <FaEye className="text-gray-400" />}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Leave blank to keep current password</p>
                  </div>
                )}
                
                <div>
                  <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <select
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select a department</option>
                    {departments.map((dept) => (
                      <option key={dept._id} value={dept._id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <FaTimes className="mr-2 inline" />
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {editingDepartmentHead ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      <>
                        <FaUserShield className="mr-2" />
                        {editingDepartmentHead ? 'Update Head' : 'Add Head'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddDepartmentHead;