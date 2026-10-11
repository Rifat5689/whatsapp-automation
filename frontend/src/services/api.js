import axios from 'axios';

const client = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1', withCredentials: true, timeout: 15000 });
client.interceptors.request.use((config) => { const token = localStorage.getItem('rifat-token'); if (token) config.headers.Authorization = `Bearer ${token}`; return config; });

const api = async (path, options = {}) => {
  try {
    const response = await client.request({ url: path, method: options.method || 'GET', data: options.body instanceof FormData ? options.body : options.body ? JSON.parse(options.body) : undefined, headers: options.headers });
    return response.data?.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || error.response?.data?.error || 'Request failed');
  }
};

export { api, client };
