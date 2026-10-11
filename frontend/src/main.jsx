import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { QueryProvider } from './app/providers/QueryProvider.jsx';

createRoot(document.getElementById('root')).render(<QueryProvider><BrowserRouter><App /></BrowserRouter></QueryProvider>);
