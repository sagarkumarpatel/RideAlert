const axios = require('axios');
async function test() {
  try {
    const loginRes = await axios.post('http://localhost:3000/api/auth/admin-login', {
      email: 'admin@ridealert.com',
      password: 'admin123'
    });
    const token = loginRes.data.token;
    
    const res = await axios.get('http://localhost:3000/api/fleet/incidents?date=2026-09-14', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Events returned via API:', res.data.length);
    if(res.data.length > 0) {
      console.log('First event:', res.data[0]);
    }
  } catch(e) {
    console.log(e.response ? e.response.status : e.message);
  }
}
test();
