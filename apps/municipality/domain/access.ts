import type { Permission, CivicCase, Role, State, User } from './types';

export const routes = {
  home: 'پیشخوان',
  cases: 'گزارش‌ها و پیشنهادها',
  submit: 'ثبت گزارش یا پیشنهاد',
  wallet: 'کیف پول کارا',
  shop: 'فروشگاه شهری',
  training: 'آموزش شهروندی',
  community: 'مشارکت محله',
  inspection: 'صف بازرسی',
  scoring: 'ماتریس امتیازدهی',
  execution: 'پروژه‌ها و قراردادها',
  products: 'مدیریت فروشگاه',
  courses: 'مدیریت دوره‌ها',
  audit: 'مدیریت ستاد و ممیزی',
  transparency: 'شفافیت شهری',
  profile: 'پروفایل',
  notices: 'اعلان‌ها',
  search: 'جست‌وجو',
} as const;
export type Section = keyof typeof routes;
const common: Section[] = [
  'home',
  'wallet',
  'transparency',
  'profile',
  'notices',
  'search',
];
const workspaces: Record<Role, Section[]> = {
  citizen: ['cases', 'submit', 'shop', 'training', 'community'],
  inspector: ['inspection', 'cases'],
  district: ['cases', 'scoring', 'execution', 'products'],
  hq: ['cases', 'scoring', 'audit'],
  contractor: ['execution', 'cases'],
  vendor: ['products'],
  instructor: ['courses'],
};
export const menu = (role: Role) =>
  ['home', ...workspaces[role], ...common.slice(1)] as Section[];
export const canOpen = (role: Role, section: string): section is Section =>
  menu(role).some((allowed) => section === allowed);

export function visibleCase(user: User, record: CivicCase) {
  switch (user.role) {
    case 'hq':
      return true;
    case 'citizen':
      return true;
    case 'district':
      return record.district === user.district;
    case 'inspector':
      return (
        record.district === user.district &&
        record.project?.inspector === user.id
      );
    case 'contractor':
      return (
        record.district === user.district && record.project?.worker === user.id
      );
    default:
      return false;
  }
}

export const privateCase = (user: User, record: CivicCase) =>
  user.role === 'citizen'
    ? record.owner === user.id
    : visibleCase(user, record);

export function visibleProducts(state: State, user: User) {
  return state.products.filter((product) =>
    user.role === 'district'
      ? product.district === user.district
      : user.role === 'vendor'
        ? product.vendor === user.id
        : user.role === 'citizen',
  );
}

export const permissionLabels: Record<Permission, string> = {
  submit: 'ثبت پرونده',
  case: 'اقدام روی پرونده',
  weights: 'تغییر وزن‌ها',
  checkout: 'خرید',
  withdraw: 'برداشت',
  product: 'ویرایش کالا',
  settle: 'تسویه',
  course: 'ویرایش دوره',
  attendance: 'حضور و پاداش دوره',
  survey: 'ارسال نظرسنجی',
  integration: 'همگام‌سازی نمونه',
};

export const permissions: Record<Role, Permission[]> = {
  citizen: [
    'submit',
    'case',
    'checkout',
    'withdraw',
    'attendance',
    'survey',
    'integration',
  ],
  inspector: ['case'],
  district: ['case', 'weights', 'product', 'integration'],
  hq: ['weights', 'integration'],
  contractor: ['case'],
  vendor: ['product', 'settle'],
  instructor: ['course', 'attendance'],
};

export const blocked = (state: State, role: Role, action: string) =>
  state.blocked?.[role]?.some((permission) => permission === action) ?? false;
