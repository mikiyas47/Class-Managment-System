import { useState, useEffect } from 'react';
import { FaFileAlt } from 'react-icons/fa';

const ResultsPage = ({ user }) => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchResults();
  }, [user]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Import the API base URL
      const { API_BASE_URL } = await import('../api');
      const response = await fetch(`${API_BASE_URL}/api/results`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch results');
      }

      const data = await response.json();
      setResults(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateGrade = (score) => {
    if (score === null || score === undefined) return 'N/A';
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
        <p>Error: {error}</p>
        <button 
          onClick={fetchResults}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">My Results</h1>
          <p className="text-gray-600 mt-2">View your exam and assignment results</p>
        </div>
      </div>

      {results.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-8 text-center">
          <FaFileAlt className="mx-auto text-gray-400 text-4xl" />
          <h3 className="text-xl font-semibold text-gray-800 mt-4">No Results Available</h3>
          <p className="text-gray-600 mt-2">Results will be available after exams and assignments are graded.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Course
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mid-Exam Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Final-Exam Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assignment Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Overall Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grade
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.map((result) => (
                  <tr key={result._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {result.course?.subject || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {result.course?.code || ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {result.midExamScore !== null ? result.midExamScore : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {result.finalExamScore !== null ? result.finalExamScore : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {result.assignmentScore !== null ? result.assignmentScore : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {result.overallScore !== null ? result.overallScore : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        result.grade === 'A+' ? 'bg-green-100 text-green-800' :
                        result.grade === 'A' ? 'bg-green-100 text-green-800' :
                        result.grade === 'A-' ? 'bg-green-100 text-green-800' :
                        result.grade === 'B+' ? 'bg-blue-100 text-blue-800' :
                        result.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                        result.grade === 'B-' ? 'bg-blue-100 text-blue-800' :
                        result.grade === 'C+' ? 'bg-yellow-100 text-yellow-800' :
                        result.grade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                        result.grade === 'C-' ? 'bg-yellow-100 text-yellow-800' :
                        result.grade === 'D' ? 'bg-orange-100 text-orange-800' :
                        result.grade === 'F' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {result.grade || 'N/A'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsPage;