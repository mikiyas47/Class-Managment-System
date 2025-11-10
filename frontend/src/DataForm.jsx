import { useState } from 'react';
import { api } from './api';

const DataForm = () => {
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
    setResponse(null);
    
    try {
      // Send data to the backend
      const result = await api.submitData(formData);
      setResponse(result);
      setLoading(false);
    } catch (err) {
      setError('Failed to submit data: ' + err.message);
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '20px 0' }}>
      <h2>Data Submission Form</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="name">Name: </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            style={{ marginLeft: '10px', padding: '5px' }}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="email">Email: </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            style={{ marginLeft: '10px', padding: '5px' }}
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Submitting...' : 'Submit Data'}
        </button>
      </form>
      
      {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
      
      {response && (
        <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#e8f5e8' }}>
          <h3>Submission Response:</h3>
          <p>{response.message}</p>
          <p>Name: {response.data.name}</p>
          <p>Email: {response.data.email}</p>
          <p>Timestamp: {response.timestamp}</p>
        </div>
      )}
    </div>
  );
};

export default DataForm;