import fixtures from './fixtures.json';
import type {
  CivicCase,
  Course,
  Product,
  Revision,
  Role,
  State,
  Status,
  User,
} from './types';

export const users = fixtures.users as User[];
export const districts = fixtures.districts;
export const locationOptions = fixtures.locations as Record<string, string[]>;
export const notices = fixtures.notices;
export const events = fixtures.events;
export const roleLabel: Record<Role, string> = {
  citizen: 'شهروند',
  inspector: 'بازرس کیفیت',
  district: 'مدیر منطقه',
  hq: 'مدیر ستاد',
  contractor: 'پیمانکار',
  vendor: 'فروشنده',
  instructor: 'مدرس',
};
export const statusLabel: Record<Status, string> = {
  new: 'ثبت شده',
  review: 'در حال بررسی',
  assigned: 'ارجاع به اجرا',
  progress: 'در حال اجرا',
  inspection: 'در انتظار بازرسی',
  rework: 'نیازمند اصلاح',
  approved: 'تأیید شده',
  rejected: 'رد شده',
  merged: 'ادغام شده',
};
export const districtName = (id: string) =>
  districts.find((district) => district.id === id)?.name ?? 'تمام شهر';
export const parameters = ['فوریت', 'اثر محله‌ای', 'امکان اجرا'] as const;
const seedTime = '2026-11-07T09:00:00Z';
const city: Revision = {
  id: 'C-01',
  district: 'city',
  at: seedTime,
  weights: [40, 35, 25],
};
const north: Revision = {
  id: 'N-01',
  district: 'north',
  at: seedTime,
  weights: [45, 35, 20],
};

export function seed(): State {
  const products = fixtures.products as Product[];
  const cases: CivicCase[] = [
    {
      id: 'M-1048',
      title: 'روشنایی خیابان آبان',
      kind: 'report',
      category: 'روشنایی',
      status: 'review',
      district: 'north',
      owner: 'citizen',
      description: 'دو چراغ مسیر اصلی خاموش است.',
      location: 'خیابان آبان',
      date: '2026-11-17',
      photo: '',
      score: { revision: north, values: [80, 75, 90] },
      votes: [],
      evidence: [],
      confirmed: false,
      inspections: [],
      events: [],
    },
    {
      id: 'M-1043',
      title: 'بهسازی مسیر بوستان سپید',
      kind: 'report',
      category: 'معابر و پیاده‌رو',
      status: 'approved',
      district: 'north',
      owner: 'citizen',
      description: 'ترمیم کفپوش مسیر بوستان انجام شد.',
      location: 'بوستان سپید',
      date: '2026-11-13',
      photo: '',
      score: { revision: north, values: [60, 85, 90] },
      project: {
        worker: 'district',
        inspector: 'inspector',
        method: 'internal',
        price: 0,
      },
      votes: [],
      evidence: [],
      confirmed: false,
      inspections: [
        {
          at: '2026-11-14T09:30:00Z',
          location: 'بوستان سپید',
          quality: 92,
          checklist: 'سطح پیاده‌رو، ایمنی و نظافت بررسی شد.',
          photo: '',
        },
      ],
      events: [],
    },
    {
      id: 'M-1039',
      title: 'ایستگاه تفکیک پسماند محله',
      kind: 'idea',
      category: 'پسماند',
      status: 'new',
      district: 'north',
      owner: 'district',
      description: 'ایستگاه کوچک در نزدیکی میدان سرو نصب شود.',
      location: 'میدان سرو',
      date: '2026-11-12',
      photo: '',
      votes: [],
      evidence: [],
      confirmed: false,
      inspections: [],
      events: [],
    },
    {
      id: 'M-1036',
      title: 'رفع شکستگی جدول میدان سرو',
      kind: 'report',
      category: 'معابر و پیاده‌رو',
      status: 'inspection',
      district: 'north',
      owner: 'citizen',
      description: 'قطعه‌های شکسته جایگزین شده‌اند.',
      location: 'میدان سرو',
      date: '2026-11-09',
      photo: '',
      score: { revision: north, values: [75, 80, 90] },
      project: {
        worker: 'contractor',
        inspector: 'inspector',
        method: 'tender',
        price: 1250000,
      },
      votes: [],
      evidence: [],
      confirmed: false,
      inspections: [],
      events: [],
    },
    {
      id: 'M-1030',
      title: 'کاشت درخت در میدان نارون',
      kind: 'idea',
      category: 'فضای سبز',
      status: 'progress',
      district: 'south',
      owner: 'citizen',
      description: 'سایه‌بان طبیعی برای مسیر پیاده.',
      location: 'میدان نارون',
      date: '2026-11-08',
      photo: '',
      score: { revision: city, values: [55, 90, 75] },
      votes: [],
      evidence: [],
      confirmed: false,
      inspections: [],
      events: [],
    },
  ];
  return {
    cases: cases.map((record) => ({
      ...record,
      events: [
        {
          at: record.date + 'T09:00:00Z',
          status: 'new',
          note: 'ثبت اولیه',
          by: record.owner,
        },
        ...(record.status === 'new'
          ? []
          : [
              {
                at: record.date + 'T12:00:00Z',
                status: record.status,
                note: statusLabel[record.status],
                by: 'district' as const,
              },
            ]),
      ],
    })),
    revisions: [city, north],
    products,
    courses: fixtures.courses as Course[],
    attendance: [
      {
        course: 'safety',
        user: 'citizen',
        attended: true,
        approved: false,
        passed: false,
      },
    ],
    rate: 1000,
    cap: 150,
    categories: fixtures.categories,
    disabled: [],
    imports: [],
    fraud: [
      {
        id: 'F-01',
        note: 'الگوی نمونهٔ ثبت چندبارهٔ رویداد پارکینگ',
        reviewed: false,
      },
    ],
    ledger: users.map(({ id }) => ({
      key: 'initial-' + id,
      owner: id,
      amount: id === 'citizen' ? 245 : 75,
      rate: 1000,
      at: seedTime,
      label: 'اعتبار اولیهٔ نمونه',
    })),
    orders: [
      {
        id: 'O-100',
        buyer: 'citizen',
        lines: [{ product: products[0]!, quantity: 1 }],
        cara: 10,
        toman: 30000,
        rate: 1000,
        at: seedTime,
      },
    ],
  };
}
