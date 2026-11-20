import { locationOptions } from './data';

export const municipalAdapters = {
  '137': {
    id: '137-8001',
    district: 'north',
    title: 'آب‌گرفتگی مسیر میدان سرو',
    location: 'میدان سرو',
    description: 'گزارش نمونه از مرکز ارتباطات شهری.',
  },
  toll: { id: 'TOLL-502', reward: 8, label: 'پرداخت به‌موقع عوارض · آزمایشی' },
  parking: { id: 'PARK-304', reward: 0, label: 'رویداد پارکینگ · آزمایشی' },
} as const;

export const gisLocations = (district: string) =>
  locationOptions[district] ?? [];
