import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ActivityProvider } from './contexts/ActivityContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ActivityProvider>
      <App />
    </ActivityProvider>
  </React.StrictMode>
);