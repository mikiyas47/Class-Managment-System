// Test script to simulate the response format
const sampleResponse = {
  "message": "0 students created successfully",
  "data": {
    "created": [],
    "duplicates": 2,
    "errors": [
      {
        "check": "Checking for duplicate student: ST001, john@example.com, 1234567890",
        "found": "Existing student found: Yes",
        "duplicate": "Duplicate found: Student with user ID ST001 already exists",
        "message": "Student with user ID ST001 already exists"
      },
      {
        "check": "Checking for duplicate student: ST002, jane@example.com, 9876543210",
        "found": "Existing student found: Yes",
        "duplicate": "Duplicate found: Student with user ID ST002 already exists",
        "message": "Student with user ID ST002 already exists"
      }
    ]
  },
  "status": "error"
};

console.log("Sample response:", JSON.stringify(sampleResponse, null, 2));

// Test the frontend logic
const data = sampleResponse;
const entityName = 'student';

// Check if this is a student bulk upload with specific duplicate messages
let errorMessages = '';
if (entityName === 'student' && data.data && data.data.errors && data.data.errors.length > 0) {
  // For students, show the detailed duplicate information
  errorMessages = data.data.errors.map(error => {
    if (typeof error === 'object' && error !== null) {
      // If it's the new detailed error object with check, found, and duplicate properties
      if (error.check && error.found && error.duplicate) {
        return `${error.check}\n${error.found}\n${error.duplicate}`;
      } else if (error.message) {
        return error.message;
      } else {
        return JSON.stringify(error);
      }
    } else if (typeof error === 'string' && error.includes('Student with')) {
      // Extract the duplicate information from the backend message
      return error;
    } else if (typeof error === 'string') {
      return error;
    } else {
      return JSON.stringify(error);
    }
  }).join('\n\n');
}

console.log("Formatted error messages:");
console.log(errorMessages);