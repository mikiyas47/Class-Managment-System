// Test script to check student courses API endpoint
// Use the built-in fetch API (Node.js 18+)

// Use the actual student ID from the database
const studentId = '6909b3e8727fe5edcae7bb0d';

// Test the API endpoint
const testStudentCourses = async () => {
  try {
    console.log(`Testing courses for student ID: ${studentId}`);
    
    // Make a request to test the API endpoint
    const response = await fetch(`http://localhost:5000/api/students/${studentId}/courses`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Courses data:', JSON.stringify(data, null, 2));
    } else {
      console.log(`Error: ${response.status} ${response.statusText}`);
      const errorData = await response.text();
      console.log('Error data:', errorData);
    }
  } catch (error) {
    console.error('Error testing student courses:', error);
  }
};

testStudentCourses();