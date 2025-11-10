import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Simple test to upload a file using fetch API
const testFileUpload = async () => {
  try {
    console.log('Testing file upload with fetch...');
    
    // Create FormData
    const formData = new FormData();
    formData.append('class', '6909af26d63a31d191a1c952');
    formData.append('teacher', '6909ab9872d541ea92b71965');
    
    // Add file to form data
    const testFilePath = path.join(__dirname, 'test_assignment.txt');
    const fileBuffer = fs.readFileSync(testFilePath);
    const blob = new Blob([fileBuffer], { type: 'text/plain' });
    formData.append('assignmentFile', blob, 'test_assignment.txt');
    
    // Send request
    const response = await fetch('http://localhost:5000/api/assignments', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    console.log('Upload result:', result);
  } catch (error) {
    console.error('Error uploading file:', error);
  }
};

testFileUpload();