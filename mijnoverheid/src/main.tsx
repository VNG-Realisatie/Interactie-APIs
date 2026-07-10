import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'nlds-light/app-contract.css';
import 'nlds-light/themes/rijk.css';
import 'nlds-light/themes/utrecht.css';
import 'nlds-light/themes/denhaag.css';
import 'nlds-light/themes/_demo-basis-stub.css';
import './styles/fonts.css';
import './styles/app.css';
import './styles/chat.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
