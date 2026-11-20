import { describe, expect, it } from 'vitest';
import { canOpen, privateCase, visibleCase, visibleProducts } from './access';
import {
  digits,
  jalaliInput,
  jalaliMonth,
  parseJalali,
  tehranInstant,
} from './calendar';
import {
  balance,
  execute,
  monthWithdrawals,
  totalScore,
  type Command,
} from './commands';
import { seed, users } from './data';
import type { Role, State } from './types';

const time = '2026-11-20T12:00:00Z';
function perform(state: State, role: Role, command: Command, at = time) {
  return execute(
    state,
    users.find((u) => u.id === role)!,
    command,
    at,
  );
}
const added: Command = {
  type: 'submit',
  fields: {
    title: 'چراغ خراب خیابان',
    kind: 'report',
    district: 'north',
    description: 'لامپ اصلی مسیر پیاده‌رو خاموش است.',
    location: 'خیابان آبان',
    date: '2026-11-20',
    category: 'روشنایی',
    photo: '',
  },
};
const inspect = {
  at: '2026-11-20T06:30:00Z',
  location: 'خیابان آبان',
  quality: 90,
  checklist: 'بازدید انجام شد',
  photo: '',
};

describe('municipality permissions and case integrity', () => {
  it('scopes managed workspaces and hides private case data from other citizens', () => {
    const state = seed();
    const south = state.cases.find((c) => c.district === 'south')!;
    const idea = state.cases.find(
      (c) => c.kind === 'idea' && c.owner === 'district',
    )!;
    const who = (role: Role) => users.find((u) => u.id === role)!;
    expect(canOpen('citizen', 'audit')).toBe(false);
    expect(canOpen('vendor', 'products')).toBe(true);
    expect(canOpen('inspector', 'execution')).toBe(false);
    expect(visibleCase(who('district'), south)).toBe(false);
    expect(privateCase(who('citizen'), idea)).toBe(false);
    expect(
      visibleProducts(state, who('district')).every(
        (p) => p.district === 'north',
      ),
    ).toBe(true);
    expect(
      perform(state, 'district', {
        type: 'case',
        id: south.id,
        action: 'evaluate',
        values: [90, 90, 90],
      }).error,
    ).toBe(true);
    expect(
      perform(state, 'citizen', {
        type: 'weights',
        district: 'north',
        weights: [30, 30, 40],
      }).state,
    ).toBe(state);
  });
  it('lets HQ suspend an allowed action without granting new permissions', () => {
    const state = seed();
    const command: Command = {
      type: 'permission',
      role: 'citizen',
      action: 'submit',
    };
    expect(perform(state, 'district', command).state).toBe(state);
    const blocked = perform(state, 'hq', command).state;
    expect(perform(blocked, 'citizen', added).state).toBe(blocked);
    const restored = perform(blocked, 'hq', command).state;
    expect(perform(restored, 'citizen', added).error).toBeUndefined();
    expect(perform(state, 'hq', { ...command, action: 'settle' }).state).toBe(
      state,
    );
  });
  it('keeps scoring snapshots immutable and enforces execution, rework and reward boundaries', () => {
    let state = perform(seed(), 'citizen', added).state;
    const id = state.cases[0]!.id;
    const run = (
      role: Role,
      action: Omit<Extract<Command, { type: 'case' }>, 'type' | 'id'>,
    ) => {
      const result = perform(state, role, { type: 'case', id, ...action });
      expect(result.error, result.message).toBeUndefined();
      state = result.state;
    };
    const citizenBefore = balance(state, 'citizen');
    run('district', { action: 'evaluate', values: [100, 80, 50] });
    const snapshot = state.cases[0]!.score!;
    expect(totalScore(snapshot)).toBe(83);
    expect(balance(state, 'citizen')).toBe(citizenBefore + 12);
    expect(
      perform(state, 'district', {
        type: 'weights',
        district: 'north',
        weights: [10, 10, 10],
      }).error,
    ).toBe(true);
    state = perform(state, 'district', {
      type: 'weights',
      district: 'north',
      weights: [15, 25, 60],
    }).state;
    expect(state.cases[0]!.score).toEqual(snapshot);
    run('district', {
      action: 'assign',
      note: 'رفع مشکل روشنایی',
      project: {
        worker: 'contractor',
        inspector: 'inspector',
        method: 'direct',
        price: 150000,
      },
    });
    expect(
      perform(state, 'citizen', {
        type: 'case',
        id,
        action: 'progress',
        note: 'پیشرفت',
      }).error,
    ).toBe(true);
    run('contractor', { action: 'progress', note: 'اجرای آزمایشی' });
    run('contractor', { action: 'inspect', note: 'آمادهٔ بررسی' });
    const contractorBefore = balance(state, 'contractor');
    run('inspector', {
      action: 'rework',
      note: 'اتصال نیاز به اصلاح دارد',
      inspection: inspect,
    });
    expect(balance(state, 'contractor')).toBe(contractorBefore - 5);
    run('contractor', { action: 'progress', note: 'اتصال اصلاح شد' });
    run('contractor', { action: 'inspect', note: 'آمادهٔ بازبینی' });
    run('inspector', {
      action: 'approve',
      note: 'کنترل دوباره انجام شد',
      inspection: inspect,
    });
    expect(balance(state, 'contractor')).toBe(contractorBefore - 5 + 18);
    expect(state.cases[0]!.inspections).toHaveLength(2);
    run('citizen', { action: 'confirm' });
    expect(state.cases[0]!.confirmed).toBe(true);
    expect(
      perform(state, 'inspector', {
        type: 'case',
        id,
        action: 'approve',
        note: 'تکرار',
        inspection: inspect,
      }).state,
    ).toBe(state);
  });
  it('preserves merge links and enforces a reason', () => {
    const state = perform(seed(), 'citizen', added).state;
    const id = state.cases[0]!.id;
    const merge: Command = {
      type: 'case',
      id,
      action: 'merge',
      target: 'M-1048',
    };
    expect(perform(state, 'district', merge).error).toBe(true);
    const result = perform(state, 'district', {
      ...merge,
      note: 'همان مورد در حال بررسی است',
    });
    expect(result.state.cases[0]).toMatchObject({
      status: 'merged',
      mergedInto: 'M-1048',
    });
  });
});

describe('Jalali dates and Cara transactions', () => {
  it('round trips dates, rejects invalid leap days and uses Tehran month boundaries', () => {
    expect(digits('۱۲٣٤')).toBe('1234');
    expect(tehranInstant('2026-11-20', '08:00')).toBe(
      '2026-11-20T04:30:00.000Z',
    );
    expect(tehranInstant('2026-11-20', '25:00')).toBeNull();
    expect(parseJalali('۱۴۰۳/۱۲/۳۰')).toBe('2025-03-20');
    expect(parseJalali('۱۴۰۴/۱۲/۳۰')).toBeNull();
    expect(parseJalali('۱۴۰۴/۰۶/۳۲')).toBeNull();
    expect(jalaliInput('2025-03-21')).toBe('۱۴۰۴/۰۱/۰۱');
    expect(jalaliMonth('2025-03-20T20:29:59Z')).toBe('۱۴۰۳/۱۲');
    expect(jalaliMonth('2025-03-20T20:30:00Z')).toBe('۱۴۰۴/۰۱');
  });
  it('retries checkout without charging twice and rejects invalid stock or payment splits', () => {
    const state = seed();
    const command: Command = {
      type: 'checkout',
      id: 'mixed-test',
      cart: { parking: 1, safety: 1 },
      cara: 20,
    };
    const next = perform(state, 'citizen', command).state;
    expect(next.orders[0]).toMatchObject({
      cara: 20,
      toman: 145000,
      rate: 1000,
    });
    expect(next.products.find((p) => p.id === 'parking')?.stock).toBe(11);
    expect(balance(next, 'citizen')).toBe(226);
    expect(perform(next, 'citizen', command).state).toBe(next);
    expect(
      perform(state, 'citizen', { ...command, cart: { parking: 200 } }).state,
    ).toBe(state);
    expect(
      perform(state, 'citizen', { ...command, cart: { topup: 1 } }).state,
    ).toBe(state);
    expect(perform(state, 'citizen', { ...command, cara: 250 }).state).toBe(
      state,
    );
  });
  it('enforces the per-Jalali-month withdrawal cap and flags repeat requests', () => {
    const start = '2025-03-20T20:29:59Z';
    const next = '2025-03-20T20:30:00Z';
    const command: Command = {
      type: 'withdraw',
      id: 'withdraw-one',
      amount: 150,
    };
    const state = perform(seed(), 'citizen', command, start).state;
    expect(monthWithdrawals(state, 'citizen', start)).toBe(150);
    expect(monthWithdrawals(state, 'citizen', next)).toBe(0);
    expect(
      perform(state, 'citizen', { ...command, id: 'two', amount: 1 }, start)
        .error,
    ).toBe(true);
    expect(
      perform(state, 'citizen', { ...command, id: 'two', amount: 1 }, next)
        .error,
    ).toBeUndefined();
    expect(perform(state, 'citizen', command, start).state.fraud[0]?.id).toBe(
      'withdraw:withdraw-one',
    );
  });
  it('awards a course only after attendance, approval and quiz, at most once', () => {
    let state = seed();
    const cmd = (
      role: Role,
      action: Extract<Command, { type: 'attendance' }>['action'],
      extra: { code?: string; answer?: string } = {},
    ) =>
      perform(state, role, {
        type: 'attendance',
        course: 'waste',
        action,
        ...extra,
      });
    expect(cmd('instructor', 'pay').error).toBe(true);
    state = cmd('citizen', 'attend', { code: 'CIVIC:waste:2486' }).state;
    state = cmd('instructor', 'approve').state;
    expect(cmd('instructor', 'pay').error).toBe(true);
    expect(cmd('citizen', 'quiz', { answer: 'no' }).error).toBe(true);
    state = cmd('citizen', 'quiz', { answer: 'yes' }).state;
    state = cmd('instructor', 'pay').state;
    expect(balance(state, 'citizen')).toBe(260);
    const repeat = cmd('instructor', 'pay');
    expect(repeat.error).toBe(true);
    expect(balance(repeat.state, 'citizen')).toBe(260);
  });
  it('keeps failed integration requests retryable and deduplicates external events', () => {
    const state = seed();
    expect(
      perform(state, 'citizen', { type: 'integration', source: '137' }).state,
    ).toBe(state);
    expect(
      perform(state, 'district', {
        type: 'integration',
        source: '137',
        fail: true,
      }).state,
    ).toBe(state);
    const next = perform(state, 'district', {
      type: 'integration',
      source: '137',
    }).state;
    expect(next.cases[0]?.id).toBe('137-8001');
    expect(
      perform(next, 'district', { type: 'integration', source: '137' }).state
        .cases,
    ).toHaveLength(next.cases.length);
  });
});
