import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { initTheme } from './theme/store';

// يطبّق آخر مظهر محفوظ فورًا (قبل أول رسم) ثم يجلب المظهر الحالي من الخادم في الخلفية
initTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
