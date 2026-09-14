

async function test() {
  const rnd = Math.random().toString(36).substring(7);
  let res = await fetch('http://localhost:3000/api/auth/admin-signup', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ companyName: 'Test Fleet', email: `test_${rnd}@fleet.com`, username: `testadmin_${rnd}`, password: 'password123' })
  });
  let data = await res.json();
  console.log('Signup:', data);

  const token = data.token;
  if (!token) return;

  // 2. Create driver
  res = await fetch('http://localhost:3000/api/drivers', {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
    body: JSON.stringify({ 
      driverId: 'DRV-1234',
      name: 'Test Driver', 
      address: '123 Main St',
      personalContact: '555-0100',
      parentContact: '555-0101'
    })
  });
  data = await res.json();
  console.log('Driver:', data);
  const driverId = data.id;

  // 3. Create trip
  res = await fetch('http://localhost:3000/api/trips', {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
    body: JSON.stringify({ driverId })
  });
  data = await res.json();
  console.log('Trip:', data);
  const tripId = data.tripId;

  // 4. Emit fatigue event
  res = await fetch(`http://localhost:3000/api/trips/${tripId}/fatigue-events`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
    body: JSON.stringify({
      timestamp: new Date().toISOString(),
      fatigueLevel: 'CRITICAL',
      primarySignal: 'EYE_CLOSURE',
      lightCondition: 'DAY',
      eyeClosureScore: 0.9,
      driftScore: 0.1,
      latitude: 40.7128,
      longitude: -74.0060
    })
  });
  data = await res.json();
  console.log('Event:', data);
}

test();
