import { useState, useEffect } from 'react';
import { api } from './api';

const BackendConnector = () => {
  const [message, setMessage] = useState('');
  const [apiData, setApiData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchBackendStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      // Check if backend is running
      const data = await api.getStatus();
      setMessage(data);
    } catch (err) {
      setError('Failed to connect to backend: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchApiData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch data from our new API endpoint
      const data = await api.getData();
      setApiData(data);
    } catch (err) {
      setError('Failed to fetch API data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackendStatus();
    fetchApiData();
  }, []);

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '20px 0' }}>
      <h2>Backend Connection Status</h2>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      
      {message && <p style={{ color: 'green' }}>Backend status: {message}</p>}
      
      {apiData && (
        <div style={{ marginTop: '10px' }}>
          <h3>API Data:</h3>
          <p>Message: {apiData.message}</p>
          <p>Timestamp: {apiData.timestamp}</p>
          <p>Status: {apiData.status}</p>
        </div>
      )}
      
      <div style={{ marginTop: '10px' }}>
        <button onClick={fetchBackendStatus} disabled={loading} style={{ marginRight: '10px' }}>
          {loading ? 'Checking...' : 'Check Status'}
        </button>
        <button onClick={fetchApiData} disabled={loading}>
          {loading ? 'Fetching...' : 'Fetch API Data'}
        </button>
      </div>
    </div>
  );
};

export default BackendConnector;