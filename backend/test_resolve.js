const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

async function runTest() {
  try {
    // 1. Register Citizen
    console.log('Registering citizen...');
    await axios.post('http://localhost:5000/api/auth/register', {
      name: 'Test Citizen',
      email: 'citizen_resolve_3@test.com',
      password: 'password123'
    });
    
    // Bypass OTP by manually updating DB
    const { Client } = require('pg');
    const dbClient = new Client({connectionString: 'postgresql://postgres:Saipavan1475!@localhost:5432/roadwatch'});
    await dbClient.connect();
    await dbClient.query("UPDATE users SET is_verified = true WHERE email = 'citizen_resolve_3@test.com'");
    
    // Login Citizen
    const citizenRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'citizen_resolve_3@test.com',
      password: 'password123'
    });
    const citizenToken = citizenRes.data.data.token;
    console.log('Citizen logged in.');

    // 2. Create fake image
    const dummyImgPath = path.join(__dirname, 'dummy_pothole.jpg');
    fs.writeFileSync(dummyImgPath, 'fake image data');

    // 3. Report Complaint
    console.log('Reporting complaint...');
    const form1 = new FormData();
    form1.append('latitude', '12.9716');
    form1.append('longitude', '77.5946');
    form1.append('title', 'Big Pothole Test');
    form1.append('issue_type', 'pothole');
    form1.append('image', fs.createReadStream(dummyImgPath));

    const reportRes = await axios.post('http://localhost:5000/api/complaints', form1, {
      headers: { ...form1.getHeaders(), Authorization: `Bearer ${citizenToken}` }
    });
    const complaintId = reportRes.data.data.complaint.id;
    console.log(`Complaint created: ${complaintId}`);

    // 4. Register Authority
    console.log('Registering authority...');
    await axios.post('http://localhost:5000/api/auth/register', {
      name: 'Authority User',
      email: 'authority_resolve_3@test.com',
      password: 'password123',
      role: 'authority'
    });

    await dbClient.query("UPDATE users SET is_verified = true WHERE email = 'authority_resolve_3@test.com'");
    await dbClient.end();

    const authRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'authority_resolve_3@test.com',
      password: 'password123'
    });
    const authToken = authRes.data.data.token;

    // 5. Assign Complaint
    console.log('Assigning complaint...');
    await axios.patch(`http://localhost:5000/api/authority/complaints/${complaintId}/assign`, {
      notes: 'Assigned to self'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    // 6. Resolve Complaint
    console.log('Resolving complaint...');
    const form2 = new FormData();
    form2.append('resolved_image', fs.createReadStream(dummyImgPath));
    form2.append('notes', 'Fixed the pothole!');

    await axios.post(`http://localhost:5000/api/authority/complaints/${complaintId}/resolve`, form2, {
      headers: { ...form2.getHeaders(), Authorization: `Bearer ${authToken}` }
    });
    console.log('Resolved successfully!');

    // Clean up
    fs.unlinkSync(dummyImgPath);

  } catch (err) {
    console.error('Test failed:', err.response ? err.response.data : err.message);
  }
}

runTest();
