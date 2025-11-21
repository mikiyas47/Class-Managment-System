import { useState, useEffect } from 'react';
import { FaTimes, FaBook, FaUserGraduate } from 'react-icons/fa';

const StudentAnswersModal = ({ isOpen, onClose, studentId, examId, examTitle, studentName, courseName }) => {
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && studentId && examId) {
      fetchStudentAnswers();
    }
  }, [isOpen, studentId, examId]);

  const fetchStudentAnswers = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      console.log('Fetching student answers with:', { studentId, examId });
      
      // Validate inputs
      if (!studentId || !examId) {
        throw new Error('Missing required parameters: studentId or examId');
      }
      
      // Import the API base URL
      const { API_BASE_URL } = await import('../api');
      
      // First, get the student exam record using student ID and exam ID
      console.log(`Fetching student exam for student: ${studentId} and exam: ${examId}`);
      const studentExamResponse = await fetch(`${API_BASE_URL}/api/student-exams?student=${studentId}&exam=${examId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Student exam response status:', studentExamResponse.status);
      
      if (!studentExamResponse.ok) {
        const errorText = await studentExamResponse.text();
        console.log('Student exam response error text:', errorText);
        throw new Error(`Failed to fetch student exam: ${studentExamResponse.status} - ${errorText}`);
      }

      const studentExamData = await studentExamResponse.json();
      console.log('Student exam data:', studentExamData);
      
      const studentExams = studentExamData.data || [];
      
      if (studentExams.length === 0) {
        console.log('No student exams found for student:', studentId, 'and exam:', examId);
        setError('No exam record found for this student. The student may not have taken this exam yet.');
        setAnswers([]);
        setLoading(false);
        return;
      }
      
      // Safely extract the student exam ID
      const studentExam = studentExams[0];
      console.log('Student exam object:', studentExam);
      
      const studentExamId = studentExam._id || studentExam.id;
      
      if (!studentExamId) {
        throw new Error('Invalid student exam data: missing ID');
      }
      
      // Validate that the student exam ID is a valid MongoDB ObjectId
      if (!/^[0-9a-fA-F]{24}$/.test(studentExamId)) {
        throw new Error(`Invalid student exam ID format: ${studentExamId}`);
      }
      
      console.log('Student exam ID:', studentExamId);
      
      // Then, get the answers for this student exam
      console.log(`Fetching answers for student exam: ${studentExamId}`);
      const answersResponse = await fetch(`${API_BASE_URL}/api/answers?studentExam=${studentExamId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Answers response status:', answersResponse.status);
      
      if (!answersResponse.ok) {
        const errorText = await answersResponse.text();
        console.log('Answers response error text:', errorText);
        throw new Error(`Failed to fetch answers: ${answersResponse.status} - ${errorText}`);
      }

      const answersData = await answersResponse.json();
      console.log('Answers data:', answersData);
      
      const answersWithQuestions = await Promise.all(
        (answersData.data || []).map(async (answer, index) => {
          console.log(`Processing answer ${index}:`, answer);
          
          // Fetch question details
          const questionId = answer.question?._id || answer.question;
          if (!questionId) {
            console.warn('Answer missing question ID:', answer);
            return answer;
          }
          
          // Validate question ID format
          if (!/^[0-9a-fA-F]{24}$/.test(questionId)) {
            console.warn('Invalid question ID format:', questionId);
            return answer;
          }
          
          try {
            const questionResponse = await fetch(`${API_BASE_URL}/api/questions/${questionId}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (questionResponse.ok) {
              const questionData = await questionResponse.json();
              return {
                ...answer,
                question: questionData.data || answer.question
              };
            } else {
              const errorText = await questionResponse.text();
              console.warn(`Failed to fetch question ${questionId}: ${questionResponse.status} - ${errorText}`);
            }
          } catch (questionError) {
            console.warn(`Error fetching question ${questionId}:`, questionError);
          }
          return answer;
        })
      );
      
      setAnswers(answersWithQuestions);
    } catch (err) {
      console.error('Error in fetchStudentAnswers:', err);
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Student Answers</h2>
            <p className="text-blue-100 text-sm mt-1">
              {studentName} - {examTitle} - {courseName}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-white hover:text-blue-200 p-2 rounded-full hover:bg-blue-500 transition-colors"
          >
            <FaTimes className="h-5 w-5" />
          </button>
        </div>
        
        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
              <p>Error: {error}</p>
              <button 
                onClick={fetchStudentAnswers}
                className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          ) : answers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No answers found for this exam.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {answers.map((answer, index) => (
                <div key={answer._id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 font-bold mr-3 mt-1">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">
                        {answer.question?.question || 'Question not available'}
                      </h3>
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                        {['A', 'B', 'C', 'D'].map((option) => (
                          <div 
                            key={option}
                            className={`p-3 rounded border ${
                              answer.selectedOption === option 
                                ? 'border-blue-500 bg-blue-50' 
                                : 'border-gray-200'
                            }`}
                          >
                            <div className="flex items-center">
                              <span className="font-medium mr-2">{option}.</span>
                              <span>
                                {answer.question?.[`option${option}`] || `Option ${option}`}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex items-center">
                        <span className="font-medium text-gray-700 mr-2">Student's Answer:</span>
                        <span className={`px-2 py-1 rounded font-medium ${
                          answer.selectedOption === (answer.question?.correctOption || '')
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {answer.selectedOption}
                        </span>
                        {answer.selectedOption !== (answer.question?.correctOption || '') && (
                          <span className="ml-3 font-medium text-gray-700">
                            Correct Answer: <span className="text-green-600">{answer.question?.correctOption || 'N/A'}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Modal Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-between items-center">
          <p className="text-sm text-gray-500">
            Total Questions: {answers.length}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentAnswersModal;