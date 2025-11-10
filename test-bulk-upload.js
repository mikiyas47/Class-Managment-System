const fs = require('fs');
const path = require('path');

// Read the test CSV file
const csvFilePath = path.join(__dirname, 'test-duplicate-students.csv');
const csvData = fs.readFileSync(csvFilePath);

// Create form data
const FormData = require('form-data');
const form = new FormData();
form.append('file', csvData, {
  filename: 'test-duplicate-students.csv',
  contentType: 'text/csv'
});
form.append('departmentId', '6907a127098a31e2db739d5f');
form.append('classId', '6909af26d63a31d191a1c952');

// Make the request
const axios = require('axios');

axios.post('http://localhost:5000/api/students/bulk-upload', form, {
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NzM0ZjFjMzQxYzY0YjNiY2Y0ZjY1Y2QiLCJ1c2VyVHlwZSI6ImFkbWluIiwiaWF0IjoxNzMxMjQ4Mzg3fQ.5JhF5p5p5p5p5p5p5p5p5p5p5p5p5p5p5p5p5p5p5p5',
    ...form.getHeaders()
  }
})
.then(response => {
  console.log('Response:', response.data);
})
.catch(error => {
  console.error('Error:', error.response ? error.response.data : error.message);
});