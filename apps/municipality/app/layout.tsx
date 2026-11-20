import '@fontsource-variable/vazirmatn';
import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { DemoProvider } from '../components/state';

import { brand } from '../domain/data';

export const metadata: Metadata = {
  title: brand.name + ' | شهرداری مشارکتی',
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
