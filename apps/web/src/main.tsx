import React from 'react';
import { createRoot } from 'react-dom/client';
import { loadErrorMessages, loadDevMessages } from '@apollo/client/dev';
import App from './App';

// Load Apollo Client error messages (omitted from bundle by default in v3.8+)
if (import.meta.env.DEV) {
  loadDevMessages();
  loadErrorMessages();
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);



