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
      const response = await fetch('http://localhost:5000/api/department-heads');
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
      const response = await fetch('http://localhost:5000/api/departments');
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
    setSuccess(false);

    // Check if department already has a head (for new department heads)
    if (!editingDepartmentHead) {
      const departmentHasHead = departmentHeads.some(head => 
        head.department._id === formData.department || head.department === formData.department
      );
      
      if (departmentHasHead) {
        setError('This department already has a department head. Each department can only have one head.');
        setLoading(false);
        return;
      }
    }

    try {
      const url = editingDepartmentHead 
        ? `http://localhost:5000/api/department-heads/${editingDepartmentHead._id}`
        : 'http://localhost:5000/api/department-heads';
      
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
        setError(data.message || `Failed to ${editingDepartmentHead ? 'update' : 'create'} department head`);
      }
    } catch (err) {
      setError(`Error ${editingDepartmentHead ? 'updating' : 'creating'} department head: ` + err.message);
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
        // Get token from localStorage
        const token = localStorage.getItem('token');
        
        const response = await fetch(`http://localhost:5000/api/department-heads/${id}`, {
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
      return departments;
    }
    
    // When creating, only show departments without a head
    return departments.filter(dept => 
      !departmentHeads.some(head => 
        head.department._id === dept._id || head.department === dept._id
      )
    );
  };

  return (
    <div className="add-department-head">
      <div className="page-header">
        <h1><FaUserShield /> Department Heads</h1>
        <button className="btn-primary" onClick={openModal}>
          <FaPlus /> Add 
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">Department head {editingDepartmentHead ? 'updated' : 'created'} successfully!</div>}

      <table className="department-heads-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone Number</th>
            <th>Department</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {departmentHeads.map((head) => (
            <tr key={head._id}>
              <td>{head.name}</td>
              <td>{head.email}</td>
              <td>{head.phoneNo}</td>
              <td>{head.department?.name || 'N/A'}</td>
              <td>
                <button 
                  className="btn-icon edit"
                  onClick={() => handleEdit(head)}
                  title="Edit"
                >
                  <FaEdit />
                </button>
                <button 
                  className="btn-icon delete"
                  onClick={() => handleDelete(head._id)}
                  title="Delete"
                >
                  <FaTrash />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {departmentHeads.length === 0 && (
        <div className="no-data">
          No department heads found. Click "Add Department Head" to create one.
        </div>
      )}

      {/* Modal for adding/editing department heads */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingDepartmentHead ? 'Edit Department Head' : 'Add New Department Head'}</h2>
              <button className="modal-close" onClick={closeModal}>
                <FaTimes />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="department-head-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="name">Full Name *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="form-input"
                    placeholder="Enter full name"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email Address *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="form-input"
                    placeholder="Enter email address"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="phoneNo">Phone Number *</label>
                  <input
                    type="text"
                    id="phoneNo"
                    name="phoneNo"
                    value={formData.phoneNo}
                    onChange={handleChange}
                    required
                    className="form-input"
                    placeholder="Enter phone number"
                  />
                </div>

                <div className="form-group password-group">
                  <label htmlFor="password">
                    {editingDepartmentHead ? 'New Password' : 'Password'} {editingDepartmentHead ? '' : '*'}
                  </label>
                  <div className="password-input-container">
                    <input
                      type={editingDepartmentHead ? (showNewPassword ? "text" : "password") : (showPassword ? "text" : "password")}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required={!editingDepartmentHead}
                      minLength="6"
                      className="form-input password-input"
                      placeholder={editingDepartmentHead ? "Enter new password (leave blank to keep current)" : "Enter password (min 6 characters)"}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => editingDepartmentHead ? setShowNewPassword(!showNewPassword) : setShowPassword(!showPassword)}
                    >
                      {editingDepartmentHead ? (showNewPassword ? <FaEyeSlash /> : <FaEye />) : (showPassword ? <FaEyeSlash /> : <FaEye />)}
                    </button>
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="department">Department *</label>
                  <select
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    required
                    className="form-input"
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

              <div className="form-actions">
                <button 
                  type="button" 
                  onClick={closeModal}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="btn-primary"
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