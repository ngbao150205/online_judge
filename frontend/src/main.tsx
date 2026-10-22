import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import './index.css';
import { GoogleOAuthProvider } from '@react-oauth/google';
import axios from 'axios';

axios.defaults.withCredentials = true;
// Remove legacy credentials from the previous localStorage-based login flow.
localStorage.removeItem('token');
localStorage.removeItem('role');

// Lấy Google Client ID 
const googleClientId = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID || '';

// 🔴 Bắt lỗi Runtime JS chưa xử lý
window.addEventListener('error', (event) => {
  // Bỏ qua cảnh báo vô hại từ ResizeObserver để không làm rác log console
  if (
    event.message?.includes('ResizeObserver loop completed with undelivered notifications') ||
    event.message?.includes('ResizeObserver loop limit exceeded')
  ) {
    event.stopImmediatePropagation();
    return;
  }

  console.error('🔴 [Global Error]:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error,
  });
});

// ⚠️ Bắt các Promise Rejected không được try...catch
window.addEventListener('unhandledrejection', (event) => {
  console.error('⚠️ [Unhandled Promise Rejection]:', event.reason);
});

// Chỉ gọi createRoot duy nhất 1 lần
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        {googleClientId ? <GoogleOAuthProvider clientId={googleClientId}><App /></GoogleOAuthProvider> : <App />}
      </LanguageProvider>
    </ThemeProvider>
  </React.StrictMode>
);
