import { createContext, useContext, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api.js';

const AppContext = createContext(null);

const AppProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const [authenticated, setAuthenticated] = useState(Boolean(localStorage.getItem('rifat-token')));
  const [error, setError] = useState('');
  const bootstrap = useQuery({ queryKey: ['bootstrap'], queryFn: () => api('/bootstrap'), enabled: authenticated });
  const logout = async () => { try { if (authenticated) await api('/auth/logout', { method: 'POST' }); } finally { localStorage.removeItem('rifat-token'); queryClient.clear(); setAuthenticated(false); } };
  const login = async (email, password) => { const result = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }); localStorage.setItem('rifat-token', result.token); setAuthenticated(true); };
  const load = () => queryClient.invalidateQueries({ queryKey: ['bootstrap'] });
  const mutate = async (path, options) => { try { const result = await api(path, options); await load(); setError(''); return result; } catch (caught) { setError(caught.message); throw caught; } };
  useEffect(() => { if (bootstrap.error) setError(bootstrap.error.message); }, [bootstrap.error]);
  return <AppContext.Provider value={{ authenticated, data: bootstrap.data, error, setError, login, logout, load, mutate }}>{children}</AppContext.Provider>;
};

const useApp = () => useContext(AppContext);

export { AppProvider, useApp };
