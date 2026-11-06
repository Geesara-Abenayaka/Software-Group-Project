import axios from 'axios';
import { authHeaders, endAdminSession } from './adminSession';

// axios for admin API routes (the Settings page uses axios): adds the session and handles "session ended",
// the same as adminFetch.
const adminAxios = axios.create();

adminAxios.interceptors.request.use((config) => {
  Object.entries(authHeaders()).forEach(([name, value]) => config.headers.set(name, value));
  return config;
});

adminAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      endAdminSession();
    }
    return Promise.reject(error);
  }
);

export default adminAxios;
