import { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaSave, FaTimes, FaQuestionCircle } from 'react-icons/fa';

const QuestionsPage = ({ user }) => {
  const [questions, setQuestions] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [formData, setFormData] = useState({
    exam: '',
    questions: [
      {
        questionText: '',
        optionA: '',
        optionB: '',
        optionC: '',
        optionD: '',
        correctOption: 'A',
        weight: '1'
      }
    ]
  });

  useEffect(() => {
    fetchQuestions();
    fetchTeacherExams();
  }, [user]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`http://localhost:5000/api/questions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch questions');
      }

      const data = await response.json();
      setQuestions(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch only exams that the teacher created
  const fetchTeacherExams = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`http://localhost:5000/api/exams?teacher=${user._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch teacher exams');
      }

      const data = await response.json();
      setExams(data.data || []);
    } catch (err) {
      console.error('Error fetching teacher exams:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleQuestionChange = (index, field, value) => {
    const updatedQuestions = [...formData.questions];
    updatedQuestions[index][field] = value;
    setFormData({
      ...formData,
      questions: updatedQuestions
    });
  };

  const addQuestion = () => {
    setFormData({
      ...formData,
      questions: [
        ...formData.questions,
        {
          questionText: '',
          optionA: '',
          optionB: '',
          optionC: '',
          optionD: '',
          correctOption: 'A'
        }
      ]
    });
  };

  const removeQuestion = (index) => {
    if (formData.questions.length <= 1) return;
    
    const updatedQuestions = [...formData.questions];
    updatedQuestions.splice(index, 1);
    setFormData({
      ...formData,
      questions: updatedQuestions
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate that the selected exam is one the teacher created
    const isValidExam = exams.some(exam => exam._id === formData.exam);
    if (!isValidExam) {
      setError('Please select a valid exam that you created');
      return;
    }
    
    // Validate that all questions have required fields
    for (let i = 0; i < formData.questions.length; i++) {
      const q = formData.questions[i];
      if (!q.questionText || !q.optionA || !q.optionB || !q.optionC || !q.optionD) {
        setError(`Please fill in all fields for question ${i + 1}`);
        return;
      }
    }
    
    try {
      const token = localStorage.getItem('token');
      
      // Create all questions
      const createdQuestions = [];
      for (const question of formData.questions) {
        const response = await fetch('http://localhost:5000/api/questions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            exam: formData.exam,
            questionText: question.questionText,
            optionA: question.optionA,
            optionB: question.optionB,
            optionC: question.optionC,
            optionD: question.optionD,
            correctOption: question.correctOption,
            weight: question.weight ? parseFloat(question.weight) : 1
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to save question');
        }

        const data = await response.json();
        createdQuestions.push(data.data);
      }

      // Reset form and refresh data
      setFormData({
        exam: '',
        questions: [
          {
            questionText: '',
            optionA: '',
            optionB: '',
            optionC: '',
            optionD: '',
            correctOption: 'A'
          }
        ]
      });
      setEditingQuestion(null);
      setShowForm(false);
      fetchQuestions();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (question) => {
    // Verify that the question's exam is one the teacher created
    const isValidExam = exams.some(exam => 
      exam._id === (question.exam._id || question.exam)
    );
    
    if (!isValidExam) {
      setError('This question is for an exam you did not create');
      return;
    }
    
    setEditingQuestion(question);
    setFormData({
      exam: question.exam._id || question.exam,
      questions: [
        {
          questionText: question.questionText,
          optionA: question.optionA,
          optionB: question.optionB,
          optionC: question.optionC,
          optionD: question.optionD,
          correctOption: question.correctOption,
          weight: question.weight ? question.weight.toString() : '1'
        }
      ]
    });
    setShowForm(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    
    if (!editingQuestion) return;
    
    // Validate that the selected exam is one the teacher created
    const isValidExam = exams.some(exam => exam._id === formData.exam);
    if (!isValidExam) {
      setError('Please select a valid exam that you created');
      return;
    }
    
    // Validate that the question has required fields
    const q = formData.questions[0];
    if (!q.questionText || !q.optionA || !q.optionB || !q.optionC || !q.optionD) {
      setError('Please fill in all fields');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`http://localhost:5000/api/questions/${editingQuestion._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          exam: formData.exam,
          questionText: q.questionText,
          optionA: q.optionA,
          optionB: q.optionB,
          optionC: q.optionC,
          optionD: q.optionD,
          correctOption: q.correctOption,
          weight: q.weight !== undefined ? parseFloat(q.weight) : undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update question');
      }

      // Reset form and refresh data
      setFormData({
        exam: '',
        questions: [
          {
            questionText: '',
            optionA: '',
            optionB: '',
            optionC: '',
            optionD: '',
            correctOption: 'A'
          }
        ]
      });
      setEditingQuestion(null);
      setShowForm(false);
      fetchQuestions();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (questionId) => {
    if (!window.confirm('Are you sure you want to delete this question?')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`http://localhost:5000/api/questions/${questionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete question');
      }

      fetchQuestions();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancel = () => {
    setFormData({
      exam: '',
      questions: [
        {
          questionText: '',
          optionA: '',
          optionB: '',
          optionC: '',
          optionD: '',
          correctOption: 'A'
        }
      ]
    });
    setEditingQuestion(null);
    setShowForm(false);
  };

  const getExamInfo = (examId) => {
    const exam = exams.find(e => e._id === examId || e._id === examId._id);
    if (!exam) return 'Unknown Exam';
    
    return exam.title;
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
          onClick={() => {
            setError(null);
            fetchQuestions();
            fetchTeacherExams();
          }}
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
          <h1 className="text-3xl font-bold text-gray-800">Questions</h1>
          <p className="text-gray-600 mt-2">Manage your exam questions</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="mt-4 md:mt-0 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
        >
          <FaPlus className="mr-2" />
          {editingQuestion ? 'Edit Question' : 'Create Questions'}
        </button>
      </div>

      {/* Question Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            {editingQuestion ? 'Edit Question' : 'Create Multiple Questions'}
          </h2>
          <form onSubmit={editingQuestion ? handleUpdate : handleSubmit}>
            {!editingQuestion && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Exam *
                </label>
                <select
                  name="exam"
                  value={formData.exam}
                  onChange={handleInputChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select an exam</option>
                  {exams.map((exam) => (
                    <option key={exam._id} value={exam._id}>
                      {exam.title} - {exam.class?.year ? `Year ${exam.class.year}` : ''} {exam.class?.semester ? `Semester ${exam.class.semester}` : ''}
                    </option>
                  ))}
                </select>
                {exams.length === 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    You don't have any exams created. Please create an exam first.
                  </p>
                )}
              </div>
            )}
            
            <div className="space-y-8">
              {formData.questions.map((question, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-800">
                      Question {editingQuestion ? '' : index + 1}
                    </h3>
                    {!editingQuestion && formData.questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQuestion(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <FaTrash />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Question Text *
                      </label>
                      <textarea
                        value={question.questionText}
                        onChange={(e) => handleQuestionChange(index, 'questionText', e.target.value)}
                        rows="3"
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter your question here..."
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Option A *
                        </label>
                        <input
                          type="text"
                          value={question.optionA}
                          onChange={(e) => handleQuestionChange(index, 'optionA', e.target.value)}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Option A"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Option B *
                        </label>
                        <input
                          type="text"
                          value={question.optionB}
                          onChange={(e) => handleQuestionChange(index, 'optionB', e.target.value)}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Option B"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Option C *
                        </label>
                        <input
                          type="text"
                          value={question.optionC}
                          onChange={(e) => handleQuestionChange(index, 'optionC', e.target.value)}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Option C"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Option D *
                        </label>
                        <input
                          type="text"
                          value={question.optionD}
                          onChange={(e) => handleQuestionChange(index, 'optionD', e.target.value)}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Option D"
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Correct Option *
                      </label>
                      <select
                        value={question.correctOption}
                        onChange={(e) => handleQuestionChange(index, 'correctOption', e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Question Weight
                      </label>
                      <input
                        type="number"
                        value={question.weight}
                        onChange={(e) => handleQuestionChange(index, 'weight', e.target.value)}
                        min="0"
                        step="0.1"
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., 1"
                      />
                      <p className="text-xs text-gray-500 mt-1">Points for this question (default: 1)</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {!editingQuestion && (
              <div className="mt-6">
                <button
                  type="button"
                  onClick={addQuestion}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg flex items-center transition-colors"
                >
                  <FaPlus className="mr-2" />
                  Add Another Question
                </button>
              </div>
            )}
            
            <div className="flex space-x-3 mt-6">
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
              >
                <FaSave className="mr-2" />
                {editingQuestion ? 'Update Question' : 'Create Questions'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg flex items-center transition-colors"
              >
                <FaTimes className="mr-2" />
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Questions List */}
      {questions.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-8 text-center">
          <FaQuestionCircle className="mx-auto text-gray-400 text-4xl" />
          <h3 className="text-xl font-semibold text-gray-800 mt-4">No Questions</h3>
          <p className="text-gray-600 mt-2">You haven't created any questions yet.</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Create Your First Question
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Question
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Exam
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Options
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Correct Answer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {questions.map((question) => (
                  <tr key={question._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 max-w-md truncate">
                        {question.questionText}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {getExamInfo(question.exam)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        <div>A: {question.optionA}</div>
                        <div>B: {question.optionB}</div>
                        <div>C: {question.optionC}</div>
                        <div>D: {question.optionD}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {question.correctOption}: {
                          question.correctOption === 'A' ? question.optionA :
                          question.correctOption === 'B' ? question.optionB :
                          question.correctOption === 'C' ? question.optionC :
                          question.optionD
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEdit(question)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(question._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <FaTrash />
                      </button>
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

export default QuestionsPage;