// API configuration - uses relative paths for production compatibility
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://18.189.3.216:5000/api';

export default API_BASE_URL;
