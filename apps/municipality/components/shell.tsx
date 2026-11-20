'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Activity,
  ArrowLeft,
  Bell,
  BookOpen,
  Building2,
  ChartNoAxesCombined,
  ChevronLeft,
  CircleHelp,
  ClipboardCheck,
  ClipboardList,
  FilePlus2,
  Globe2,
  GraduationCap,
  HardHat,
  House,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Search,
  Settings,
  ShoppingBag,
  Store,
  UsersRound,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import {
  canOpen,
  menu,
  routes,
  visibleCase,
  type Section,
} from '../domain/access';
import { balance, totalScore } from '../domain/commands';
import {
  districtName,
  districts,
  notices,
  roleLabel,
  statusLabel,
  users,
} from '../domain/data';
import type { Role, State, User } from '../domain/types';
import { useDemo } from './state';
import {
  Badge,
  Button,
  Card,
  DataTable,
  Empty,
  Heading,
  Modal,
  More,
  Toast,
  WalletWidget,
  date,
  money,
  num,
} from './ui';
import { CaseList, CasePage, SubmitCase } from './civic';
import { Audit, Products, Scoring, Shop, WalletPage } from './economy';
import { Community, Courses, Training } from './participation';

const icons: Record<Section, LucideIcon> = {
  home: LayoutDashboard,
  cases: ClipboardList,
  submit: FilePlus2,
  wallet: Wallet,
  shop: ShoppingBag,
  training: BookOpen,
  community: UsersRound,
  inspection: ClipboardCheck,
  scoring: ChartNoAxesCombined,
  execution: HardHat,
  products: Store,
  courses: GraduationCap,
  audit: Settings,
  transparency: Globe2,
  profile: UsersRound,
  notices: Bell,
  search: Search,
};
const roleIcons: Record<Role, LucideIcon> = {
  citizen: UsersRound,
  inspector: ClipboardCheck,
  district: Building2,
  hq: Settings,
  contractor: HardHat,
  vendor: Store,
  instructor: GraduationCap,
};
const summaries: Record<Role, string> = {
  citizen: 'گزارش، مشارکت و خدمات محله',
  inspector: 'بازرسی و ارزیابی کیفیت',
  district: 'رسیدگی و ارجاع پرونده‌ها',
  hq: 'نظارت و مدیریت شهر',
  contractor: 'پروژه‌ها و پیشرفت اجرا',
  vendor: 'کالا، سفارش و تسویه',
  instructor: 'دوره، حضور و آزمون',
};
const dashboardText: Record<Role, [string, string, Section, string]> = {
  citizen: [
    'محلهٔ بهتر، با مشارکت شما',
    'مشکلی در محله دیده‌اید؟ گزارش دهید و روند رسیدگی را تا نتیجه دنبال کنید.',
    'submit',
    'ثبت گزارش جدید',
  ],
  inspector: [
    'کیفیت هر پروژه را مستند کنید',
    'کارهای آمادهٔ بازرسی را ببینید و نتیجهٔ بازدید را برای پیگیری ثبت کنید.',
    'inspection',
    'مشاهدهٔ صف بازرسی',
  ],
  district: [
    'کارهای منطقه را اولویت‌بندی کنید',
    'پرونده‌های باز، ارجاع‌ها و پیشرفت تیم‌های اجرایی را یکجا پیگیری کنید.',
    'cases',
    'بررسی پرونده‌ها',
  ],
  hq: [
    'تصویر روشنی از وضعیت شهر',
    'نتیجهٔ مناطق، گردش اعتبار و هشدارهای نیازمند بررسی را ببینید.',
    'audit',
    'ورود به ممیزی',
  ],
  contractor: [
    'پروژه‌های خود را پیش ببرید',
    'آخرین پیشرفت و نتیجهٔ ارزیابی کیفیت را در پروندهٔ هر پروژه ثبت و پیگیری کنید.',
    'execution',
    'مشاهدهٔ پروژه‌ها',
  ],
  vendor: [
    'فروشگاه خود را مدیریت کنید',
    'موجودی کالاها و سفارش‌های خدمات شهری را مرور کنید.',
    'products',
    'مدیریت کالاها',
  ],
  instructor: [
    'آموزش را به مشارکت تبدیل کنید',
    'حضور و آزمون شرکت‌کنندگان را بررسی کنید و پاداش دوره را بپردازید.',
    'courses',
    'مدیریت دوره‌ها',
  ],
};
const href = (section: Section) => '/desk/' + section;

function Brand() {
  return (
    <Link className="brand" href="/">
      <span className="brand-icon">
        <Building2 size={23} />
      </span>
      <span>
        <strong>همساده</strong>
        <small>شهرداری مشارکتی</small>
      </span>
    </Link>
  );
}

function CityGraphic() {
  return (
    <div className="city-graphic" aria-hidden="true">
      <div className="city-orbit orbit-one" />
      <div className="city-orbit orbit-two" />
      <div className="city-orbit orbit-three" />
      <div className="city-building">
        <Building2 strokeWidth={1.1} />
      </div>
      <span className="city-node node-one">
        <MapPin size={22} />
      </span>
      <span className="city-node node-two">
        <House size={19} />
      </span>
      <span className="city-node node-three">
        <Activity size={17} />
      </span>
      <i className="city-spark spark-one" />
      <i className="city-spark spark-two" />
    </div>
  );
}

export function Login() {
  const { session, dispatch, state, user } = useDemo();
  const [role, setRole] = useState<Role>('citizen');
  const router = useRouter();
  return (
    <div className="login-page">
      <header className="login-header">
        <Brand />
        <span className="demo-chip">
          <i /> محیط آزمایشی
        </span>
      </header>
      <main className="login-main">
        <div className="login-intro">
          <div className="hero-eyebrow">
            <MapPin size={17} /> شهر از محله شروع می‌شود
          </div>
          <h1>
            شهری که
            <br />
            با هم می‌سازیم<span>.</span>
          </h1>
          <p>
            همساده، فضای مشترک شهروندان و شهرداری برای ثبت گزارش، پیگیری کارها و
            بهبود محله است.
          </p>
          <CityGraphic />
        </div>
        <Card className="login-card">
          <h2>ورود به همساده</h2>
          <p className="muted">
            برای دیدن پیشخوان، یک نقش آزمایشی انتخاب کنید.
          </p>
          <fieldset className="role-picker" disabled={!session.ready}>
            <legend className="sr-only">نقش آزمایشی</legend>
            {users.map((item) => {
              const Icon = roleIcons[item.role];
              return (
                <label
                  key={item.id}
                  className="role-option"
                  data-selected={role === item.role}
                  data-disabled={state.disabled.includes(item.id)}
                >
                  <input
                    type="radio"
                    name="role"
                    checked={role === item.role}
                    disabled={state.disabled.includes(item.id)}
                    onChange={() => setRole(item.role)}
                  />
                  <span className="mini-icon">
                    <Icon size={19} />
                  </span>
                  <span>
                    <strong>{roleLabel[item.role]}</strong>
                    <small>{summaries[item.role]}</small>
                  </span>
                </label>
              );
            })}
          </fieldset>
          <Button
            className="login-submit"
            disabled={!session.ready || state.disabled.includes(role)}
            onClick={() => {
              dispatch({ type: 'switch', role });
              router.push(href('home'));
            }}
          >
            ورود به پیشخوان <ArrowLeft size={19} />
          </Button>
          {user && (
            <Link className="text-link" href={href('home')}>
              ادامه با نقش فعلی ({roleLabel[user.role]})
            </Link>
          )}
        </Card>
      </main>
      <footer className="login-footer">
        <CircleHelp size={16} /> اطلاعات و تراکنش‌های این نسخه آزمایشی هستند.
        <Link className="text-link public-link" href="/transparency">
          شفافیت شهری <More />
        </Link>
      </footer>
    </div>
  );
}

export function RoleGuard({
  section,
  user,
  children,
}: {
  section: string;
  user?: User;
  children: React.ReactNode;
}) {
  if (!user || !canOpen(user.role, section))
    return (
      <Card className="guard">
        <Heading
          title={
            user
              ? 'دسترسی به این بخش محدود است'
              : 'ابتدا نقش خود را انتخاب کنید'
          }
        />
        <Link className="ui-button" href={user ? href('home') : '/'}>
          {user ? 'بازگشت به پیشخوان' : 'ورود آزمایشی'}
        </Link>
      </Card>
    );
  return children;
}

function Sidebar({
  user,
  section,
  onNavigate,
}: {
  user: User;
  section: string;
  onNavigate: () => void;
}) {
  const { dispatch } = useDemo();
  return (
    <aside className="sidebar">
      <Brand />
      <nav aria-label="ناوبری اصلی">
        <p>فضای کاری</p>
        {menu(user.role)
          .filter((item) => !['search', 'notices', 'profile'].includes(item))
          .map((item) => {
            const Icon = icons[item];
            return (
              <Link
                key={item}
                href={href(item)}
                aria-current={item === section ? 'page' : undefined}
                onClick={onNavigate}
              >
                <Icon size={20} />
                {routes[item]}
              </Link>
            );
          })}
      </nav>
      <div className="sidebar-bottom">
        <Link href={href('profile')} onClick={onNavigate}>
          <Settings size={19} /> تنظیمات و پروفایل
        </Link>
        <Link href="/" onClick={() => dispatch({ type: 'switch', role: null })}>
          <LogOut size={19} /> خروج و تغییر نقش
        </Link>
        <small>
          <i /> نسخهٔ آزمایشی شهرداری
        </small>
      </div>
    </aside>
  );
}

export function Desk({
  section,
  detail,
}: {
  section: string;
  detail?: string;
}) {
  const { user, session } = useDemo();
  const [showMenu, setShowMenu] = useState(false);
  if (!session.ready)
    return (
      <main className="loading" aria-live="polite">
        در حال بارگذاری همساده…
      </main>
    );
  return (
    <RoleGuard section={section} user={user}>
      {user && (
        <div className="desk" data-simple={session.simple}>
          <a className="skip-link" href="#main">
            رفتن به محتوای اصلی
          </a>
          <div className="navigation-side" data-open={showMenu}>
            <Sidebar
              user={user}
              section={section}
              onNavigate={() => setShowMenu(false)}
            />
          </div>
          <div className="work">
            <header className="topbar">
              <div className="topbar-location">
                <Button
                  className="menu-toggle"
                  tone="quiet"
                  aria-label={showMenu ? 'بستن منو' : 'باز کردن منو'}
                  aria-expanded={showMenu}
                  onClick={() => setShowMenu(!showMenu)}
                >
                  {showMenu ? <X size={21} /> : <Menu size={23} />}
                </Button>
                <MapPin size={20} />
                <span>{districtName(user.district)}</span>
              </div>
              <div className="topbar-actions">
                <Link
                  className="icon-button"
                  href={href('search')}
                  aria-label="جست‌وجو"
                >
                  <Search size={20} />
                </Link>
                <Link
                  className="icon-button has-dot"
                  href={href('notices')}
                  aria-label="اعلان‌ها"
                >
                  <Bell size={20} />
                </Link>
                <Link href={href('profile')} className="account-link">
                  <span className="avatar">
                    {(session.name || user.name).charAt(0)}
                  </span>
                  <span>
                    <strong>{session.name || user.name}</strong>
                    <small>{roleLabel[user.role]}</small>
                  </span>
                </Link>
              </div>
            </header>
            <main id="main" tabIndex={-1} className="page-content">
              <div className="breadcrumb">
                <Link href={href('home')}>همساده</Link>
                <ChevronLeft size={13} />
                <span>{routes[section as Section]}</span>
              </div>
              <Workspace
                section={section as Section}
                detail={detail}
                user={user}
              />
            </main>
            <footer className="desk-footer">
              همساده · شهرداری مشارکتی<span>خدمات و تراکنش‌های آزمایشی</span>
            </footer>
          </div>
          {session.message && (
            <Toast
              key={session.message.id}
              message={session.message.text}
              error={session.message.error}
            />
          )}
        </div>
      )}
    </RoleGuard>
  );
}

function caseAlerts(state: State, user: User) {
  return state.cases
    .filter(
      (record) =>
        visibleCase(user, record) &&
        (user.role !== 'citizen' || record.owner === user.id),
    )
    .flatMap((record) => {
      const update = record.events.at(-1);
      return update && update.status !== 'new'
        ? [
            {
              id: record.id,
              title: record.title,
              at: update.at,
              status: update.status,
            },
          ]
        : [];
    })
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 6);
}

function NoticesPage({ user }: { user: User }) {
  const { state } = useDemo();
  return (
    <>
      <Heading title="اعلان‌ها">خبرهای جدید محله و نتیجهٔ رسیدگی‌ها.</Heading>
      <div className="grid-two">
        {notices.map((notice) => (
          <Card key={notice.title}>
            <span className="mini-icon">
              <Bell size={20} />
            </span>
            <h2>{notice.title}</h2>
            <p>{notice.text}</p>
          </Card>
        ))}
        {caseAlerts(state, user).map((alert) => (
          <Card key={alert.id}>
            <span className="mini-icon">
              <ClipboardList size={20} />
            </span>
            <h2>{alert.title}</h2>
            <p>
              {statusLabel[alert.status]} · {date(alert.at)}
            </p>
            <Link className="text-link" href={href('cases') + '/' + alert.id}>
              مشاهدهٔ پرونده <More />
            </Link>
          </Card>
        ))}
      </div>
    </>
  );
}

function Dashboard({ user }: { user: User }) {
  const { state, session } = useDemo();
  const list = state.cases.filter(
    (record) =>
      visibleCase(user, record) &&
      (user.role !== 'citizen' || record.owner === user.id),
  );
  const [title, subtitle, action, label] = dashboardText[user.role];
  const actions = menu(user.role)
    .filter(
      (section) =>
        ![
          'home',
          'wallet',
          'transparency',
          'profile',
          'notices',
          'search',
          action,
        ].includes(section),
    )
    .slice(0, 3);
  const active = list.filter(
    (record) => !['approved', 'merged', 'rejected'].includes(record.status),
  );
  const rows =
    user.role === 'vendor'
      ? state.products
          .filter((p) => p.vendor === user.id)
          .slice(0, 4)
          .map((p) => [p.name, money(p.price), num(p.stock)])
      : user.role === 'instructor'
        ? state.courses
            .filter((c) => c.instructor === user.id)
            .map((c) => [c.title, c.venue, date(c.date)])
        : list.slice(0, 4).map((record) => [
            <Link
              key={record.id}
              className="case-link"
              href={href('cases') + '/' + record.id}
            >
              {record.title}
              <small>
                <bdi>{record.id}</bdi>
              </small>
            </Link>,
            date(record.date),
            <Badge key="status" status={record.status} />,
          ]);
  return (
    <>
      <Heading
        title={
          user.role === 'citizen'
            ? 'پیشخوان شهروندی'
            : routes.home + ' ' + roleLabel[user.role]
        }
      >
        سلام {session.name || user.name}، به همساده خوش آمدید.
      </Heading>
      <section className="dashboard-hero">
        <div className="hero-copy">
          <div className="hero-eyebrow">
            <MapPin size={16} /> {districtName(user.district)}
          </div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
          <Link className="hero-button" href={href(action)}>
            {label}
            <ArrowLeft size={18} />
          </Link>
        </div>
        <CityGraphic />
      </section>
      <div className="metrics">
        <Card>
          <WalletWidget balance={balance(state, user.id)} rate={state.rate} />
        </Card>
        <Card className="metric">
          <span className="mini-icon blue">
            <ClipboardList size={21} />
          </span>
          <div>
            <span>
              {user.role === 'vendor'
                ? 'کالاهای فعال'
                : user.role === 'instructor'
                  ? 'دوره‌های آموزشی'
                  : 'پرونده‌های فعال'}
            </span>
            <strong>
              {num(
                ['vendor', 'instructor'].includes(user.role)
                  ? rows.length
                  : active.length,
              )}
            </strong>
            <small>در فضای کاری شما</small>
          </div>
        </Card>
        <Card className="metric">
          <span className="mini-icon amber">
            <Bell size={21} />
          </span>
          <div>
            <span>اعلان‌های محله</span>
            <strong>
              {num(notices.length + caseAlerts(state, user).length)}
            </strong>
            <Link href={href('notices')}>
              مشاهدهٔ اعلان‌ها <More />
            </Link>
          </div>
        </Card>
      </div>
      <div className="dashboard-grid">
        <Card>
          <div className="section-head">
            <h2>
              {user.role === 'vendor'
                ? 'کالاهای فروشگاه'
                : user.role === 'instructor'
                  ? 'دوره‌های من'
                  : user.role === 'citizen'
                    ? 'گزارش‌های من'
                    : 'پرونده‌های اخیر'}
            </h2>
            <Link
              className="text-link"
              href={href(
                user.role === 'vendor'
                  ? 'products'
                  : user.role === 'instructor'
                    ? 'courses'
                    : 'cases',
              )}
            >
              مشاهدهٔ همه <More />
            </Link>
          </div>
          <DataTable
            head={
              user.role === 'vendor'
                ? ['کالا', 'قیمت', 'موجودی']
                : user.role === 'instructor'
                  ? ['دوره', 'محل', 'تاریخ']
                  : ['عنوان پرونده', 'تاریخ ثبت', 'وضعیت']
            }
            rows={rows}
          />
        </Card>
        <Card>
          <div className="section-head">
            <h2>دسترسی سریع</h2>
          </div>
          <div className="quick-links">
            {(actions.length
              ? actions
              : (['wallet', 'notices', 'transparency'] as Section[])
            ).map((item) => {
              const Icon = icons[item];
              return (
                <Link href={href(item)} key={item}>
                  <span className="mini-icon">
                    <Icon size={19} />
                  </span>
                  <strong>{routes[item]}</strong>
                  <More />
                </Link>
              );
            })}
          </div>
        </Card>
      </div>
      {user.role === 'hq' && (
        <Card>
          <div className="section-head">
            <h2>نمای مناطق شهر</h2>
            <Link className="text-link" href={href('transparency')}>
              نمای عمومی <More />
            </Link>
          </div>
          <DataTable
            head={['منطقه', 'کل پرونده‌ها', 'در حال رسیدگی', 'تأیید شده']}
            rows={districts.map((district) => {
              const scoped = list.filter(
                (record) => record.district === district.id,
              );
              return [
                district.name,
                num(scoped.length),
                num(
                  active.filter((record) => record.district === district.id)
                    .length,
                ),
                num(
                  scoped.filter((record) => record.status === 'approved')
                    .length,
                ),
              ];
            })}
          />
        </Card>
      )}
      {user.role === 'district' && (
        <Card>
          <div className="section-head">
            <h2>مجریان منطقه</h2>
            <Link className="text-link" href={href('execution')}>
              مشاهدهٔ قراردادها <More />
            </Link>
          </div>
          <DataTable
            head={['مجری', 'پرونده‌های ارجاع‌شده', 'پرونده‌های فعال']}
            rows={[
              [
                'تیم داخلی شهرداری',
                num(
                  list.filter((record) => record.project?.worker === user.id)
                    .length,
                ),
                num(
                  active.filter((record) => record.project?.worker === user.id)
                    .length,
                ),
              ],
              ...users
                .filter(
                  (member) =>
                    member.role === 'contractor' &&
                    member.district === user.district,
                )
                .map((member) => [
                  member.name,
                  num(
                    list.filter(
                      (record) => record.project?.worker === member.id,
                    ).length,
                  ),
                  num(
                    active.filter(
                      (record) => record.project?.worker === member.id,
                    ).length,
                  ),
                ]),
            ]}
          />
        </Card>
      )}
    </>
  );
}

function Profile({ user }: { user: User }) {
  const { session, dispatch } = useDemo();
  const [reset, setReset] = useState(false);
  const router = useRouter();
  return (
    <>
      <Heading title="پروفایل و تنظیمات">
        تنظیمات نمایشی این مرورگر را مدیریت کنید.
      </Heading>
      <div className="grid-two">
        <Card>
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              dispatch({
                type: 'name',
                name: String(new FormData(e.currentTarget).get('name') ?? ''),
              });
            }}
          >
            <label>
              نام نمایشی
              <input
                name="name"
                defaultValue={session.name || user.name}
                required
                maxLength={60}
              />
            </label>
            <p>
              {roleLabel[user.role]} · {districtName(user.district)}
            </p>
            <Button type="submit">ذخیرهٔ نام</Button>
          </form>
        </Card>
        <Card>
          <h2>دسترس‌پذیری</h2>
          <label className="check">
            <input
              type="checkbox"
              checked={session.simple}
              onChange={() => dispatch({ type: 'simple' })}
            />{' '}
            حالت ساده با متن و دکمه‌های بزرگ‌تر
          </label>
          <Button tone="danger" onClick={() => setReset(true)}>
            بازنشانی داده‌های نمایشی
          </Button>
        </Card>
      </div>
      {reset && (
        <Modal title="بازنشانی نسخهٔ آزمایشی" onClose={() => setReset(false)}>
          <p>همهٔ تغییرات این مرورگر پاک می‌شود و نمونه‌های اولیه بازمی‌گردد.</p>
          <Button
            tone="danger"
            onClick={() => {
              dispatch({ type: 'reset' });
              router.push('/');
            }}
          >
            بازنشانی
          </Button>
        </Modal>
      )}
    </>
  );
}

export function PublicTransparency() {
  return (
    <div className="login-page">
      <header className="login-header">
        <Brand />
        <Link className="ui-button" href="/">
          ورود آزمایشی <ArrowLeft size={17} />
        </Link>
      </header>
      <main className="page-content">
        <Transparency />
      </main>
      <footer className="login-footer">
        <CircleHelp size={16} /> آمار این نسخه بر اساس داده‌های نمونه است.
      </footer>
    </div>
  );
}

function Transparency() {
  const { state } = useDemo();
  return (
    <>
      <Heading title="شفافیت شهری">
        آمار و وضعیت عمومی پرونده‌ها در سطح منطقه.
      </Heading>
      <div className="grid-two">
        {districts.map((district) => {
          const list = state.cases.filter((c) => c.district === district.id);
          return (
            <Card key={district.id}>
              <h2>{district.name}</h2>
              <p>
                {num(list.length)} پرونده ·{' '}
                {num(list.filter((c) => c.status === 'approved').length)} تأیید
                شده
              </p>
              <DataTable
                head={['دسته', 'وضعیت', 'امتیاز', 'تاریخ']}
                rows={list.map((c) => [
                  c.category,
                  <Badge key="s" status={c.status} />,
                  c.score ? num(totalScore(c.score)) : '—',
                  date(c.date),
                ])}
              />
            </Card>
          );
        })}
      </div>
    </>
  );
}
function SearchPage({ user }: { user: User }) {
  const { state } = useDemo();
  const [query, setQuery] = useState('');
  const list =
    query.trim().length > 1
      ? state.cases.filter(
          (c) =>
            visibleCase(user, c) &&
            (c.title.includes(query.trim()) ||
              c.id.toLowerCase().includes(query.trim().toLowerCase())),
        )
      : [];
  return (
    <>
      <Heading title="جست‌وجو">با عنوان یا شناسهٔ پرونده جست‌وجو کنید.</Heading>
      <Card>
        <label>
          عبارت جست‌وجو
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        {list.length ? (
          <div className="quick-links">
            {list.map((c) => (
              <Link key={c.id} href={href('cases') + '/' + c.id}>
                {c.title}
                <More />
              </Link>
            ))}
          </div>
        ) : (
          <Empty>
            {query.trim().length < 2
              ? 'حداقل دو نویسه وارد کنید.'
              : 'نتیجه‌ای پیدا نشد.'}
          </Empty>
        )}
      </Card>
    </>
  );
}
function Workspace({
  section,
  detail,
  user,
}: {
  section: Section;
  detail?: string;
  user: User;
}) {
  switch (section) {
    case 'home':
      return <Dashboard user={user} />;
    case 'cases':
      return detail ? (
        <CasePage key={detail} user={user} id={detail} />
      ) : (
        <CaseList user={user} kind="cases" />
      );
    case 'inspection':
    case 'execution':
      return detail ? (
        <CasePage key={detail} user={user} id={detail} />
      ) : (
        <CaseList user={user} kind={section} />
      );
    case 'submit':
      return <SubmitCase />;
    case 'wallet':
      return <WalletPage user={user} />;
    case 'shop':
      return <Shop />;
    case 'products':
      return <Products user={user} />;
    case 'training':
      return <Training user={user} />;
    case 'courses':
      return <Courses user={user} />;
    case 'community':
      return <Community />;
    case 'scoring':
      return <Scoring user={user} />;
    case 'audit':
      return <Audit />;
    case 'transparency':
      return <Transparency />;
    case 'profile':
      return <Profile user={user} />;
    case 'search':
      return <SearchPage user={user} />;
    case 'notices':
      return <NoticesPage user={user} />;
  }
}
