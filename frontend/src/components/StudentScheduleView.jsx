import { useState, useEffect } from 'react';
import { FaCalendarAlt, FaClock, FaMapMarkerAlt, FaBook, FaChalkboard } from 'react-icons/fa';

const StudentScheduleView = ({ studentId, token }) => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch student schedules
  const fetchSchedules = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/students/${studentId}/schedules`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch schedules');
      }
      
      const data = await response.json();
      setSchedules(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Format time for display
  const formatTime = (time) => {
    if (!time) return '';
    // Convert 24-hour format to 12-hour format
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes} ${ampm}`;
  };

  // Get day order for sorting (Monday = 0, Sunday = 6)
  const getDayOrder = (day) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return days.indexOf(day);
  };

  // Sort schedules by day and time
  const sortedSchedules = [...schedules].sort((a, b) => {
    const dayComparison = getDayOrder(a.dayOfWeek) - getDayOrder(b.dayOfWeek);
    if (dayComparison !== 0) return dayComparison;
    
    // If same day, sort by start time
    const [aHours, aMinutes] = a.startTime.split(':').map(Number);
    const [bHours, bMinutes] = b.startTime.split(':').map(Number);
    const aTotalMinutes = aHours * 60 + aMinutes;
    const bTotalMinutes = bHours * 60 + bMinutes;
    
    return aTotalMinutes - bTotalMinutes;
  });

  // Group schedules by day
  const groupSchedulesByDay = () => {
    const grouped = {};
    sortedSchedules.forEach(schedule => {
      if (!grouped[schedule.dayOfWeek]) {
        grouped[schedule.dayOfWeek] = [];
      }
      grouped[schedule.dayOfWeek].push(schedule);
    });
    return grouped;
  };

  const groupedSchedules = groupSchedulesByDay();

  // Initial data fetch
  useEffect(() => {
    if (studentId && token) {
      fetchSchedules();
    }
  }, [studentId, token]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">My Class Schedule</h1>
        <p className="text-sm text-gray-600">
          Showing {schedules.length} scheduled classes for your class
        </p>
      </div>

      {schedules.length === 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden p-8 text-center">
          <FaCalendarAlt className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No schedules found</h3>
          <p className="text-gray-500">
            There are currently no schedules for your class. Please check back later.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {Object.keys(groupedSchedules).map(day => (
            <div key={day} className="border-b border-gray-200 last:border-b-0">
              <div className="bg-gray-50 px-6 py-3">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                  <FaCalendarAlt className="mr-2 text-blue-500" />
                  {day}
                </h2>
              </div>
              <div className="divide-y divide-gray-100">
                {groupedSchedules[day].map((schedule) => (
                  <div key={schedule._id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <FaBook className="mr-2 text-gray-500" />
                          <h3 className="text-lg font-medium text-gray-900">
                            {schedule.course?.subject || 'Course'}
                          </h3>
                        </div>
                        <div className="flex flex-wrap gap-4 mt-2">
                          <div className="flex items-center text-sm text-gray-600">
                            <FaClock className="mr-1.5 text-gray-400" />
                            <span>
                              {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                            </span>
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <FaMapMarkerAlt className="mr-1.5 text-gray-400" />
                            <span>Room {schedule.roomNumber}</span>
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <FaChalkboard className="mr-1.5 text-gray-400" />
                            <span>
                              Year {schedule.class?.year} - {schedule.class?.semester} Semester
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentScheduleView;