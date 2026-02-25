import React from 'react';
import { createRoot } from 'react-dom/client';
import '@stoplight/mosaic/styles.css';
import '@stoplight/mosaic/themes/default.css';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')).render(<App />);
