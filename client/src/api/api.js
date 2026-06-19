import axios from 'axios';

const API_BASE = 'https://api-sort-my-scene.vercel.app/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

// Attach token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const registerUser = (data) => api.post('/auth/register', data);
export const loginUser = (data) => api.post('/auth/login', data);

// Events
export const getEvents = () => api.get('/events');
export const getEventById = (id) => api.get(`/events/${id}`);

// Reserve
export const reserveSeats = (data) => api.post('/reserve', data);

// Book
export const createBooking = (data) => api.post('/bookings', data);

// My Tickets
export const getMyTickets = () => api.get('/my-tickets');

export default api;
