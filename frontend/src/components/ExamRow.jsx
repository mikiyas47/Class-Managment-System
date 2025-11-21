import { useState, useEffect } from 'react';

const ExamRow = ({ exam, examEndTime, navigate }) => {
  const [timeRemaining, setTimeRemaining] = useState(() => {
    const now = new Date();
    return Math.max(0, Math.floor((examEndTime - now) / 1000));
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const remaining = Math.max(0, Math.floor((examEndTime - now) / 1000));
      setTimeRemaining(remaining);
      
      // If time is up, we might want to refresh the exams list
      if (remaining === 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [examEndTime]);

  // Format time remaining as MM:SS
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Format date in a consistent way
  const formatNairobiDate = (dateString) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Format time in a consistent way
  const formatNairobiTime = (dateString) => {
    const date = new Date(dateString);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{exam.title}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{exam.course?.subject}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatNairobiDate(exam.startTime)}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatNairobiTime(exam.startTime)}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{exam.duration} minutes</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
          {formatTime(timeRemaining)}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        <button
          onClick={() => navigate(`/student/exam/${exam._id}`)}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
        >
          Start Exam
        </button>
      </td>
    </tr>
  );
};