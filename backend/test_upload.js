import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Simple test to verify file upload
const testUpload = async () => {
  try {
    // We'll use a simple approach to test the upload
    console.log('Testing assignment upload...');
    
    // Check if test file exists
    const testFilePath = path.join(__dirname, 'test_assignment.txt');
    if (!fs.existsSync(testFilePath)) {
      console.log('Test file not found');
      return;
    }
    
    console.log('Test file found, ready for upload');
    console.log('Please use the HTML form or a tool like Postman to test the upload');
    console.log('Form fields needed:');
    console.log('- class: 6909af26d63a31d191a1c952');
    console.log('- teacher: 6909ab9872d541ea92b71965');
    console.log('- assignmentFile: the file to upload');
  } catch (error) {
    console.error('Error:', error);
  }
};

testUpload();