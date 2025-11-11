import { useState, useEffect } from 'react';
import { FaChartBar, FaBook, FaUserGraduate, FaSearch, FaSave, FaEdit, FaEye, FaEyeSlash } from 'react-icons/fa';
import StudentAnswersModal from './StudentAnswersModal';

const TeacherScoresPage = ({ user }) => {
  const [results, setResults] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [editingResultId, setEditingResultId] = useState(null);
  const [editingAssignmentScore, setEditingAssignmentScore] = useState('');
  const [showAnswersModal, setShowAnswersModal] = useState(false);
  const [modalData, setModalData] = useState({
    studentId: null,
    examId: null,
    examTitle: '',
    studentName: '',
    courseName: ''
  });

  // Filter results based on search term (client-side filtering for student names)
  const filteredResults = results.filter(result => {
    const matchesSearch = !searchTerm || 
      result.student?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.student?.userId.toLowerCase().includes(searchTerm.toLowerCase());
    
    // If a course is selected, only show results for that course
    const matchesCourse = !selectedCourse || result.course?._id === selectedCourse;
    
    return matchesSearch && matchesCourse;
  });

  // Fetch courses taught by this teacher
  const fetchTeacherCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`http://localhost:5000/api/teachers/${user._id}/courses`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch courses');
      }

      const data = await response.json();
      setCourses(data.data || []);
      return data.data || [];
    } catch (err) {
      console.error('Error fetching courses:', err);
      setError(err.message);
      return [];
    }
  };

  // Fetch results for students in courses taught by this teacher
  const fetchResults = async (courseId = null) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Build query string
      let queryString = '';
      if (courseId) {
        queryString = `?course=${courseId}`;
      }
      
      // Fetch results for this teacher's courses
      const response = await fetch(`http://localhost:5000/api/results/teacher/${user._id}${queryString}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch results');
      }

      const data = await response.json();
      const teacherResults = data.data || [];
      
      setResults(teacherResults);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle course selection change
  const handleCourseChange = (e) => {
    const courseId = e.target.value;
    setSelectedCourse(courseId);
    fetchResults(courseId || null);
  };

  // Start editing assignment score for a result
  const startEditing = (resultId, currentScore) => {
    setEditingResultId(resultId);
    setEditingAssignmentScore(currentScore !== null ? currentScore.toString() : '');
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingResultId(null);
    setEditingAssignmentScore('');
  };

  // Save assignment score
  const saveAssignmentScore = async (resultId) => {
    try {
      const token = localStorage.getItem('token');
      
      // Validate that the score is a number
      const score = editingAssignmentScore === '' ? null : Number(editingAssignmentScore);
      if (score !== null && (isNaN(score) || score < 0)) {
        setError('Please enter a valid non-negative number for the assignment score');
        return;
      }
      
      const response = await fetch(`http://localhost:5000/api/results/${resultId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ assignmentScore: score })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update assignment score');
      }

      const data = await response.json();
      
      // Update the results state with the updated result
      setResults(prevResults => 
        prevResults.map(result => 
          result._id === resultId ? data.data : result
        )
      );
      
      // Exit editing mode
      setEditingResultId(null);
      setEditingAssignmentScore('');
    } catch (err) {
      setError(err.message);
    }
  };

  // Show answers modal for a specific exam
  const showAnswers = async (studentId, courseId, examTitle, studentName, courseName) => {
    try {
      const token = localStorage.getItem('token');
      
      // First, get the exam ID for this course and exam title
      const examsResponse = await fetch(`http://localhost:5000/api/exams?course=${courseId}&title=${encodeURIComponent(examTitle)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!examsResponse.ok) {
        throw new Error('Failed to fetch exam');
      }

      const examsData = await examsResponse.json();
      const exams = examsData.data || [];
      
      if (exams.length === 0) {
        setError(`No ${examTitle} found for this course`);
        return;
      }
      
      // If there are multiple exams with the same title, we need to be more specific
      // For now, we'll take the first one, but let's log if there are multiple
      if (exams.length > 1) {
        console.warn(`Multiple exams found for ${examTitle} in course ${courseId}. Using the first one.`);
      }
      
      const examId = exams[0]._id;
      
      setModalData({
        studentId,
        examId,
        examTitle,
        studentName,
        courseName
      });
      
      setShowAnswersModal(true);
    } catch (err) {
      setError(err.message);
    }
  };

  // Toggle result visibility for students
  const toggleResultVisibility = async (resultId, currentVisibility) => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`http://localhost:5000/api/results/${resultId}/visibility`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isVisibleToStudent: !currentVisibility
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update result visibility');
      }

      // Refresh the results list
      fetchResults(selectedCourse || null);
    } catch (err) {
      setError(err.message);
    }
  };

  // Make all results visible for the selected course
  const makeAllVisibleForSelectedCourse = async () => {
    if (!selectedCourse) {
      setError('Please select a course first');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      // Get results for the selected course
      const courseResults = results.filter(result => result.course?._id === selectedCourse);
      
      if (courseResults.length === 0) {
        setError('No results found for the selected course');
        return;
      }
      
      // Make all results visible
      const updatePromises = courseResults.map(result => {
        // Only update if not already visible
        if (!result.isVisibleToStudent) {
          return fetch(`http://localhost:5000/api/results/${result._id}/visibility`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              isVisibleToStudent: true
            })
          });
        }
        return Promise.resolve();
      });
      
      // Wait for all updates to complete
      await Promise.all(updatePromises);
      
      // Refresh the results list
      fetchResults(selectedCourse || null);
    } catch (err) {
      setError(err.message);
    }
  };

  // Hide all results for the selected course
  const hideAllForSelectedCourse = async () => {
    if (!selectedCourse) {
      setError('Please select a course first');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      // Get results for the selected course
      const courseResults = results.filter(result => result.course?._id === selectedCourse);
      
      if (courseResults.length === 0) {
        setError('No results found for the selected course');
        return;
      }
      
      // Hide all results
      const updatePromises = courseResults.map(result => {
        // Only update if currently visible
        if (result.isVisibleToStudent) {
          return fetch(`http://localhost:5000/api/results/${result._id}/visibility`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              isVisibleToStudent: false
            })
          });
        }
        return Promise.resolve();
      });
      
      // Wait for all updates to complete
      await Promise.all(updatePromises);
      
      // Refresh the results list
      fetchResults(selectedCourse || null);
    } catch (err) {
      setError(err.message);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  useEffect(() => {
    const fetchData = async () => {
      // First fetch courses
      await fetchTeacherCourses();
      // Then fetch all results for teacher's courses
      await fetchResults();
    };
    fetchData();
  }, [user]);

  const getGradeColor = (grade) => {
    switch (grade) {
      case 'A+': return 'bg-green-100 text-green-800';
      case 'A': return 'bg-green-100 text-green-800';
      case 'A-': return 'bg-green-100 text-green-800';
      case 'B+': return 'bg-blue-100 text-blue-800';
      case 'B': return 'bg-blue-100 text-blue-800';
      case 'B-': return 'bg-blue-100 text-blue-800';
      case 'C+': return 'bg-yellow-100 text-yellow-800';
      case 'C': return 'bg-yellow-100 text-yellow-800';
      case 'C-': return 'bg-yellow-100 text-yellow-800';
      case 'D': return 'bg-orange-100 text-orange-800';
      case 'F': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && results.length === 0) {
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
          onClick={() => fetchResults(selectedCourse || null)}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4 md:mb-0">Student Scores</h1>
        <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-2">
          {/* Course Selection */}
          <div className="flex items-center space-x-2">
            <select
              value={selectedCourse}
              onChange={handleCourseChange}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Courses</option>
              {courses.map((course) => (
                <option key={course._id} value={course._id}>
                  {course.subject || 'Untitled Course'}
                </option>
              ))}
            </select>
            {selectedCourse && (
              <div className="flex space-x-1">
                <button
                  onClick={makeAllVisibleForSelectedCourse}
                  className="px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm"
                >
                  Make All Visible
                </button>
                <button
                  onClick={hideAllForSelectedCourse}
                  className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm"
                >
                  Hide All
                </button>
              </div>
            )}
          </div>
          
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="text-gray-400" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Results Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Course
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mid-Exam
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Final-Exam
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assignment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Overall
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Grade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Visibility
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredResults.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-4 text-center text-gray-500">
                    {searchTerm || selectedCourse ? 'No results found matching your criteria' : 'No results available'}
                  </td>
                </tr>
              ) : (
                filteredResults.map((result) => (
                  <tr key={result._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <FaUserGraduate className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{result.student?.name || 'Unknown Student'}</div>
                          <div className="text-xs text-gray-500">{result.student?.userId || 'N/A'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 rounded bg-blue-50 flex items-center justify-center">
                          <FaBook className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="ml-2">
                          <div className="text-sm font-medium text-gray-900">{result.course?.subject || 'Unknown Course'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <span>{result.midExamScore !== null ? result.midExamScore : 'N/A'}</span>
                        {result.midExamScore !== null && result.student && result.course && (
                          <button
                            onClick={() => showAnswers(
                              result.student._id, 
                              result.course._id, 
                              'Mid-exam', 
                              result.student.name, 
                              result.course.subject
                            )}
                            className="p-1 text-blue-600 hover:text-blue-800"
                            title="View Answers"
                          >
                            <FaEye />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <span>{result.finalExamScore !== null ? result.finalExamScore : 'N/A'}</span>
                        {result.finalExamScore !== null && result.student && result.course && (
                          <button
                            onClick={() => showAnswers(
                              result.student._id, 
                              result.course._id, 
                              'Final-exam', 
                              result.student.name, 
                              result.course.subject
                            )}
                            className="p-1 text-blue-600 hover:text-blue-800"
                            title="View Answers"
                          >
                            <FaEye />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {editingResultId === result._id ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            min="0"
                            value={editingAssignmentScore}
                            onChange={(e) => setEditingAssignmentScore(e.target.value)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Score"
                          />
                          <button
                            onClick={() => saveAssignmentScore(result._id)}
                            className="p-1 text-green-600 hover:text-green-800"
                            title="Save"
                          >
                            <FaSave />
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="p-1 text-gray-600 hover:text-gray-800"
                            title="Cancel"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span>{result.assignmentScore !== null ? result.assignmentScore : 'N/A'}</span>
                          <button
                            onClick={() => startEditing(result._id, result.assignmentScore)}
                            className="p-1 text-blue-600 hover:text-blue-800"
                            title="Edit"
                          >
                            <FaEdit />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {result.overallScore !== null ? result.overallScore : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getGradeColor(result.grade)}`}>
                        {result.grade || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {result.isVisibleToStudent ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <FaEye className="mr-1" /> Visible
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <FaEyeSlash className="mr-1" /> Hidden
                          </span>
                        )}
                      </div>
                      {result.isVisibleToStudent && result.madeVisibleAt && (
                        <div className="text-xs text-gray-500 mt-1">
                          {formatDate(result.madeVisibleAt)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => toggleResultVisibility(result._id, result.isVisibleToStudent)}
                        className={`px-3 py-1 rounded text-sm ${
                          result.isVisibleToStudent 
                            ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {result.isVisibleToStudent ? 'Hide' : 'Show'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Student Answers Modal */}
      <StudentAnswersModal
        isOpen={showAnswersModal}
        onClose={() => setShowAnswersModal(false)}
        studentId={modalData.studentId}
        examId={modalData.examId}
        examTitle={modalData.examTitle}
        studentName={modalData.studentName}
        courseName={modalData.courseName}
      />
    </div>
  );
};

export default TeacherScoresPage;