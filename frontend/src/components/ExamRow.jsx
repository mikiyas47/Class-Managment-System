import { useState, useEffect } from 'react';

const ExamRow = ({ exam, examEndTime, navigate }) => {
  console.log('=== ExamRow Component Render ===');
  console.log('Exam prop:', exam);
  console.log('Exam end time prop:', examEndTime);
  
  const [timeRemaining, setTimeRemaining] = useState(() => {
    const now = new Date();
    console.log('=== ExamRow useState initialization ===');
    console.log('Current time:', now);
    console.log('Exam end time:', examEndTime);
    const remaining = Math.max(0, Math.floor((examEndTime - now) / 1000));
    console.log('Initial time remaining (seconds):', remaining);
    return remaining;
  });

  useEffect(() => {
    console.log('=== ExamRow useEffect triggered ===');
    console.log('Exam end time in useEffect:', examEndTime);
    
    const timer = setInterval(() => {
      const now = new Date();
      const remaining = Math.max(0, Math.floor((examEndTime - now) / 1000));
      console.log(`Timer tick - Now: ${now}, End time: ${examEndTime}, Remaining: ${remaining}`);
      setTimeRemaining(remaining);
      
      // If time is up, we might want to refresh the exams list
      if (remaining === 0) {
        console.log('Exam time is up, clearing timer');
        clearInterval(timer);
      }
    }, 1000);

    return () => {
      console.log('Clearing timer for exam:', exam._id);
      clearInterval(timer);
    };
  }, [examEndTime]);

  const isExamAvailable = () => {
    const now = new Date();
    const startTime = new Date(exam.startTime);
    // Adjust for Nairobi timezone (UTC+3)
    const startTimeAdjusted = new Date(startTime.getTime() + 3 * 60 * 60 * 1000);
    const isAvailable = now >= startTimeAdjusted;
    console.log('Checking exam availability:');
    console.log('  Current time:', now);
    console.log('  Exam start time (raw):', startTime);
    console.log('  Exam start time (adjusted):', startTimeAdjusted);
    console.log('  Is available:', isAvailable);
    return isAvailable;
  };

  const isExamEnded = () => {
    const now = new Date();
    const endTime = new Date(examEndTime);
    const isEnded = now > endTime;
    console.log('Checking if exam has ended:');
    console.log('  Current time:', now);
    console.log('  Exam end time:', endTime);
    console.log('  Is ended:', isEnded);
    return isEnded;
  };

  // Format time remaining as MM:SS
  const formatTime = (seconds) => {
    console.log('Formatting time remaining:', seconds);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    console.log('Formatted time remaining:', formatted);
    return formatted;
  };

  // Format date in a consistent way
  const formatNairobiDate = (dateString) => {
    console.log('Formatting date:', dateString);
    const date = new Date(dateString);
    console.log('Parsed date:', date);
    // Adjust for Nairobi timezone (UTC+3)
    const nairobiTime = new Date(date.getTime() + 3 * 60 * 60 * 1000);
    console.log('Nairobi time:', nairobiTime);
  
    const year = nairobiTime.getFullYear();
    const month = String(nairobiTime.getMonth() + 1).padStart(2, '0');
    const day = String(nairobiTime.getDate()).padStart(2, '0');
    const formatted = `${year}-${month}-${day}`;
    console.log('Formatted date:', formatted);
    return formatted;
  };

  // Format time in a consistent way
  const formatNairobiTime = (dateString) => {
    console.log('Formatting time:', dateString);
    const date = new Date(dateString);
    console.log('Parsed time:', date);
    // Adjust for Nairobi timezone (UTC+3)
    const nairobiTime = new Date(date.getTime() + 3 * 60 * 60 * 1000);
    console.log('Nairobi time:', nairobiTime);
  
    const hours = String(nairobiTime.getHours()).padStart(2, '0');
    const minutes = String(nairobiTime.getMinutes()).padStart(2, '0');
    const formatted = `${hours}:${minutes}`;
    console.log('Formatted time:', formatted);
    return formatted;
  };

  const handleStartExam = () => {
    console.log('Starting exam:', exam._id);
    console.log('Navigating to:', `/student/exam/${exam._id}`);
    navigate(`/student/exam/${exam._id}`);
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
        {(() => {
          const available = isExamAvailable();
          const ended = isExamEnded();
          console.log('Button rendering logic:');
          console.log('  Exam available:', available);
          console.log('  Exam ended:', ended);
          
          if (!available) {
            console.log('Rendering: Not available yet');
            return (
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">
                Not available yet
              </span>
            );
          }
          
          if (ended) {
            console.log('Rendering: Ended');
            return (
              <span className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm">
                Ended
              </span>
            );
          }
          
          console.log('Rendering: Start Exam button');
          return (
            <button
              onClick={handleStartExam}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
            >
              Start Exam
            </button>
          );
        })()}
      </td>
    </tr>
  );
};

export default ExamRow;