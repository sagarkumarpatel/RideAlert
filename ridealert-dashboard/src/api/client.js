import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout on expired/invalid token
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      console.warn('Auth token expired or invalid. Redirecting to login.');
      localStorage.removeItem('adminToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const getFleetSummary = async (date) => {
  const url = date ? `/fleet/summary?date=${date}` : '/fleet/summary';
  const response = await client.get(url);
  return response.data;
};

export const getDriverFatigueTrend = async (driverId, date) => {
  const url = date ? `/drivers/${driverId}/fatigue-trend?date=${date}` : `/drivers/${driverId}/fatigue-trend`;
  const response = await client.get(url);
  return response.data;
};

export const getDriverOverview = async (driverId, date) => {
  const url = date ? `/drivers/${driverId}/overview?date=${date}` : `/drivers/${driverId}/overview`;
  const response = await client.get(url);
  return response.data;
};

export const getMapIncidents = async (date) => {
  const url = date ? `/fleet/incidents?date=${date}` : '/fleet/incidents';
  const response = await client.get(url);
  return response.data;
};

export const getDrivers = async () => {
  const response = await client.get('/fleet/drivers');
  return response.data;
};

export const deleteOldData = async () => {
  const response = await client.delete('/fleet/data/old');
  return response.data;
};

export const deleteDriver = async (driverId) => {
  const response = await client.delete(`/drivers/${driverId}`);
  return response.data;
};

export const addDriver = async (driverData) => {
  const response = await client.post('/drivers', driverData);
  return response.data;
};

export default client;
