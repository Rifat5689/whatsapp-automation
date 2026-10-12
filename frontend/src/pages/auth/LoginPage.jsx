import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '../../hooks/useApp.jsx';

export default function LoginPage() {
  const { authenticated, login } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (authenticated) return <Navigate to="/conversations" replace />;

  return <main className="login"><form onSubmit={async (event) => {
    event.preventDefault();
    try { await login(username, password); }
    catch (caught) { setError(caught.message); }
  }}><div className="brand">● RIFAT.AI</div><h1>Owner sign in</h1><label>Username<input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} /></label><label>Password<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error && <p className="error">{error}</p>}<button>Sign in</button></form></main>;
}
