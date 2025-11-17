/* eslint-disable no-unused-vars */
import { useState, useEffect } from 'react';
import { FaPlus, FaClock, FaCalendarAlt, FaMapMarkerAlt, FaTrash, FaEdit, FaTimes, FaBook, FaChalkboard } from 'react-icons/fa';

const SchedulesPage = ({ user }) => {
  // Component state
  const [schedules, setSchedules] = useState([]);
  const [classes, setClasses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalError, setModalError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState(''); // Add class filter state
  const [filteredSchedules, setFilteredSchedules] = useState([]);
  
  const [formData, setFormData] = useState({
    class: '',
    course: '',
    roomNumber: '',
    dayOfWeek: 'Monday',
    startTime: '',
    endTime: ''
  });

  // Add new state variables for edit functionality
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);

  // Filter schedules based on search term and class filter
  const filterSchedules = (schedules, term) => {
    let filtered = schedules;
    
    // Apply class filter first
    if (classFilter) {
      filtered = filtered.filter(schedule => 
        schedule.class && schedule.class._id && schedule.class._id.toString() === classFilter
      );
    }
    
    // Apply search term filter
    if (term) {
      const lowerTerm = term.toLowerCase();
      filtered = filtered.filter(schedule => {
        return (
          (schedule.class?.year && schedule.class.year.toString().includes(term)) ||
          (schedule.class?.semester && schedule.class.semester.toLowerCase().includes(lowerTerm)) ||
          (schedule.course?.subject && schedule.course.subject.toLowerCase().includes(lowerTerm)) ||
          (schedule.roomNumber && schedule.roomNumber.toLowerCase().includes(lowerTerm)) ||
          (schedule.dayOfWeek && schedule.dayOfWeek.toLowerCase().includes(lowerTerm))
        );
      });
    }
    
    return filtered;
  };

  // Fetch schedules from API
  const fetchSchedules = async () => {
    try {
      console.log('Fetching schedules...');
      const response = await fetch('http://localhost:5000/api/schedules', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.error('Failed to fetch schedules:', response.status, response.statusText, errData);
        throw new Error(errData.message || 'Failed to fetch schedules');
      }
      
      const data = await response.json();
      console.log('Schedules data:', data);
      const schedulesList = data.data || [];
      
      setSchedules(schedulesList);
      setFilteredSchedules(filterSchedules(schedulesList, searchTerm));
    } catch (err) {
      console.error('Error fetching schedules:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch classes
  const fetchClasses = async () => {
    try {
      console.log('Fetching classes...');
      const response = await fetch('http://localhost:5000/api/classes', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Classes data:', data);
        setClasses(data.data || []);
      } else {
        console.error('Failed to fetch classes:', response.status, response.statusText);
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  // Fetch courses
  const fetchCourses = async () => {
    try {
      console.log('Fetching courses...');
      const response = await fetch('http://localhost:5000/api/courses', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Courses data:', data);
        setCourses(data.data || []);
      } else {
        console.error('Failed to fetch courses:', response.status, response.statusText);
      }
    } catch (err) {
      console.error('Error fetching courses:', err);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // When class is selected, filter courses for that class
    if (name === 'class') {
      // Reset course selection when class changes
      setFormData(prev => ({
        ...prev,
        course: ''
      }));
    }
  };

  // Filter courses based on selected class
  const getFilteredCourses = () => {
    if (!formData.class) return courses;
    
    // Filter courses that belong to the selected class
    return courses.filter(course => {
      // When courses are populated, course.class is an object with _id property
      if (course.class && typeof course.class === 'object' && course.class._id) {
        return course.class._id.toString() === formData.class;
      }
      
      // Fallback: if course.class is not populated, it might be just an ID
      if (course.class) {
        return course.class.toString() === formData.class;
      }
      
      return false;
    });
  };

  // Handle edit schedule
  const handleEditSchedule = async (scheduleData) => {
    try {
      // Clear any previous modal errors
      setModalError(null);
      
      // Set the form data to the schedule being edited
      setFormData({
        class: scheduleData.class._id || scheduleData.class,
        course: scheduleData.course._id || scheduleData.course,
        roomNumber: scheduleData.roomNumber,
        dayOfWeek: scheduleData.dayOfWeek,
        startTime: scheduleData.startTime,
        endTime: scheduleData.endTime
      });
      
      // Set the editing schedule and open the edit modal
      setEditingSchedule(scheduleData);
      setIsEditModalOpen(true);
    } catch (err) {
      console.error('Error editing schedule:', err);
      setModalError(err.message);
    }
  };

  // Handle update schedule
  const handleUpdateSchedule = async (e) => {
    e.preventDefault();
    
    try {
      // Clear any previous modal errors
      setModalError(null);
      
      // Validate required fields
      if (!formData.class || !formData.course || !formData.roomNumber || !formData.dayOfWeek || !formData.startTime || !formData.endTime) {
        throw new Error('All fields are required');
      }

      const response = await fetch(`http://localhost:5000/api/schedules/${editingSchedule._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to update schedule');
      }

      // Refresh the schedules list
      await fetchSchedules();
      setIsEditModalOpen(false);
      setEditingSchedule(null);
      // Reset form
      setFormData({
        class: '',
        course: '',
        roomNumber: '',
        dayOfWeek: 'Monday',
        startTime: '',
        endTime: ''
      });
    } catch (err) {
      console.error('Error updating schedule:', err);
      setModalError(err.message);
    }
  };

  // Handle delete schedule
  const handleDeleteSchedule = async (scheduleId) => {
    if (!window.confirm('Are you sure you want to delete this schedule? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:5000/api/schedules/${scheduleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to delete schedule');
      }

      // Refresh the schedules list
      await fetchSchedules();
    } catch (err) {
      console.error('Error deleting schedule:', err);
      setError(err.message);
      // Show error for a few seconds
      setTimeout(() => setError(null), 5000);
    }
  };

  // Add new schedule
  const handleAddSchedule = async (e) => {
    e.preventDefault();
    
    try {
      // Clear any previous modal errors
      setModalError(null);
      
      // Validate required fields
      if (!formData.class || !formData.course || !formData.roomNumber || !formData.dayOfWeek || !formData.startTime || !formData.endTime) {
        throw new Error('All fields are required');
      }

      const response = await fetch('http://localhost:5000/api/schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to add schedule');
      }

      // Refresh the schedules list
      await fetchSchedules();
      setIsModalOpen(false);
      // Reset form
      setFormData({
        class: '',
        course: '',
        roomNumber: '',
        dayOfWeek: 'Monday',
        startTime: '',
        endTime: ''
      });
    } catch (err) {
      console.error('Error adding schedule:', err);
      setModalError(err.message);
    }
  };

  // Close modal and clear errors
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalError(null);
  };

  // Close edit modal and clear errors
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingSchedule(null);
    setModalError(null);
    // Reset form
    setFormData({
      class: '',
      course: '',
      roomNumber: '',
      dayOfWeek: 'Monday',
      startTime: '',
      endTime: ''
    });
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

  // Update filtered schedules when search term, class filter, or schedules change
  useEffect(() => {
    setFilteredSchedules(filterSchedules(schedules, searchTerm));
  }, [searchTerm, classFilter, schedules]);

  // Initial data fetch
  useEffect(() => {
    fetchSchedules();
    fetchClasses();
    fetchCourses();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Display error message if there's an error
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
        <div className="flex flex-col space-y-4">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-800">Class Schedules</h1>
          
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Showing {filteredSchedules.length} of {schedules.length} schedules
            {searchTerm && (
              <span className="ml-2 text-black dark:text-black">
                (filtered by: "{searchTerm}")
              </span>
            )}
            {classFilter && (
              <span className="ml-2 text-black dark:text-black">
                (class filter applied)
              </span>
            )}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full items-start sm:items-end">
            <div className="flex-grow max-w-md">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search schedules..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
            
            {/* Class filter dropdown */}
            <div className="w-48">
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls._id} value={cls._id}>
                    Year {cls.year} - {cls.semester} Semester
                  </option>
                ))}
              </select>
            </div>
            
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center justify-center"
            >
              <FaPlus className="mr-2" /> Add Schedule
            </button>
          </div>
        </div>
      </div>

      {/* Schedules Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Class
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Course
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Room
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Day
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSchedules.length === 0 ? (
                <tr key="no-schedules" className="hover:bg-gray-50">
                  <td className="px-6 py-12 text-center" colSpan="6">
                    <div className="flex flex-col items-center justify-center">
                      <FaClock className="h-12 w-12 text-gray-400 mb-2" />
                      <p className="text-lg font-medium text-gray-900">
                        No schedules found
                      </p>
                      {searchTerm && (
                        <p className="text-sm text-gray-900 mt-1">
                          No schedules match your search "{searchTerm}"
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSchedules.map((schedule) => (
                  <tr key={schedule._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FaChalkboard className="mr-2 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">
                          Year {schedule.class?.year} - {schedule.class?.semester} Semester
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FaBook className="mr-2 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {schedule.course?.subject}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FaMapMarkerAlt className="mr-2 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {schedule.roomNumber}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FaCalendarAlt className="mr-2 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {schedule.dayOfWeek}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FaClock className="mr-2 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditSchedule(schedule)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                        title="Edit"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDeleteSchedule(schedule._id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Schedule Modal */}
      {(isModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                {isEditModalOpen ? 'Edit Schedule' : 'Add New Schedule'}
              </h2>
              <button 
                onClick={isEditModalOpen ? handleCloseEditModal : handleCloseModal}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <FaTimes />
              </button>
            </div>
            
            <form onSubmit={isEditModalOpen ? handleUpdateSchedule : handleAddSchedule} className="px-6 py-4">
              {modalError && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                  {modalError}
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Class *
                  </label>
                  <select
                    name="class"
                    value={formData.class}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Class</option>
                    {classes.map((cls) => (
                      <option key={cls._id} value={cls._id}>
                        Year {cls.year} - {cls.semester} Semester
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Course *
                  </label>
                  <select
                    name="course"
                    value={formData.course}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Course</option>
                    {getFilteredCourses().map((course) => (
                      <option key={course._id} value={course._id}>
                        {course.subject} ({course.code})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Room Number *
                  </label>
                  <input
                    type="text"
                    name="roomNumber"
                    value={formData.roomNumber}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter room number"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Day of Week *
                  </label>
                  <select
                    name="dayOfWeek"
                    value={formData.dayOfWeek}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                    <option value="Saturday">Saturday</option>
                    <option value="Sunday">Sunday</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Start Time *
                    </label>
                    <input
                      type="time"
                      name="startTime"
                      value={formData.startTime}
                      onChange={handleInputChange}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      End Time *
                    </label>
                    <input
                      type="time"
                      name="endTime"
                      value={formData.endTime}
                      onChange={handleInputChange}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={isEditModalOpen ? handleCloseEditModal : handleCloseModal}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
                >
                  {isEditModalOpen ? 'Update Schedule' : 'Add Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchedulesPage;