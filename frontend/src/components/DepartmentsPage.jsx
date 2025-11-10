import { useState, useEffect } from 'react';
import { FaBuilding, FaPlus, FaEdit, FaTrash, FaTimes } from 'react-icons/fa';

const DepartmentsPage = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    science: ''
  });

  // Fetch departments when component mounts
  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/departments');
      const data = await response.json();
      if (data.status === 'success') {
        setDepartments(data.data);
      } else {
        setError('Failed to fetch departments');
      }
    } catch (err) {
      setError('Error fetching departments: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingDepartment 
        ? `http://localhost:5000/api/departments/${editingDepartment._id}`
        : 'http://localhost:5000/api/departments';
      
      const method = editingDepartment ? 'PUT' : 'POST';
      
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
        setShowModal(false);
        setEditingDepartment(null);
        setFormData({ name: '', science: '' });
        fetchDepartments(); // Refresh the list
      } else {
        setError(data.message || `Failed to ${editingDepartment ? 'update' : 'create'} department`);
      }
    } catch (err) {
      setError(`Error ${editingDepartment ? 'updating' : 'creating'} department: ` + err.message);
    }
  };

  const handleEdit = (department) => {
    setEditingDepartment(department);
    setFormData({
      name: department.name,
      science: department.science
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this department?')) {
      try {
        // Get token from localStorage
        const token = localStorage.getItem('token');
        
        const response = await fetch(`http://localhost:5000/api/departments/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
          fetchDepartments(); // Refresh the list
        } else {
          setError('Failed to delete department');
        }
      } catch (err) {
        setError('Error deleting department: ' + err.message);
      }
    }
  };

  const openModal = () => {
    setEditingDepartment(null);
    setFormData({ name: '', science: '' });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingDepartment(null);
    setFormData({ name: '', science: '' });
  };

  if (loading) {
    return <div className="departments-page">Loading departments...</div>;
  }

  return (
    <div className="departments-page">
      <div className="page-header">
        <h1><FaBuilding /> Departments</h1>
        <button className="btn-primary" onClick={openModal}>
          <FaPlus /> Add Department
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="table-container">
        <table className="departments-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Science Type</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((department) => (
              <tr key={department._id}>
                <td>{department.name}</td>
                <td>
                  <span className={`science-tag ${department.science}`}>
                    {department.science}
                  </span>
                </td>
                <td>
                  <button 
                    className="btn-icon edit"
                    onClick={() => handleEdit(department)}
                    title="Edit"
                  >
                    <FaEdit />
                  </button>
                  <button 
                    className="btn-icon delete"
                    onClick={() => handleDelete(department._id)}
                    title="Delete"
                  >
                    <FaTrash />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {departments.length === 0 && (
          <div className="no-data">
            No departments found. Click "Add Department" to create one.
          </div>
        )}
      </div>

      {/* Modal for adding/editing departments */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingDepartment ? 'Edit Department' : 'Add New Department'}</h2>
              <button className="modal-close" onClick={closeModal}>
                <FaTimes />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="department-form">
              <div className="form-group">
                <label htmlFor="name">Department Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="form-input"
                  placeholder="Enter department name"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="science">Science Type *</label>
                <select
                  id="science"
                  name="science"
                  value={formData.science}
                  onChange={handleInputChange}
                  required
                  className="form-input"
                >
                  <option value="">Select science type</option>
                  <option value="natural">Natural</option>
                  <option value="social">Social</option>
                </select>
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
                  className="btn-primary"
                >
                  {editingDepartment ? 'Update Department' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentsPage;