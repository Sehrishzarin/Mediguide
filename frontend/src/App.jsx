import { useState, useEffect } from 'react';
import { checkHealth } from './services/api';
import './App.css';

function App() {
  const [backendStatus, setBackendStatus] = useState('Checking connection...');

  useEffect(() => {
    checkHealth()
      .then((data) => {
        if (data.status === 'success') {
          setBackendStatus(`Connected to Backend (${data.message})`);
        } else {
          setBackendStatus('Backend reachable, unexpected response.');
        }
      })
      .catch(() => {
        setBackendStatus('Disconnected from Backend (Ensure Node server is running on port 5000)');
      });
  }, []);

  return (
    <div className="container">
      <h1>MediGuide Mobile App</h1>
      <p className="subtitle">React + Node.js + Express + MongoDB Baseline</p>
      
      <div className="card">
        <h2>Backend Connectivity</h2>
        <p className="status-badge">{backendStatus}</p>
      </div>

      <p className="footer-note">
        Ready for Capacitor mobile initialization (iOS / Android build target).
      </p>
    </div>
  );
}

export default App;
