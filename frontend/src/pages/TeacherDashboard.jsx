import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TeacherDashboardComponent from '../components/TeacherDashboard';

const TeacherDashboard = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    // Fetch teacher's courses and announcements
    const fetchTeacherData = async () => {
      try {
        const token = localStorage.getItem('token');
        
        // Fetch teacher's courses
        const coursesRes = await fetch(`http://localhost:5000/api/teachers/${user._id}/courses`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (coursesRes.ok) {
          const coursesData = await coursesRes.json();
          setCourses(coursesData.data || []);
        }

        // Fetch announcements
        const announcementsRes = await fetch('http://localhost:5000/api/announcements', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (announcementsRes.ok) {
          const announcementsData = await announcementsRes.json();
          setAnnouncements(announcementsData.data || []);
        }
      } catch (error) {
        console.error('Error fetching teacher data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherData();
  }, [user._id]);

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  // Pass the fetched data to the enhanced TeacherDashboard component
  return (
    <TeacherDashboardComponent 
      user={user} 
      onLogout={handleLogout} 
      courses={courses}
      announcements={announcements}
      loading={loading}
    />
  );
};

export default TeacherDashboard;