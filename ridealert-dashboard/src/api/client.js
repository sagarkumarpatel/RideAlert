import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getFleetSummary = async () => {
  const response = await client.get('/fleet/summary');
  return response.data;
};

export const getDriverFatigueTrend = async (driverId) => {
  const response = await client.get(`/drivers/${driverId}/fatigue-trend`);
  return response.data;
};

export default client;
