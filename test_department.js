async function testDepartmentCreation() {
  try {
    const response = await fetch('http://localhost:5000/api/departments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Physics',
        science: 'natural'
      })
    });

    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

testDepartmentCreation();