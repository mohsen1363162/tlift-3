import * as React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import BrandLogo from './components/BrandLogo';
import { Toaster } from './components/ui/toaster';
import './index.css';
import { startCloudSync } from './cloudSync';

// شروع همگام‌سازی ابری (Supabase) — در صورت قطع بودن اینترنت، آفلاین ادامه می‌دهد
startCloudSync().catch(() => {
  /* بدون اینترنت یا خطای سرور: اپ به‌صورت آفلاین کار می‌کند */
});

/** صفحه بارگذاری — هنگام بررسی session */
const LoadingScreen: React.FC = () => (
  <div dir="rtl" className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f3f4f6]">
    <BrandLogo className="h-14 w-14 shadow-sm" />
    <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#8d7fc9] border-t-transparent" />
    <p className="text-[13px] text-gray-500">در حال بارگذاری سیستم...</p>
  </div>
);

/**
 * درگاه ورود:
 * - در حال بررسی session → صفحه بارگذاری
 * - کاربر لاگین شده است   → سیستم اصلی (App)
 * - کاربر لاگین نشده است  → صفحه ورود (LoginPage)
 */
const AppGate: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  return user ? <App /> : <LoginPage />;
};

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <AppGate />
      <Toaster />
    </AuthProvider>
  </React.StrictMode>
);
