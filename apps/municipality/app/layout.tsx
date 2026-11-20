import '@fontsource-variable/vazirmatn';
import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { DemoProvider } from '../components/state';

export const metadata: Metadata = {
  title: 'همساده | شهرداری مشارکتی',
  description: 'سامانهٔ مشارکت شهروندی برای شهری که با هم می‌سازیم.',
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa-IR" dir="rtl">
      <body>
        <DemoProvider>{children}</DemoProvider>
      </body>
    </html>
  );
}
