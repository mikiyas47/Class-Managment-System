import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaCheck, FaClock, FaSave } from 'react-icons/fa';
import io from 'socket.io-client';

const StudentExamPage = ({ user }) => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [studentAnswers, setStudentAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [examStarted, setExamStarted] = useState(false);
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [socket, setSocket] = useState(null);
  const [savingStatus, setSavingStatus] = useState({}); // Track saving status for each question
  const [allQuestionsAnswered, setAllQuestionsAnswered] = useState(false); // Track if all questions are answered
  const [isSubmitting, setIsSubmitting] = useState(false); // Add submission flag
  const [submissionResult, setSubmissionResult] = useState(null); // 'success' or 'expired'

  // Debugging: Log the examId
  console.log('Exam ID from params:', examId, typeof examId);

  // Initialize WebSocket connection
  useEffect(() => {
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    // Connect to server
    newSocket.emit('student-connect', user._id);

    // Listen for answer saved confirmation
    newSocket.on('answer-saved', (data) => {
      console.log('Answer saved confirmation:', data);
      setSavingStatus(prev => ({
        ...prev,
        [data.questionId]: 'saved'
      }));
      // Clear the saved status after 2 seconds
      setTimeout(() => {
        setSavingStatus(prev => ({
          ...prev,
          [data.questionId]: null
        }));
      }, 2000);
    });

    // Listen for answer save errors
    newSocket.on('answer-save-error', (data) => {
      console.error('Answer save error:', data);
      setError(data.error || 'Failed to save answer');
    });

    // Listen for exam timer updates
    newSocket.on('exam-timer-update', (data) => {
      console.log('Exam timer update:', data);
      if (data.examId === examId) {
        setTimeLeft(data.timeLeft);
        if (data.timeLeft > 0 && !examStarted) {
          setExamStarted(true);
        }
      }
    });

    // Listen for exam ended notification
    newSocket.on('exam-ended', (endedExamId) => {
      console.log('Exam ended event received - endedExamId:', endedExamId, 'current examId:', examId, 'examSubmitted:', examSubmitted, 'isSubmitting:', isSubmitting);
      if (endedExamId === examId && !examSubmitted && !isSubmitting) {
        console.log('Auto-submitting exam due to exam-ended event');
        handleSubmitExam(true);
      } else {
        console.log('Skipping auto-submit - exam already submitted or being submitted');
      }
    });

    return () => {
      newSocket.close();
    };
  }, [user._id, examId, examStarted]);

  // Fetch exam details and questions
  useEffect(() => {
    const fetchExamData = async () => {
      try {
        const token = localStorage.getItem('token');
        
        console.log('Fetching exam with ID:', examId);
        
        // Validate examId format
        if (!examId || examId === 'undefined' || examId === 'null' || examId.trim() === '') {
          throw new Error('Invalid exam ID format');
        }
        
        // Fetch exam details
        const examUrl = `http://localhost:5000/api/exams/${examId}`;
        console.log('Fetching exam from URL:', examUrl);
        const examRes = await fetch(examUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      
        if (!examRes.ok) {
          const errorData = await examRes.json().catch(() => ({}));
          console.log('Exam fetch error response:', errorData);
          // Check if it's a specific "not available yet" error
          if (errorData.message && errorData.message.includes('not available yet')) {
            throw new Error(`This exam is not available yet. Please check back at the scheduled time.`);
          }
          // Check if it's a specific "no longer available" error
          if (errorData.message && errorData.message.includes('no longer available')) {
            throw new Error(`This exam is no longer available. The exam time has ended.`);
          }
          throw new Error(errorData.message || `Failed to fetch exam (Status: ${examRes.status})`);
        }
      
        const examData = await examRes.json();
        console.log('Exam data received:', examData);
        setExam(examData.data);
      
        // Check if exam should be started based on current time
        const now = new Date();
        const examStartTime = new Date(examData.data.startTime);
        const examEndTime = new Date(examStartTime.getTime() + examData.data.duration * 60000);
      
        console.log('Current time:', now);
        console.log('Exam start time:', examStartTime);
        console.log('Exam end time:', examEndTime);
      
        // If current time is within exam time, set exam as started
        if (now >= examStartTime && now < examEndTime) {
          setExamStarted(true);
          // Calculate initial time left
          const initialTimeLeft = Math.floor((examEndTime - now) / 1000);
          setTimeLeft(initialTimeLeft);
          console.log('Exam is active, time left:', initialTimeLeft);
        }
      
        // Fetch questions for this exam
        const questionsUrl = `http://localhost:5000/api/questions?exam=${examId}`;
        console.log('Fetching questions from URL:', questionsUrl);
        const questionsRes = await fetch(questionsUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      
        console.log('Questions response status:', questionsRes.status);
        if (!questionsRes.ok) {
          const questionsErrorData = await questionsRes.json().catch(() => ({}));
          console.log('Questions fetch error response:', questionsErrorData);
          throw new Error(questionsErrorData.message || 'Failed to fetch questions');
        }
      
        const questionsData = await questionsRes.json();
        console.log('Questions data received:', questionsData);
        setQuestions(questionsData.data || []);
      
        // Initialize student answers
        const initialAnswers = {};
        (questionsData.data || []).forEach(question => {
          initialAnswers[question._id] = '';
        });
        setStudentAnswers(initialAnswers);
        
        // Check if all questions are answered (initially false)
        setAllQuestionsAnswered(false);
      } catch (err) {
        console.error('Error fetching exam data:', err);
        setError(err.message || 'Failed to load exam data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (examId) {
      fetchExamData();
    }
  }, [examId]);

  // Timer effect - now primarily for UI updates based on WebSocket
  useEffect(() => {
    console.log('Timer effect triggered - timeLeft:', timeLeft, 'examStarted:', examStarted, 'examSubmitted:', examSubmitted, 'isSubmitting:', isSubmitting);
    // If time is up and exam is started but not submitted, auto-submit without confirmation
    if (timeLeft <= 0 && examStarted && !examSubmitted && !isSubmitting) {
      console.log('Auto-submitting exam due to time expiration');
      handleSubmitExam(true); // Pass true to indicate auto-submit due to time expiration
    }
  }, [timeLeft, examStarted, examSubmitted, isSubmitting]);

  // Timer countdown effect
  useEffect(() => {
    let timer;
    if (examStarted && !examSubmitted && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [examStarted, examSubmitted, timeLeft]);

  // Handle answer selection
  const handleAnswerSelect = (questionId, option) => {
    setStudentAnswers(prev => ({
      ...prev,
      [questionId]: option
    }));
    
    // Update the allQuestionsAnswered state
    setTimeout(() => {
      const updatedAnswers = {
        ...studentAnswers,
        [questionId]: option
      };
      const answeredCount = Object.values(updatedAnswers).filter(answer => answer !== '').length;
      setAllQuestionsAnswered(answeredCount === questions.length);
    }, 0);
  };

  // Save individual answer through WebSocket
  const saveAnswer = async (questionId, selectedOption) => {
    if (!socket) {
      console.error('Socket not connected');
      return;
    }

    try {
      setSavingStatus(prev => ({
        ...prev,
        [questionId]: 'saving'
      }));

      // Send answer to server via WebSocket
      socket.emit('save-answer', {
        studentId: user._id,
        examId: examId,
        questionId: questionId,
        selectedOption: selectedOption
      });
    } catch (err) {
      console.error('Error sending answer via WebSocket:', err);
      setSavingStatus(prev => ({
        ...prev,
        [questionId]: 'error'
      }));
      setError(err.message);
    }
  };

  // Submit the entire exam
  const handleSubmitExam = async (isAutoSubmit = false) => {
    console.log('=== handleSubmitExam called ===');
    console.log('isAutoSubmit:', isAutoSubmit);
    console.log('Current state - examSubmitted:', examSubmitted, 'isSubmitting:', isSubmitting);
    
    // Prevent multiple submissions
    if (isSubmitting || examSubmitted) {
      console.log('Exam already submitted or being submitted, returning early');
      console.log('isSubmitting:', isSubmitting, 'examSubmitted:', examSubmitted);
      return;
    }
    
    // Only show confirmation if it's not an auto-submit due to time expiration
    if (!isAutoSubmit && !window.confirm('Are you sure you want to submit this exam?')) {
      console.log('User cancelled manual submission');
      return;
    }
    
    try {
      console.log('Starting exam submission process');
      setIsSubmitting(true); // Set submission flag
      const token = localStorage.getItem('token');
      console.log('Token retrieved from localStorage:', token ? 'Token exists' : 'No token');
      
      // Wait longer to ensure all WebSocket answers are sent and saved
      console.log('Waiting for answers to be saved...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Finished waiting for answers to be saved');
      
      // First, check if a student exam record already exists
      console.log('Checking if student exam record already exists');
      const checkStudentExamRes = await fetch(`http://localhost:5000/api/student-exams?student=${user._id}&exam=${examId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Check student exam response status:', checkStudentExamRes.status);
      
      let studentExamId = null;
      
      if (checkStudentExamRes.ok) {
        const checkData = await checkStudentExamRes.json();
        console.log('Check student exam response:', checkData);
      
        if (checkData.data && checkData.data.length > 0) {
          // Student exam record already exists
          studentExamId = checkData.data[0]._id;
          console.log('Found existing student exam record with ID:', studentExamId);
        } else {
          // Create a new student exam record
          console.log('Creating new student exam record');
          const studentExamRes = await fetch('http://localhost:5000/api/student-exams', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              student: user._id,
              exam: examId
            })
          });
          
          console.log('Create student exam response status:', studentExamRes.status);
          
          if (!studentExamRes.ok) {
            const errorData = await studentExamRes.json().catch(() => ({}));
            console.error('Failed to create student exam record:', errorData);
            throw new Error(errorData.message || 'Failed to create student exam record');
          }
          
          const studentExamData = await studentExamRes.json();
          studentExamId = studentExamData.data._id;
          console.log('Created new student exam record with ID:', studentExamId);
        }
      } else {
        throw new Error('Failed to check student exam record');
      }
      
      // Update student exam with submittedAt timestamp
      console.log('Updating student exam with submittedAt timestamp');
      const updateRes = await fetch(`http://localhost:5000/api/student-exams/${studentExamId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          submittedAt: new Date()
        })
      });
      
      console.log('Update student exam response status:', updateRes.status);
      
      if (!updateRes.ok) {
        const errorData = await updateRes.json().catch(() => ({}));
        console.error('Failed to update student exam record:', errorData);
        throw new Error(errorData.message || 'Failed to update student exam record');
      }
      
      // Calculate score and save results only if exam and user data are available
      if (exam && exam.course && user && user.class) {
        console.log('Exam and user data available for result calculation');
        console.log('Exam data:', exam);
        console.log('User data:', user);
        
        // Calculate score and save results
        console.log('Calculating score and saving results');
        const calculateScoreRes = await fetch(`http://localhost:5000/api/student-exams/${studentExamId}/calculate-score`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Calculate score response status:', calculateScoreRes.status);
        
        if (!calculateScoreRes.ok) {
          const errorData = await calculateScoreRes.json().catch(() => ({}));
          console.error('Failed to calculate score:', errorData);
          // Don't throw error here as the exam submission was successful
        } else {
          const scoreData = await calculateScoreRes.json();
          console.log('Score calculated:', scoreData);
        }
        
        // Save results to results table
        console.log('Saving results to results table');
        console.log('Sending data to results API:', {
          studentId: user._id,
          courseId: exam.course._id,
          classId: user.class._id
        });

        try {
          const saveResultRes = await fetch('http://localhost:5000/api/results/calculate', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              studentId: user._id,
              courseId: exam.course._id,
              classId: user.class._id
            })
          });
          
          console.log('Results API response status:', saveResultRes.status);
          console.log('Results API response headers:', [...saveResultRes.headers.entries()]);
          
          if (!saveResultRes.ok) {
            const errorData = await saveResultRes.json().catch(() => ({}));
            console.error('Failed to save results:', errorData);
            console.error('Full response:', saveResultRes);
            // Don't throw error here as the exam submission was successful
          } else {
            const resultData = await saveResultRes.json();
            console.log('Results saved:', resultData);
          }
        } catch (fetchError) {
          console.error('Network error when saving results:', fetchError);
        }
      } else {
        console.log('Skipping result calculation - missing exam or user data');
        console.log('Exam data:', exam);
        console.log('User data:', user);
        if (exam) {
          console.log('Exam course data:', exam.course);
        }
        if (user) {
          console.log('User class data:', user.class);
        }
      }
      
      setExamSubmitted(true);
      
      // Set submission result based on submission type
      if (isAutoSubmit) {
        console.log('Setting submission result to expired');
        setSubmissionResult('expired');
      } else {
        console.log('Setting submission result to success');
        setSubmissionResult('success');
      }
      
      // If it's an auto-submit due to time expiration, navigate back to dashboard after a delay
      if (isAutoSubmit) {
        console.log('Auto-submit due to time expiration, will navigate to dashboard');
        setTimeout(() => {
          console.log('Navigating to dashboard after time expiration');
          navigate('/student');
        }, 3000); // Show message for 3 seconds before navigating
      }
    } catch (err) {
      console.error('Error during exam submission:', err);
      setError(err.message);
    } finally {
      setIsSubmitting(false); // Clear submission flag
      console.log('Finished exam submission process');
    }
  };

  // Format time as MM:SS
  const formatTime = (seconds) => {
    if (seconds < 0) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    // Check if it's a "not available yet" error
    const isNotAvailableError = error.includes('not available yet');
    // Check if it's a "no longer available" error
    const isNoLongerAvailableError = error.includes('no longer available');
    
    return (
      <div className="p-6">
        <div className={`border-l-4 p-4 rounded ${
          isNotAvailableError ? 'bg-yellow-100 border-yellow-500 text-yellow-700' : 
          isNoLongerAvailableError ? 'bg-red-100 border-red-500 text-red-700' : 
          'bg-red-100 border-red-500 text-red-700'
        }`}>
          <p>{error}</p>
          <button 
            onClick={() => navigate('/student')}
            className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="p-6">
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded">
          <p>Exam not found.</p>
          <button 
            onClick={() => navigate('/student')}
            className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <button 
          onClick={() => navigate('/student')}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
        >
          <FaArrowLeft className="mr-2" />
          Back to Dashboard
        </button>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{exam.title}</h1>
              <p className="text-gray-600 mt-1">Course: {exam.course?.subject || 'N/A'}</p>
            </div>
            
            <div className="mt-4 md:mt-0 flex items-center space-x-4">
              <div className="flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                <FaClock className="mr-2" />
                <span className="font-medium">
                  {examStarted ? formatTime(timeLeft) : 'Waiting for start time...'}
                </span>
              </div>
  
              {examStarted && !examSubmitted && (
                <button
                  onClick={() => {
                    console.log('Manual submit button clicked (top button)');
                    handleSubmitExam();
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center"
                >
                  <FaSave className="mr-2" />
                  Submit Exam
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {!examStarted && !examSubmitted && (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Waiting for Exam to Start</h2>
          <p className="text-gray-600 mb-6">
            This exam will start automatically at the scheduled time. Please wait...
          </p>
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      )}
      
      {examSubmitted && (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            {submissionResult === 'expired' 
              ? 'Exam Time Ended' 
              : 'Exam Submitted Successfully!'}
          </h2>
          <p className="text-gray-600 mb-6">
            {submissionResult === 'expired' 
              ? 'The exam time has ended. Your answers have been automatically saved for evaluation.' 
              : 'Your exam has been submitted successfully.'}
          </p>
          {submissionResult === 'expired' && (
            <p className="text-blue-600 mb-4">Redirecting to dashboard...</p>
          )}
          <button
            onClick={() => navigate('/student')}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg"
          >
            Back to Dashboard
          </button>
        </div>
      )}
      
      {examStarted && !examSubmitted && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Instructions</h2>
            <ul className="list-disc pl-5 space-y-2 text-gray-600">
              <li>You have {exam.duration} minutes to complete this exam</li>
              <li>Select the best answer for each question</li>
              <li>Your answers are automatically saved as you select them</li>
              <li>The exam will auto-submit when time expires</li>
              <li>Click "Submit Exam" when you're finished</li>
            </ul>
          </div>
          
          <div className="space-y-6">
            {questions.map((question, index) => (
              <div key={question._id} className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-medium text-gray-800 mb-4">
                  {index + 1}. {question.questionText}
                </h3>
                
                <div className="space-y-3">
                  {['A', 'B', 'C', 'D'].map(option => {
                    const optionText = question[`option${option}`];
                    return (
                      <div 
                        key={option}
                        className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                          studentAnswers[question._id] === option 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => {
                          handleAnswerSelect(question._id, option);
                          saveAnswer(question._id, option);
                        }}
                      >
                        <div className="flex items-center">
                          <div className={`w-6 h-6 rounded-full border flex items-center justify-center mr-3 ${
                            studentAnswers[question._id] === option 
                              ? 'border-blue-500 bg-blue-500 text-white' 
                              : 'border-gray-300'
                          }`}>
                            {studentAnswers[question._id] === option && <FaCheck className="text-xs" />}
                          </div>
                          <span className="font-medium mr-2">{option}.</span>
                          <span>{optionText}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="mt-4 flex justify-end">
                  <div className="flex items-center">
                    {savingStatus[question._id] === 'saving' && (
                      <span className="text-blue-500 text-sm mr-2">Saving...</span>
                    )}
                    {savingStatus[question._id] === 'saved' && (
                      <span className="text-green-500 text-sm mr-2">Saved!</span>
                    )}
                    {savingStatus[question._id] === 'error' && (
                      <span className="text-red-500 text-sm mr-2">Error saving</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-gray-600">
                  Answered: {Object.values(studentAnswers).filter(a => a).length} / {questions.length}
                </p>
                {!allQuestionsAnswered && (
                  <p className="text-yellow-600 text-sm mt-1">
                    Please answer all questions before submitting
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  console.log('Manual submit button clicked');
                  handleSubmitExam();
                }}
                disabled={!allQuestionsAnswered}
                className={`px-6 py-3 rounded-lg flex items-center ${
                  allQuestionsAnswered 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <FaSave className="mr-2" />
                Submit Exam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentExamPage;