import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// if 401 or 403,redirect to login -- need to be implemented a bit differently, right now, this makeshift solution prevents user seeing errors in /login page
// api.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     if (error.response?.status === 401 || error.response?.status === 403) {
//       localStorage.removeItem('token');
//       delete api.defaults.headers.common['Authorization'];
//       window.location.href = '/login';
//     }
//     return Promise.reject(error);
//   }
// );

export default api;