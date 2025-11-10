const fs = require('fs');

// Read the test CSV files
const studentData = fs.readFileSync('test_duplicate_students.csv', 'utf8');
const teacherData = fs.readFileSync('test_duplicate_teachers.csv', 'utf8');

console.log('Student CSV Data:');
console.log(studentData);
console.log('\nTeacher CSV Data:');
console.log(teacherData);