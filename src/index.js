import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { DataProvider } from './context/DataContext';
import { VoterAuthProvider } from './context/VoterAuthContext';
import { DialogProvider } from './components/DialogProvider';
import { ThemeProvider } from './context/ThemeContext';
import './styles/global.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <DialogProvider>
        <VoterAuthProvider>
          <DataProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </DataProvider>
        </VoterAuthProvider>
      </DialogProvider>
    </ThemeProvider>
  </React.StrictMode>
);
