// Comprehensive test to verify the frontend logic
const testData = {
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

// Simulate the frontend logic
function simulateFrontendLogic(data, entityName) {
  console.log('Received response:', JSON.stringify(data, null, 2));
  
  // More robust error detection
  const hasErrors = data && data.status === 'error';
  const hasDataErrors = data && data.data && data.data.errors && data.data.errors.length > 0;
  const hasTopLevelErrors = data && data.errors && data.errors.length > 0;
  
  console.log('Has errors:', hasErrors);
  console.log('Has data errors:', hasDataErrors);
  console.log('Has top level errors:', hasTopLevelErrors);
  console.log('Data status:', data?.status);
  console.log('Data data errors:', data?.data?.errors);
  
  if (hasErrors || hasDataErrors || hasTopLevelErrors) {
    // Format error messages for better display
    // Handle both teacher and student error structures
    const errorSource = data.errors || (data.data && data.data.errors) || [];
    
    console.log('Error source:', errorSource);
    
    // Check if this is a student bulk upload with specific duplicate messages
    let errorMessages = '';
    if (entityName === 'student' && hasDataErrors) {
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
    } else if (data.data && data.data.duplicates && data.data.duplicates > 0) {
      // Handle the case where we have duplicates but in a different format
      if (data.data.errors && data.data.errors.length > 0) {
        errorMessages = data.data.errors.map(error => {
          if (typeof error === 'object' && error !== null) {
            if (error.check && error.found && error.duplicate) {
              return `${error.check}\n${error.found}\n${error.duplicate}`;
            } else if (error.message) {
              return error.message;
            } else {
              return JSON.stringify(error);
            }
          } else {
            return error;
          }
        }).join('\n\n');
      } else {
        errorMessages = `Found ${data.data.duplicates} duplicate student(s)`;
      }
    } else {
      // For other cases (teachers or older format), use the existing logic
      errorMessages = errorSource.map(error => {
        if (typeof error === 'string') {
          return error;
        } else if (error.error) {
          return `Row ${error.row || 'N/A'}: ${error.error}`;
        } else {
          return JSON.stringify(error);
        }
      }).join('\n');
    }
    
    console.log('Formatted error messages:');
    console.log(errorMessages);
    
    return {
      text: `Upload completed with ${errorSource.length || data.data?.duplicates || data.errorCount || 0} error(s):\n${errorMessages}`,
      type: 'error'
    };
  } else {
    console.log('No errors detected, showing success message');
    return {
      text: `Successfully uploaded ${data.addedCount || data.data?.created?.length || 0} ${entityName}(s).`,
      type: 'success'
    };
  }
}

// Test with the provided data
const result = simulateFrontendLogic(testData, 'student');
console.log('\n--- FINAL RESULT ---');
console.log('Message text:', result.text);
console.log('Message type:', result.type);