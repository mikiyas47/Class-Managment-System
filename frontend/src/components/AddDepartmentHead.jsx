import { useState, useEffect } from 'react';
import { FaUserShield, FaPlus, FaEdit, FaTrash, FaTimes, FaEye, FaEyeSlash } from 'react-icons/fa';

const AddDepartmentHead = ({ setActiveNav, user }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNo: '',
    password: '',
    department: ''
  });
  const [departmentHeads, setDepartmentHeads] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modalError, setModalError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingDepartmentHead, setEditingDepartmentHead] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

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
    setShowPassword(false);
    setShowNewPassword(false);
  };

  // Filter departments to only show those without a head (except for the current editing department head)
  const getAvailableDepartments = () => {
    if (editingDepartmentHead) {
      // When editing, include the current department of the head being edited
      // and exclude departments assigned to other department heads
      const currentDepartmentId = editingDepartmentHead.department._id || editingDepartmentHead.department;
      return departments.filter(dept => 
        dept._id === currentDepartmentId || 
        !departmentHeads.some(head => 
          (head.department._id === dept._id || head.department === dept._id) && 
          head._id !== editingDepartmentHead._id
        )
      );
    }
    
    // When creating, only show departments without a head
    return departments.filter(dept => 
      !departmentHeads.some(head => 
        head.department._id === dept._id || head.department === dept._id
      )
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-800 flex items-center">
          <FaUserShield className="mr-2" /> Department Heads
        </h1>
        <button 
          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 text-sm rounded-md flex items-center justify-center transition-colors mt-2 md:mt-0"
          onClick={openModal}
        >
          <FaPlus className="mr-1.5" size={14} /> Add Department Head
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded" role="alert">
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
      
      {success && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4 rounded" role="alert">
          <p className="font-bold">Success</p>
          <p>Department head {editingDepartmentHead ? 'updated' : 'created'} successfully!</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Email
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Phone Number
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Department
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {departmentHeads.length > 0 ? (
                departmentHeads.map((head) => (
                  <tr key={head._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {head.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {head.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {head.phoneNo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {head.department?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        className="text-blue-600 hover:text-blue-900 mr-3"
                        onClick={() => handleEdit(head)}
                        title="Edit"
                      >
                        <FaEdit />
                      </button>
                      <button 
                        className="text-red-600 hover:text-red-900"
                        onClick={() => handleDelete(head._id)}
                        title="Delete"
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-900">
                    No department heads found. Click "Add Department Head" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for adding/editing department heads */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">
                {editingDepartmentHead ? 'Edit Department Head' : 'Add New Department Head'}
              </h2>
              <button 
                className="text-gray-500 hover:text-gray-700"
                onClick={closeModal}
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
            
            <form onSubmit={handleSubmit} className="px-6 py-4">
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter full name"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter email address"
                  />
                </div>

                <div>
                  <label htmlFor="phoneNo" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    id="phoneNo"
                    name="phoneNo"
                    value={formData.phoneNo}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter phone number"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    {editingDepartmentHead ? 'New Password' : 'Password'} {editingDepartmentHead ? '' : '*'}
                  </label>
                  <div className="relative">
                    <input
                      type={editingDepartmentHead ? (showNewPassword ? "text" : "password") : (showPassword ? "text" : "password")}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required={!editingDepartmentHead}
                      minLength="6"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 pr-10"
                      placeholder={editingDepartmentHead ? "Enter new password (leave blank to keep current)" : "Enter password (min 6 characters)"}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      onClick={() => editingDepartmentHead ? setShowNewPassword(!showNewPassword) : setShowPassword(!showPassword)}
                    >
                      {editingDepartmentHead ? (showNewPassword ? <FaEyeSlash /> : <FaEye />) : (showPassword ? <FaEyeSlash /> : <FaEye />)}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
                    Department *
                  </label>
                  <select
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a department</option>
                    {getAvailableDepartments().map((dept) => (
                      <option key={dept._id} value={dept._id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button 
                  type="button" 
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : (editingDepartmentHead ? 'Update Department Head' : 'Create Department Head')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddDepartmentHead;