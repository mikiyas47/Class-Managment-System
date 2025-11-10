import { useState, useEffect } from 'react';
import { FaBook, FaUsers, FaChalkboardTeacher, FaCalendarAlt } from 'react-icons/fa';

const MyClassesPage = ({ user }) => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTeacherClasses();
  }, [user]);

  const fetchTeacherClasses = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Fetch courses assigned to this teacher
      const response = await fetch(`http://localhost:5000/api/teachers/${user._id}/courses`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch classes');
      }

      const data = await response.json();
      
      // Fetch student count for each class
      const coursesWithStudentCount = await Promise.all(
        data.data.map(async (course) => {
          try {
            const classId = course.class._id || course.class;
            const studentResponse = await fetch(`http://localhost:5000/api/students/class/${classId}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (studentResponse.ok) {
              const studentData = await studentResponse.json();
              return {
                ...course,
                studentCount: studentData.count
              };
            } else {
              return {
                ...course,
                studentCount: 0
              };
            }
          } catch (err) {
            console.error('Error fetching student count for class:', err);
            return {
              ...course,
              studentCount: 0
            };
          }
        })
      );
      
      setClasses(coursesWithStudentCount);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getClassStats = (course) => {
    // Use actual student count from backend
    const studentCount = course.studentCount || 0;
    // Keep mock data for other stats for now
    return {
      studentCount: studentCount,
      assignments: Math.floor(Math.random() * 10) + 1,
      upcomingEvents: Math.floor(Math.random() * 5)
    };
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
          onClick={fetchTeacherClasses}
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
          <h1 className="text-3xl font-bold text-gray-800">My Classes</h1>
          <p className="text-gray-600 mt-2">View the courses you're teaching</p>
        </div>
      </div>

      {classes.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-8 text-center">
          <FaChalkboardTeacher className="mx-auto text-gray-400 text-4xl" />
          <h3 className="text-xl font-semibold text-gray-800 mt-4">No Classes Assigned</h3>
          <p className="text-gray-600 mt-2">You don't have any classes assigned to you yet.</p>
          <button className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg">
            Contact Administrator
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((course) => {
            const stats = getClassStats(course);
            return (
              <div key={course._id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-white font-bold text-lg">{course.subject || 'Untitled Course'}</h3>
                      <p className="text-blue-100 text-sm">{course.code || 'N/A'}</p>
                    </div>
                    <div className="bg-white bg-opacity-20 rounded-full p-2">
                      <FaBook className="text-white" />
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center text-gray-600 text-sm mb-3">
                    <FaCalendarAlt className="mr-2" />
                    <span>Mon, Wed, Fri • 9:00 AM - 10:30 AM</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="bg-blue-50 rounded-lg p-2 text-center">
                      <div className="flex items-center justify-center">
                        <FaUsers className="text-blue-500 mr-1" />
                        <span className="text-blue-700 font-semibold">{stats.studentCount}</span>
                      </div>
                      <p className="text-xs text-gray-500">Students</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-2 text-center">
                      <div className="text-green-700 font-semibold">{stats.assignments}</div>
                      <p className="text-xs text-gray-500">Assignments</p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-2 text-center">
                      <div className="text-yellow-700 font-semibold">{stats.upcomingEvents}</div>
                      <p className="text-xs text-gray-500">Events</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button className="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-700 py-2 px-3 rounded-lg text-sm font-medium transition-colors">
                      View Details
                    </button>
                    <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-3 rounded-lg text-sm font-medium transition-colors">
                      Manage
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyClassesPage;