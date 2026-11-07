import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    tsconfigPaths: true,
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      output: {
        // مكتبات الواجهة الثابتة في ملف مستقل: يبقى مخزَّنًا في المتصفح بين الإصدارات
        // (اسمه لا يتغيّر ما لم تتغيّر المكتبات)، فلا يُعاد تنزيله عند كل تحديث للتطبيق.
        // مكتبات الشهادات (jspdf/html2canvas/qrcode) تُحمَّل بـ import() عند الطلب فقط.
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined;
          if (/node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) {
            return 'react-vendor';
          }
          return undefined;
        },
      },
    },
  },
});
