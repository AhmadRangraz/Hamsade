'use client';

import {
  BookOpen,
  CreditCard,
  Leaf,
  ParkingCircle,
  ShieldCheck,
  ShoppingBag,
  Ticket,
  Wallet,
} from 'lucide-react';
import { useState } from 'react';
import {
  blocked,
  menu,
  permissions,
  permissionLabels,
  routes,
  visibleProducts,
} from '../domain/access';
import { balance } from '../domain/commands';
import {
  districtName,
  districts,
  parameters,
  roleLabel,
  users,
} from '../domain/data';
import { couponLocations, ownedCoupons } from '../domain/coupons';
import type { Order, Product, User } from '../domain/types';
import { useDemo } from './state';
import {
  Badge,
  Button,
  Card,
  DataTable,
  Empty,
  Heading,
  Modal,
  WalletWidget,
  date,
  id,
  money,
  num,
  number,
  text,
} from './ui';

const productIcons = {
  parking: ParkingCircle,
  ticket: Ticket,
  shield: ShieldCheck,
  wallet: Wallet,
  book: BookOpen,
  leaf: Leaf,
};
const earningSources = [
  'گزارش معتبر',
  'پیشنهاد اجراشده',
  'مشارکت در پرونده',
  'رفع تأییدشدهٔ مسئلهٔ محله',
  'دوره و آزمون',
  'خرید',
  'نظرسنجی',
  'پرداخت به‌موقع عوارض',
];

export function WalletPage({ user }: { user: User }) {
  const { state } = useDemo();
  const available = balance(state, user.id);
  return (
    <>
      <Heading title="کیف پول کارا">
        مانده، گردش اعتبار و نرخ تبدیل نمایشی را ببینید.
      </Heading>
      <div className="grid-two">
        <Card>
          <WalletWidget balance={available} rate={state.rate} />
        </Card>
        <Card>
          <h2>مصرف اعتبار</h2>
          <p>کارا در فروشگاه شهری برای کالا و کوپن قابل استفاده است.</p>
          <p>نرخ فعلی: هر کارا {money(state.rate)}</p>
        </Card>
      </div>
      <Card>
        <h2>گردش کارا</h2>
        <DataTable
          head={['شرح', 'کارا', 'نرخ ثبت‌شده', 'تاریخ']}
          rows={state.ledger
            .filter((item) => item.owner === user.id)
            .map((item) => [
              item.label,
              <bdi
                key="amount"
                className={item.amount < 0 ? 'error-text' : 'success-text'}
              >
                {item.amount > 0 ? '+' : '−'}
                {num(Math.abs(item.amount))}
              </bdi>,
              money(item.rate),
              date(item.at),
            ])}
        />
      </Card>
      <Card>
        <h2>راه‌های دریافت کارا</h2>
        <div className="pill-row">
          {earningSources.map((source) => (
            <Badge key={source}>{source}</Badge>
          ))}
        </div>
      </Card>
    </>
  );
}

function OrderTable({
  orders,
  settle,
  audit = false,
}: {
  orders: Order[];
  audit?: boolean;
  settle?: (id: string) => void;
}) {
  return (
    <DataTable
      head={[
        'رسید و کالا',
        'کارا',
        'پرداخت تومانی',
        'ارزش کل',
        'تاریخ',
        ...(settle || audit ? ['تسویه'] : []),
      ]}
      rows={orders.map((order) => [
        <span key="id">
          <bdi>{order.id.slice(0, 12)}</bdi>
          <br />
          {order.lines
            .map((line) => line.product.name + ' × ' + num(line.quantity))
            .join('، ')}
        </span>,
        num(order.cara),
        money(order.toman),
        money(order.toman + order.cara * order.rate),
        date(order.at),
        ...(settle || audit
          ? [
              order.settledAt ? (
                <Badge key="settled" status="approved">
                  تسویه شد · {date(order.settledAt)}
                </Badge>
              ) : settle ? (
                <Button
                  key="settle"
                  tone="quiet"
                  onClick={() => settle(order.id)}
                >
                  تسویهٔ آزمایشی
                </Button>
              ) : (
                <Badge key="pending">در انتظار تسویه</Badge>
              ),
            ]
          : []),
      ])}
    />
  );
}
function CouponCard({
  coupon,
}: {
  coupon: ReturnType<typeof ownedCoupons>[number];
}) {
  const { send } = useDemo();
  const locations = couponLocations[coupon.kind];
  const usedAt =
    coupon.used &&
    locations.find((location) => location.id === coupon.used?.location);
  return (
    <Card>
      <h3>{coupon.name}</h3>
      <p>ارزش کوپن: {money(coupon.value)}</p>
      <p className="coupon-code">
        <bdi>{coupon.id}</bdi>
      </p>
      {coupon.used ? (
        <Badge status="approved">
          مصرف شد · {usedAt?.name} · {date(coupon.used.at)}
        </Badge>
      ) : (
        <form
          className="form"
          onSubmit={(event) => {
            event.preventDefault();
            send({
              type: 'redeemCoupon',
              coupon: coupon.id,
              location: text(new FormData(event.currentTarget), 'location'),
            });
          }}
        >
          <label>
            پذیرندهٔ کوپن
            <select name="location" required defaultValue="">
              <option value="">انتخاب پذیرنده</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" tone="quiet">
            ثبت استفادهٔ آزمایشی
          </Button>
        </form>
      )}
    </Card>
  );
}

export function Shop() {
  const { state, user, send } = useDemo();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState('all');
  const [cara, setCara] = useState(0);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [checkout, setCheckout] = useState(false);
  const coupons = user ? ownedCoupons(state, user.id) : [];
  const receipt = state.orders.find((order) => order.id === orderId);
  const activeCart = receipt ? {} : cart;
  const products = state.products.filter(
    (product) => filter === 'all' || product.kind === filter,
  );
  const lines = state.products.filter((product) => activeCart[product.id]);
  const total = lines.reduce((sum, p) => sum + p.price * activeCart[p.id]!, 0);
  const caraLimit = Math.min(
    balance(state, user!.id),
    Math.floor(
      lines.reduce(
        (sum, p) => sum + (p.topup ? 0 : p.price * activeCart[p.id]!),
        0,
      ) / state.rate,
    ),
  );
  const effective = Math.min(cara, caraLimit);
  const change = (product: Product, quantity: number) => {
    if (receipt) {
      setOrderId(null);
      setCara(0);
    }
    const next = { ...activeCart };
    if (quantity > 0) next[product.id] = Math.min(quantity, product.stock);
    else delete next[product.id];
    setCart(next);
  };
  return (
    <>
      <Heading title="فروشگاه شهری" action={<Badge>خرید آزمایشی</Badge>}>
        کوپن شهروند، پارکینگ و خرید ترکیبی با کارا و تومان. قیمت‌ها برای
        نمونه‌اند و درگاه پذیرنده آزمایشی است.
      </Heading>
      <div className="form-layout shop-layout">
        <div className="stack">
          <div className="tab-row">
            {[
              ['all', 'همه'],
              ['digital', 'دیجیتال'],
              ['physical', 'فیزیکی'],
            ].map(([key, label]) => (
              <Button
                key={key}
                aria-pressed={filter === key}
                tone={filter === key ? 'primary' : 'quiet'}
                onClick={() => setFilter(key!)}
              >
                {label}
              </Button>
            ))}
          </div>
          <div className="grid-three">
            {products.map((p) => {
              const Icon =
                productIcons[p.icon as keyof typeof productIcons] ??
                ShoppingBag;
              return (
                <Card key={p.id} className="product-card">
                  <div className="product-icon">
                    <Icon size={30} />
                  </div>
                  <Badge>{p.kind === 'physical' ? 'فیزیکی' : 'دیجیتال'}</Badge>
                  <h2>{p.name}</h2>
                  <p>{money(p.price)}</p>
                  {p.coupon && (
                    <small>
                      {p.coupon === 'parking'
                        ? 'ویژهٔ پارکینگ‌های طرف قراردادِ نمونه'
                        : 'ویژهٔ پذیرندهٔ نمونهٔ فروشگاه شهروند'}
                    </small>
                  )}
                  <Button
                    tone="quiet"
                    disabled={!p.stock || (activeCart[p.id] ?? 0) >= p.stock}
                    onClick={() => change(p, (activeCart[p.id] ?? 0) + 1)}
                  >
                    افزودن به سبد
                  </Button>
                </Card>
              );
            })}
          </div>
        </div>
        <Card className="cart">
          <div className="section-head">
            <h2>سبد خرید</h2>
            <ShoppingBag size={21} />
          </div>
          {lines.length ? (
            <>
              <div className="stack">
                {lines.map((p) => (
                  <div className="cart-line" key={p.id}>
                    <span>{p.name}</span>
                    <div className="quantity">
                      <Button
                        tone="quiet"
                        aria-label={'کم کردن ' + p.name}
                        onClick={() => change(p, activeCart[p.id]! - 1)}
                      >
                        −
                      </Button>
                      <bdi>{num(activeCart[p.id]!)}</bdi>
                      <Button
                        tone="quiet"
                        aria-label={'افزودن ' + p.name}
                        disabled={activeCart[p.id]! >= p.stock}
                        onClick={() => change(p, activeCart[p.id]! + 1)}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <p>
                جمع: <strong>{money(total)}</strong>
              </p>
              <Button
                onClick={() => {
                  if (!orderId) setOrderId(id());
                  setCheckout(true);
                }}
              >
                پرداخت ترکیبی
              </Button>
            </>
          ) : (
            <Empty>سبد خرید خالی است.</Empty>
          )}
          {receipt && (
            <p className="success-text">
              رسید آزمایشی صادر شد. <bdi>{receipt.id.slice(0, 12)}</bdi>
            </p>
          )}
        </Card>
      </div>
      <Card>
        <h2>سفارش‌ها و رسیدهای من</h2>
        <OrderTable
          orders={state.orders.filter((order) => order.buyer === user?.id)}
        />
      </Card>
      <Card>
        <h2>کوپن‌های من</h2>
        <p>هر کوپن یک‌بار برای پذیرندهٔ مجاز قابل ثبت است.</p>
        {coupons.length ? (
          <div className="grid-two">
            {coupons.map((coupon) => (
              <CouponCard key={coupon.id} coupon={coupon} />
            ))}
          </div>
        ) : (
          <Empty>هنوز کوپنی ندارید.</Empty>
        )}
      </Card>
      {checkout && (
        <Modal title="پرداخت آزمایشی" onClose={() => setCheckout(false)}>
          {receipt ? (
            <>
              <p className="success-text">
                رسید <bdi>{receipt.id.slice(0, 12)}</bdi> ثبت شد.
              </p>
              <p>
                {num(receipt.cara)} کارا + {money(receipt.toman)}
              </p>
            </>
          ) : (
            <form
              className="form"
              onSubmit={(e) => {
                e.preventDefault();
                if (orderId)
                  send({
                    type: 'checkout',
                    id: orderId,
                    cart: activeCart,
                    cara: effective,
                  });
              }}
            >
              <label>
                سهم پرداخت با کارا
                <input
                  type="number"
                  min={0}
                  max={caraLimit}
                  value={effective}
                  onChange={(e) => setCara(Math.max(0, Number(e.target.value)))}
                />
              </label>
              <p>باقیماندهٔ تومانی: {money(total - effective * state.rate)}</p>
              <Button type="submit">
                <CreditCard size={18} /> صدور رسید آزمایشی
              </Button>
            </form>
          )}
        </Modal>
      )}
    </>
  );
}

export function Products({ user }: { user: User }) {
  const { state, send } = useDemo();
  const [selected, setSelected] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);
  const products = visibleProducts(state, user);
  const orders = state.orders.filter((order) =>
    order.lines.every((line) => line.product.vendor === user.id),
  );
  return (
    <>
      <Heading
        title="مدیریت فروشگاه"
        action={
          <Button
            onClick={() => {
              setSelected(null);
              setOpen(true);
            }}
          >
            افزودن کالا
          </Button>
        }
      >
        قیمت، موجودی و سفارش‌های فضای کاری شما.
      </Heading>
      <Card>
        <DataTable
          head={['کالا', 'منطقه', 'قیمت', 'موجودی', 'اقدام']}
          rows={products.map((p) => [
            p.name,
            districtName(p.district),
            money(p.price),
            num(p.stock),
            <Button
              key="edit"
              tone="quiet"
              onClick={() => {
                setSelected(p);
                setOpen(true);
              }}
            >
              ویرایش
            </Button>,
          ])}
        />
      </Card>
      {user.role === 'vendor' && (
        <Card>
          <h2>سفارش‌ها و تسویهٔ نمایشی</h2>
          <p className="muted">
            ارزش کارا در هر رسید با نرخ زمان خرید محاسبه می‌شود.
          </p>
          <OrderTable
            orders={orders}
            settle={(id) => send({ type: 'settle', id })}
          />
        </Card>
      )}
      {open && (
        <Modal
          title={selected ? 'ویرایش کالا' : 'افزودن کالا'}
          onClose={() => setOpen(false)}
        >
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              send({
                type: 'product',
                product: {
                  id: selected?.id ?? id(),
                  vendor: selected?.vendor ?? 'vendor',
                  district:
                    user.role === 'district'
                      ? user.district
                      : text(d, 'district'),
                  name: text(d, 'name'),
                  kind: text(d, 'kind') === 'physical' ? 'physical' : 'digital',
                  icon: selected?.icon ?? 'ticket',
                  price: number(d, 'price'),
                  stock: number(d, 'stock'),
                  topup: selected?.topup,
                  coupon: selected?.coupon,
                },
              });
              setOpen(false);
            }}
          >
            <label>
              نام کالا
              <input name="name" defaultValue={selected?.name} required />
            </label>
            <div className="grid-two">
              <label>
                نوع
                <select name="kind" defaultValue={selected?.kind}>
                  <option value="digital">دیجیتال</option>
                  <option value="physical">فیزیکی</option>
                </select>
              </label>
              {user.role === 'vendor' && (
                <label>
                  منطقه
                  <select
                    name="district"
                    defaultValue={selected?.district ?? user.district}
                  >
                    {districts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                قیمت تومانی
                <input
                  name="price"
                  type="number"
                  min={1}
                  defaultValue={selected?.price}
                  required
                />
              </label>
              <label>
                موجودی
                <input
                  name="stock"
                  type="number"
                  min={0}
                  defaultValue={selected?.stock ?? 0}
                  required
                />
              </label>
            </div>
            <Button type="submit">ذخیرهٔ کالا</Button>
          </form>
        </Modal>
      )}
    </>
  );
}

export function Scoring({ user }: { user: User }) {
  const { state, send } = useDemo();
  const district = user.role === 'hq' ? 'city' : user.district;
  const effective =
    state.revisions.find((revision) => revision.district === district) ??
    state.revisions.find((revision) => revision.district === 'city')!;
  return (
    <>
      <Heading title="ماتریس امتیازدهی">
        وزن‌ها برای امتیازدهی‌های جدید اعمال می‌شوند. امتیازهای قبلی با نسخهٔ خود
        باقی می‌مانند.
      </Heading>
      <Card>
        <h2>وزن‌های {districtName(district)}</h2>
        <form
          key={effective.id}
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            const d = new FormData(e.currentTarget);
            send({
              type: 'weights',
              district,
              weights: [number(d, '0'), number(d, '1'), number(d, '2')],
            });
          }}
        >
          <div className="grid-three">
            {parameters.map((label, i) => (
              <label key={label}>
                {label} (درصد)
                <input
                  type="number"
                  name={String(i)}
                  min={0}
                  max={100}
                  defaultValue={effective.weights[i]}
                  required
                />
              </label>
            ))}
          </div>
          <p className="muted">
            مجموع وزن‌ها باید ۱۰۰ باشد. امتیاز نهایی مجموع حاصل‌ضرب امتیاز خام
            در سهم هر وزن است.
          </p>
          <Button type="submit">ثبت نسخهٔ جدید</Button>
        </form>
      </Card>
      <Card>
        <h2>تاریخچهٔ نسخه‌ها</h2>
        <DataTable
          head={['نسخه', 'دامنه', 'تاریخ', ...parameters]}
          rows={state.revisions
            .filter(
              (r) =>
                user.role === 'hq' ||
                r.district === district ||
                r.district === 'city',
            )
            .map((r) => [
              <bdi key="id">{r.id}</bdi>,
              districtName(r.district),
              date(r.at),
              ...r.weights.map((w) => num(w) + '٪'),
            ])}
        />
      </Card>
    </>
  );
}

export function Audit() {
  const { state, send } = useDemo();
  return (
    <>
      <Heading title="مدیریت ستاد و ممیزی">
        تنظیمات کارا، دسترسی نقش‌ها و رویدادهای مشکوک را مرور کنید.
      </Heading>
      <div className="grid-two">
        <Card>
          <h2>سیاست کارا</h2>
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              send({
                type: 'settings',
                rate: number(d, 'rate'),
              });
            }}
          >
            <label>
              تومان برای هر کارا
              <input
                type="number"
                min={1}
                name="rate"
                defaultValue={state.rate}
                required
              />
            </label>
            <Button type="submit">ذخیرهٔ تنظیمات</Button>
          </form>
        </Card>
        <Card>
          <h2>دسته‌بندی خدمات</h2>
          <div className="pill-row">
            {state.categories.map((name) => (
              <Badge key={name}>{name}</Badge>
            ))}
          </div>
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              send({ type: 'category', name: text(d, 'name') });
            }}
          >
            <label>
              دستهٔ جدید
              <input name="name" required maxLength={60} />
            </label>
            <Button type="submit">افزودن دسته</Button>
          </form>
        </Card>
      </div>
      <Card>
        <h2>نقش‌ها و مجوزها</h2>
        <DataTable
          head={['نقش', 'بخش‌های مجاز', 'وضعیت']}
          rows={users.map((user) => [
            roleLabel[user.role],
            menu(user.role)
              .map((item) => routes[item])
              .join('، '),
            user.role === 'hq' ? (
              <Badge key="admin">فعال</Badge>
            ) : (
              <Button
                key="status"
                tone="quiet"
                onClick={() => send({ type: 'permission', role: user.role })}
              >
                {state.disabled.includes(user.role)
                  ? 'فعال کردن نقش'
                  : 'غیرفعال کردن نقش'}
              </Button>
            ),
          ])}
        />
      </Card>
      <Card>
        <h2>مجوز اقدامات هر نقش</h2>
        <p className="muted">
          غیرفعال کردن یک مجوز، دسترسی خواندن بخش را تغییر نمی‌دهد.
        </p>
        <DataTable
          head={['نقش', 'اقدامات مجاز']}
          rows={users
            .filter((user) => user.role !== 'hq')
            .map((user) => [
              roleLabel[user.role],
              <div className="pill-row" key={user.id}>
                {permissions[user.role].map((action) => (
                  <label className="permission-toggle" key={action}>
                    <input
                      type="checkbox"
                      checked={!blocked(state, user.role, action)}
                      onChange={() =>
                        send({ type: 'permission', role: user.role, action })
                      }
                    />
                    {permissionLabels[action]}
                  </label>
                ))}
              </div>,
            ])}
        />
      </Card>
      <Card>
        <h2>گردش مالی و دفتر کارا</h2>
        <DataTable
          head={['حساب', 'رویداد', 'کارا', 'نرخ تومان', 'تاریخ']}
          rows={state.ledger.map((row) => [
            roleLabel[row.owner],
            row.label,
            num(row.amount),
            money(row.rate),
            date(row.at),
          ])}
        />
      </Card>
      <Card>
        <h2>رسیدها و تسویه‌های شهری</h2>
        <OrderTable orders={state.orders} audit />
      </Card>
      <Card>
        <h2>هشدارهای نیازمند بررسی</h2>
        <DataTable
          head={['هشدار', 'وضعیت']}
          rows={state.fraud.map((flag) => [
            flag.note,
            flag.reviewed ? (
              <Badge key="done" status="approved">
                بررسی شد
              </Badge>
            ) : (
              <Button
                key="review"
                tone="quiet"
                onClick={() => send({ type: 'fraud', id: flag.id })}
              >
                ثبت بررسی
              </Button>
            ),
          ])}
        />
      </Card>
      <Card className="action-row">
        <Button onClick={() => send({ type: 'integration', source: '137' })}>
          ورود گزارش آزمایشی ۱۳۷
        </Button>
        <Button
          tone="quiet"
          onClick={() =>
            send({ type: 'integration', source: '137', fail: true })
          }
        >
          شبیه‌سازی خطای همگام‌سازی
        </Button>
      </Card>
    </>
  );
}
