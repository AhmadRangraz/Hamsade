import {
  blocked,
  permissions,
  privateCase,
  visibleCase,
  visibleProducts,
} from './access';
import { jalaliMonth } from './calendar';
import { districtName, districts, statusLabel, users } from './data';
import { gisLocations, municipalAdapters } from './integrations';
import { recordActivity, setRankingConsent } from './progression';
import type {
  Attachment,
  CivicCase,
  Course,
  Inspection,
  Permission,
  Product,
  Project,
  Role,
  Score,
  State,
  Status,
  User,
} from './types';

type CaseFields = Pick<
  CivicCase,
  | 'kind'
  | 'title'
  | 'category'
  | 'district'
  | 'description'
  | 'location'
  | 'date'
  | 'photo'
>;
export type Command =
  | { type: 'submit'; fields: CaseFields }
  | {
      type: 'case';
      id: string;
      action:
        | 'evaluate'
        | 'assign'
        | 'progress'
        | 'inspect'
        | 'approve'
        | 'rework'
        | 'reject'
        | 'merge'
        | 'vote'
        | 'evidence'
        | 'confirm';
      note?: string;
      values?: Score['values'];
      project?: Project;
      inspection?: Inspection;
      target?: string;
      document?: Attachment;
    }
  | { type: 'weights'; district: string; weights: Score['values'] }
  | { type: 'checkout'; id: string; cart: Record<string, number>; cara: number }
  | { type: 'withdraw'; id: string; amount: number }
  | { type: 'product'; product: Product }
  | { type: 'settle'; id: string }
  | { type: 'course'; course: Course }
  | {
      type: 'attendance';
      course: string;
      action: 'attend' | 'approve' | 'quiz' | 'pay';
      code?: string;
      answer?: string;
    }
  | { type: 'settings'; rate: number; cap: number }
  | { type: 'category'; name: string }
  | { type: 'permission'; role: Role; action?: Permission }
  | { type: 'fraud'; id: string }
  | { type: 'survey'; answer: string }
  | { type: 'rankingConsent'; optIn: boolean }
  | {
      type: 'integration';
      source: keyof typeof municipalAdapters;
      fail?: boolean;
    };

export type Outcome = { state: State; message: string; error?: boolean };
const integer = (value: number, min: number, max: number) =>
  Number.isSafeInteger(value) && value >= min && value <= max;
export const balance = (state: State, id: Role) =>
  state.ledger.reduce(
    (total, row) => total + (row.owner === id ? row.amount : 0),
    0,
  );
export const totalScore = (score: Score) =>
  score.values.reduce(
    (total, value, index) => total + value * score.revision.weights[index]!,
    0,
  ) / 100;
export const monthWithdrawals = (state: State, user: Role, now: string) =>
  state.ledger
    .filter(
      (row) =>
        row.owner === user &&
        row.key.startsWith('withdraw:') &&
        jalaliMonth(row.at) === jalaliMonth(now),
    )
    .reduce((sum, row) => sum - row.amount, 0);
const fail = (
  state: State,
  message = 'دسترسی یا وضعیت این عملیات معتبر نیست.',
): Outcome => ({ state, error: true, message });
const pass = (state: State, message = 'تغییرات ذخیره شد.'): Outcome => ({
  state,
  message,
});
const recordMove = (
  state: State,
  owner: Role,
  key: string,
  amount: number,
  label: string,
  at: string,
): State =>
  !amount || state.ledger.some((entry) => entry.key === key)
    ? state
    : {
        ...state,
        ledger: [
          { owner, key, amount, label, at, rate: state.rate },
          ...state.ledger,
        ],
      };
const repeated = (state: State, key: string, note: string) =>
  fail(
    state.fraud.some((flag) => flag.id === key)
      ? state
      : {
          ...state,
          fraud: [{ id: key, note, reviewed: false }, ...state.fraud],
        },
    'این عملیات قبلاً ثبت شده است.',
  );

export const transitions = {
  report: {
    evaluate: ['new', 'review'],
    assign: ['review'],
    progress: ['assigned', 'progress', 'rework'],
    inspect: ['progress'],
    approve: ['inspection'],
    rework: ['inspection'],
    reject: ['new', 'review'],
    merge: ['new', 'review'],
  },
  idea: {
    evaluate: ['new', 'review'],
    assign: ['review'],
    progress: ['assigned', 'progress', 'rework'],
    inspect: ['progress'],
    approve: ['inspection'],
    rework: ['inspection'],
    reject: ['new', 'review'],
    merge: ['new', 'review'],
  },
} satisfies Record<CivicCase['kind'], Record<string, Status[]>>;
const nextStatus = {
  evaluate: 'review',
  assign: 'assigned',
  progress: 'progress',
  inspect: 'inspection',
  approve: 'approved',
  rework: 'rework',
  reject: 'rejected',
  merge: 'merged',
} as const;
const validDay = (value: string) =>
  /^\d{4}-\d\d-\d\d$/.test(value) &&
  !isNaN(Date.parse(value)) &&
  new Date(value).toISOString().startsWith(value + 'T');

const imagePattern = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
const documentPattern =
  /^data:(?:application\/pdf|image\/(?:png|jpeg));base64,[A-Za-z0-9+/=]+$/;
const validData = (value: string, pattern: RegExp) =>
  value.length <= 470_000 && pattern.test(value);
const validPhoto = (value: string) => !value || validData(value, imagePattern);

function applyCase(
  state: State,
  user: User,
  cmd: Extract<Command, { type: 'case' }>,
  now: string,
): Outcome {
  const record = state.cases.find((item) => item.id === cmd.id);
  if (!record || !visibleCase(user, record)) return fail(state);
  const update = (next: CivicCase, source = state) =>
    pass({
      ...source,
      cases: source.cases.map((item) => (item.id === record.id ? next : item)),
    });
  const note = cmd.note?.trim() ?? '';
  const action = cmd.action;
  if (action === 'vote' || action === 'evidence' || action === 'confirm') {
    if (
      user.role !== 'citizen' ||
      ['merged', 'rejected'].includes(record.status)
    )
      return fail(state);
    if (action === 'confirm') {
      if (record.status !== 'approved' || record.confirmed) return fail(state);
      return update(
        { ...record, confirmed: true },
        recordActivity(state, user.id, 'qualityConfirmed', record.id, now),
      );
    }
    if (record.owner === user.id)
      return fail(state, 'مشارکت در پروندهٔ دیگر شهروندان فعال است.');
    if (action === 'vote') {
      if (record.votes.includes(user.id))
        return repeated(
          state,
          'vote:' + record.id,
          'تلاش تکراری برای رأی به ' + record.id,
        );
      return update(
        { ...record, votes: [...record.votes, user.id] },
        recordActivity(
          recordMove(
            state,
            user.id,
            'vote:' + record.id,
            2,
            'مشارکت محله',
            now,
          ),
          user.id,
          'caseVoted',
          record.id,
          now,
        ),
      );
    }
    return note.length >= 4
      ? update({ ...record, evidence: [...record.evidence, note] })
      : fail(state, 'توضیح بیشتری برای شواهد بنویسید.');
  }
  if (
    cmd.document &&
    (!['progress', 'inspect'].includes(action) ||
      !cmd.document.name.trim() ||
      cmd.document.name.length > 180 ||
      !validData(cmd.document.data, documentPattern))
  )
    return fail(state, 'پیوست اجرا معتبر نیست.');
  if (
    !transitions[record.kind][action].some((status) => status === record.status)
  )
    return fail(state, 'این اقدام در وضعیت فعلی ممکن نیست.');
  const status = nextStatus[action];
  const next = { ...record, status };
  let ledger = state;
  if (
    action === 'evaluate' ||
    action === 'assign' ||
    action === 'reject' ||
    action === 'merge'
  ) {
    if (user.role !== 'district') return fail(state);
    if (action === 'evaluate') {
      if (!cmd.values || !cmd.values.every((value) => integer(value, 0, 100)))
        return fail(state, 'امتیازها باید بین صفر و صد باشند.');
      if (record.score)
        return fail(state, 'این پرونده قبلاً امتیازدهی شده است.');
      const revision =
        state.revisions.find((item) => item.district === record.district) ??
        state.revisions.find((item) => item.district === 'city')!;
      next.score = { revision, values: cmd.values };
      if (record.kind === 'report') {
        ledger = recordMove(
          state,
          record.owner,
          'valid:' + record.id,
          12,
          'اعتبار گزارش معتبر',
          now,
        );
        ledger = recordActivity(
          ledger,
          record.owner,
          'reportValidated',
          record.id,
          now,
        );
      }
    }
    if (action === 'assign') {
      const p = cmd.project;
      if (
        !record.score ||
        !p ||
        !note ||
        !['internal', 'direct', 'tender'].includes(p.method) ||
        !integer(p.price, p.method === 'internal' ? 0 : 1, 1_000_000_000) ||
        p.worker !== (p.method === 'internal' ? 'district' : 'contractor') ||
        p.inspector !== 'inspector' ||
        !users.some(
          (worker) =>
            worker.id === p.worker && worker.district === record.district,
        )
      )
        return fail(state, 'امتیاز، مجری منطقه و شرایط ارجاع را بررسی کنید.');
      next.project = p;
    }
    if ((action === 'reject' || action === 'merge') && !note)
      return fail(state, 'ثبت دلیل الزامی است.');
    if (action === 'merge') {
      const target = state.cases.find(
        (item) =>
          item.id === cmd.target &&
          item.id !== record.id &&
          item.district === record.district &&
          item.kind === record.kind &&
          item.status !== 'merged' &&
          item.status !== 'rejected',
      );
      if (!target)
        return fail(state, 'پروندهٔ مقصد باید از همان نوع و منطقه باشد.');
      next.mergedInto = target.id;
    }
  } else if (action === 'progress' || action === 'inspect') {
    if (
      !privateCase(user, record) ||
      record.project?.worker !== user.id ||
      !note
    )
      return fail(state, 'مجری پرونده باید شرح پیشرفت ثبت کند.');
  } else {
    if (
      user.role !== 'inspector' ||
      record.project?.inspector !== user.id ||
      !note
    )
      return fail(state, 'ثبت نتیجه و دلیل بازرسی الزامی است.');
    const inspection = cmd.inspection;
    if (
      !inspection ||
      !inspection.checklist.trim() ||
      !gisLocations(record.district).includes(inspection.location) ||
      !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(inspection.at) ||
      !Number.isFinite(Date.parse(inspection.at)) ||
      !validPhoto(inspection.photo) ||
      !integer(inspection.quality, 0, 100)
    )
      return fail(state, 'تاریخ، محل، چک‌لیست و امتیاز بازرسی را بررسی کنید.');
    next.inspections = [...record.inspections, inspection];
    if (action === 'approve') {
      if (record.kind === 'idea') {
        ledger = recordMove(
          state,
          record.owner,
          'idea:' + record.id,
          25,
          'پاداش پیشنهاد اجراشده',
          now,
        );
        ledger = recordActivity(
          ledger,
          record.owner,
          'ideaApproved',
          record.id,
          now,
        );
      }
      if (record.project.worker === 'contractor')
        ledger = recordMove(
          ledger,
          'contractor',
          'quality:' + record.id,
          Math.floor(inspection.quality / 5),
          'پاداش کیفیت پیمانکار',
          now,
        );
    }
    if (action === 'rework' && record.project.worker === 'contractor')
      ledger = recordMove(
        state,
        'contractor',
        'rework:' + record.id + ':' + record.inspections.length,
        -Math.min(5, balance(state, 'contractor')),
        'کسر بابت اصلاح کار',
        now,
      );
  }
  return update(
    {
      ...next,
      events: [
        ...record.events,
        {
          at: now,
          status,
          note: note || statusLabel[status],
          by: user.id,
          document: cmd.document,
        },
      ],
    },
    ledger,
  );
}

export function execute(
  state: State,
  user: User,
  cmd: Command,
  now = new Date().toISOString(),
): Outcome {
  const actor = users.find((candidate) => candidate.id === user.id);
  if (
    !actor ||
    actor.role !== user.role ||
    actor.district !== user.district ||
    state.disabled.includes(user.id)
  )
    return fail(state);
  if (blocked(state, user.role, cmd.type))
    return fail(state, 'این مجوز برای نقش فعلی غیرفعال است.');
  switch (cmd.type) {
    case 'case':
      return applyCase(state, user, cmd, now);
    case 'submit': {
      const f = cmd.fields;
      if (
        user.role !== 'citizen' ||
        !['report', 'idea'].includes(f.kind) ||
        !state.categories.includes(f.category) ||
        !gisLocations(f.district).includes(f.location) ||
        !validDay(f.date) ||
        !validPhoto(f.photo) ||
        f.title.trim().length < 4 ||
        f.description.trim().length < 8
      )
        return fail(state, 'عنوان، شرح، تاریخ و محل را کامل کنید.');
      const id = 'M-' + (1050 + state.cases.length);
      return pass(
        {
          ...state,
          cases: [
            {
              ...f,
              id,
              owner: user.id,
              status: 'new',
              votes: [],
              evidence: [],
              confirmed: false,
              inspections: [],
              events: [
                { at: now, status: 'new', note: 'ثبت شهروند', by: user.id },
              ],
            },
            ...state.cases,
          ],
        },
        'پرونده ثبت شد.',
      );
    }
    case 'weights': {
      if (
        !(
          (user.role === 'hq' && cmd.district === 'city') ||
          (user.role === 'district' && cmd.district === user.district)
        ) ||
        !cmd.weights.every((n) => integer(n, 0, 100)) ||
        cmd.weights.reduce((a, b) => a + b, 0) !== 100
      )
        return fail(state, 'مجموع وزن‌های مجاز باید دقیقاً ۱۰۰ باشد.');
      return pass(
        {
          ...state,
          revisions: [
            {
              id: 'V-' + (state.revisions.length + 1),
              district: cmd.district,
              at: now,
              weights: cmd.weights,
            },
            ...state.revisions,
          ],
        },
        'نسخهٔ جدید فقط برای امتیازدهی‌های بعدی اعمال می‌شود.',
      );
    }
    case 'checkout': {
      if (user.role !== 'citizen' || !cmd.id.trim()) return fail(state);
      if (state.orders.some((order) => order.id === cmd.id))
        return pass(state, 'رسید این سفارش پیش‌تر صادر شده است.');
      const lines = Object.entries(cmd.cart).flatMap(([id, quantity]) => {
        const product = state.products.find((item) => item.id === id);
        return product && integer(quantity, 1, product.stock)
          ? [{ product, quantity }]
          : [];
      });
      if (!lines.length || lines.length !== Object.keys(cmd.cart).length)
        return fail(state, 'موجودی یا تعداد یکی از کالاها معتبر نیست.');
      const total = lines.reduce(
        (sum, line) => sum + line.product.price * line.quantity,
        0,
      );
      const payable = lines.reduce(
        (sum, line) =>
          sum + (line.product.topup ? 0 : line.product.price * line.quantity),
        0,
      );
      if (
        !integer(
          cmd.cara,
          0,
          Math.min(balance(state, user.id), Math.floor(payable / state.rate)),
        )
      )
        return fail(state, 'مبلغ کارا از موجودی یا سقف قابل پرداخت بیشتر است.');
      const order = {
        id: cmd.id,
        buyer: user.id,
        lines,
        cara: cmd.cara,
        toman: total - cmd.cara * state.rate,
        rate: state.rate,
        at: now,
      };
      const products = state.products.map((product) => ({
        ...product,
        stock: product.stock - (cmd.cart[product.id] ?? 0),
      }));
      let next = recordMove(
        { ...state, products, orders: [order, ...state.orders] },
        user.id,
        'spend:' + cmd.id,
        -cmd.cara,
        'خرید از فروشگاه',
        now,
      );
      const topup = lines.reduce(
        (sum, line) => sum + (line.product.topup ?? 0) * line.quantity,
        0,
      );
      next = recordMove(
        next,
        user.id,
        'topup:' + cmd.id,
        topup,
        'شارژ آزمایشی کارا',
        now,
      );
      if (payable > 0)
        next = recordMove(
          next,
          user.id,
          'purchase:' + cmd.id,
          1,
          'پاداش خرید',
          now,
        );
      return pass(next, 'سفارش و رسید آزمایشی ثبت شد.');
    }
    case 'withdraw': {
      if (user.role !== 'citizen' || !cmd.id.trim()) return fail(state);
      const key = 'withdraw:' + cmd.id;
      if (state.ledger.some((row) => row.key === key))
        return repeated(state, key, 'تلاش تکراری برای برداشت');
      if (
        !integer(
          cmd.amount,
          1,
          Math.min(
            balance(state, user.id),
            state.cap - monthWithdrawals(state, user.id, now),
          ),
        )
      )
        return fail(state, 'مبلغ از موجودی یا سقف ماه شمسی بیشتر است.');
      return pass(
        recordMove(state, user.id, key, -cmd.amount, 'برداشت آزمایشی', now),
      );
    }
    case 'product': {
      const p = cmd.product;
      const existing = state.products.find((item) => item.id === p.id);
      if (
        !['vendor', 'district'].includes(user.role) ||
        (existing && !visibleProducts(state, user).includes(existing)) ||
        (user.role === 'vendor' && p.vendor !== user.id) ||
        (user.role === 'district' && p.district !== user.district) ||
        !districts.some((district) => district.id === p.district) ||
        !['physical', 'digital'].includes(p.kind) ||
        !p.name.trim() ||
        !integer(p.price, 1, 1_000_000_000) ||
        !integer(p.stock, 0, 100_000) ||
        p.topup !== existing?.topup
      )
        return fail(state, 'مالکیت، قیمت یا موجودی کالا معتبر نیست.');
      return pass({
        ...state,
        products: [p, ...state.products.filter((item) => item.id !== p.id)],
      });
    }
    case 'settle': {
      const order = state.orders.find((item) => item.id === cmd.id);
      if (
        user.role !== 'vendor' ||
        !order ||
        order.settledAt ||
        !order.lines.every((line) => line.product.vendor === user.id)
      )
        return fail(state);
      return pass(
        {
          ...state,
          orders: state.orders.map((item) =>
            item.id === cmd.id ? { ...item, settledAt: now } : item,
          ),
        },
        'تسویهٔ تومانی شبیه‌سازی شد.',
      );
    }
    case 'course': {
      const c = cmd.course;
      const existing = state.courses.find((item) => item.id === c.id);
      if (
        user.role !== 'instructor' ||
        c.instructor !== user.id ||
        c.district !== user.district ||
        (existing && existing.instructor !== user.id) ||
        !['local', 'online'].includes(c.mode) ||
        !c.title.trim() ||
        !c.lesson.trim() ||
        !c.venue.trim() ||
        !validDay(c.date) ||
        !/^\d{4}$/.test(c.code) ||
        !integer(c.reward, 0, 100)
      )
        return fail(state, 'اطلاعات دوره یا کد چهاررقمی معتبر نیست.');
      return pass({
        ...state,
        courses: [c, ...state.courses.filter((item) => item.id !== c.id)],
      });
    }
    case 'attendance': {
      const course = state.courses.find((item) => item.id === cmd.course);
      if (!course || course.district !== user.district) return fail(state);
      const participant = 'citizen';
      const current = state.attendance.find(
        (item) => item.course === course.id && item.user === participant,
      ) ?? {
        course: course.id,
        user: participant,
        attended: false,
        approved: false,
        passed: false,
      };
      const row = { ...current };
      if (cmd.action === 'attend' || cmd.action === 'quiz') {
        if (user.id !== participant) return fail(state);
        if (cmd.action === 'attend') {
          if (
            ![course.code, 'CIVIC:' + course.id + ':' + course.code].includes(
              cmd.code ?? '',
            )
          )
            return fail(state, 'کد حضور اشتباه است.');
          row.attended = true;
        } else {
          if (!row.attended || cmd.answer !== 'yes')
            return fail(
              state,
              'ابتدا حضور را ثبت کنید و پاسخ صحیح را انتخاب کنید.',
            );
          row.passed = true;
        }
      } else {
        if (
          user.role !== 'instructor' ||
          course.instructor !== user.id ||
          !row.attended
        )
          return fail(state, 'هنوز حضور ثبت نشده است.');
        if (cmd.action === 'approve') row.approved = true;
        else {
          if (!row.approved || !row.passed)
            return fail(state, 'تأیید حضور و قبولی آزمون الزامی است.');
          const key = 'course:' + course.id + ':' + participant;
          if (state.ledger.some((entry) => entry.key === key))
            return repeated(state, key, 'تلاش تکراری برای پاداش دوره');
          return pass(
            recordMove(
              state,
              participant,
              key,
              course.reward,
              'پاداش دورهٔ ' + course.title,
              now,
            ),
          );
        }
      }
      const progress =
        row.approved && row.passed && !(current.approved && current.passed)
          ? recordActivity(
              state,
              participant,
              'courseCompleted',
              course.id,
              now,
            )
          : state;
      return pass({
        ...progress,
        attendance: [
          row,
          ...state.attendance.filter(
            (item) => item.course !== course.id || item.user !== participant,
          ),
        ],
      });
    }
    case 'settings':
      return user.role === 'hq' &&
        integer(cmd.rate, 1, 1_000_000) &&
        integer(cmd.cap, 0, 100_000)
        ? pass({ ...state, rate: cmd.rate, cap: cmd.cap })
        : fail(state);
    case 'category':
      return user.role === 'hq' &&
        cmd.name.trim() &&
        !state.categories.includes(cmd.name.trim())
        ? pass({ ...state, categories: [...state.categories, cmd.name.trim()] })
        : fail(state);
    case 'permission': {
      if (
        user.role !== 'hq' ||
        cmd.role === 'hq' ||
        !users.some((candidate) => candidate.id === cmd.role)
      )
        return fail(state);
      if (!cmd.action)
        return pass({
          ...state,
          disabled: state.disabled.includes(cmd.role)
            ? state.disabled.filter((role) => role !== cmd.role)
            : [...state.disabled, cmd.role],
        });
      const action = cmd.action;
      if (!permissions[cmd.role].includes(action)) return fail(state);
      const actions = state.blocked?.[cmd.role] ?? [];
      return pass({
        ...state,
        blocked: {
          ...state.blocked,
          [cmd.role]: actions.includes(action)
            ? actions.filter((item) => item !== action)
            : [...actions, action],
        },
      });
    }
    case 'fraud':
      return user.role === 'hq' &&
        state.fraud.some((flag) => flag.id === cmd.id)
        ? pass({
            ...state,
            fraud: state.fraud.map((flag) =>
              flag.id === cmd.id ? { ...flag, reviewed: true } : flag,
            ),
          })
        : fail(state);
    case 'rankingConsent':
      return user.role === 'citizen' && typeof cmd.optIn === 'boolean'
        ? pass(setRankingConsent(state, cmd.optIn))
        : fail(state);
    case 'survey': {
      if (
        user.role !== 'citizen' ||
        !['clean', 'parks', 'safety'].includes(cmd.answer)
      )
        return fail(state);
      return state.ledger.some((row) => row.key === 'survey:citizen')
        ? repeated(state, 'survey:citizen', 'پاسخ چندباره به نظرسنجی')
        : pass(
            recordActivity(
              recordMove(
                { ...state, survey: { answer: cmd.answer, at: now } },
                user.id,
                'survey:citizen',
                5,
                'مشارکت در نظرسنجی',
                now,
              ),
              user.id,
              'surveyAnswered',
              'neighborhood-v1',
              now,
            ),
          );
    }
    case 'integration': {
      if (
        cmd.source === '137'
          ? !['district', 'hq'].includes(user.role)
          : user.role !== 'citizen'
      )
        return fail(state);
      if (cmd.fail)
        return fail(state, 'ارتباط آزمایشی برقرار نشد. دوباره تلاش کنید.');
      const event = municipalAdapters[cmd.source];
      if (state.imports.includes(event.id))
        return repeated(state, event.id, 'شناسهٔ رویداد تکراری ' + event.id);
      const next = { ...state, imports: [event.id, ...state.imports] };
      if (cmd.source === '137') {
        const f = municipalAdapters['137'];
        if (user.role === 'district' && f.district !== user.district)
          return fail(state);
        const record: CivicCase = {
          ...f,
          kind: 'report',
          category: state.categories[0]!,
          owner: 'district',
          date: now.slice(0, 10),
          photo: '',
          status: 'new',
          inspections: [],
          votes: [],
          confirmed: false,
          evidence: [],
          events: [
            {
              at: now,
              status: 'new',
              note: 'ورود از ۱۳۷ آزمایشی · ' + districtName(f.district),
              by: user.id,
            },
          ],
        };
        return pass({ ...next, cases: [record, ...next.cases] });
      }
      const payment = municipalAdapters[cmd.source];
      return pass(
        recordMove(
          next,
          user.id,
          payment.id,
          payment.reward,
          payment.label,
          now,
        ),
        payment.label,
      );
    }
  }
}
