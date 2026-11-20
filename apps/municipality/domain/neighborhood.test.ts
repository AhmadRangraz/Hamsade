import { describe, expect, it } from 'vitest';
import { execute, balance, type Command } from './commands';
import { brand, homeDistrict, restoreDemo, seed, users } from './data';
import { ownedCoupons } from './coupons';
import { caseProgress, neighborhoodIssues, topDistrict } from './neighborhood';
import { civicProgress } from './progression';
import type { Role, State } from './types';

const now = '2026-11-20T12:00:00Z';
const later = '2026-11-21T12:00:00Z';
const person = (role: Role) => users.find((user) => user.id === role)!;
const run = (state: State, role: Role, command: Command, at = now) =>
  execute(state, person(role), command, at);
const issue = 'M-1050';
const evidence = {
  id: 'd67c38ba-0ba0-47cc-ac7c-7e9e00c00719',
  mime: 'video/webm',
  name: 'proof.webm',
  size: 1100,
};
const review = {
  at: now,
  location: 'بوستان سپید',
  quality: 92,
  checklist: 'تطبیق مدرک با گزارش',
  photo: '',
};
const findCase = (state: State) =>
  state.cases.find((record) => record.id === issue)!;

describe('Karashahr neighborhood', () => {
  it('lists reports from other owners in Area 5 and keeps uploads distinct from tabular public data', () => {
    const state = seed();
    expect(brand.name).toBe('کاراشهر');
    expect(person('citizen').district).toBe(homeDistrict);
    const local = neighborhoodIssues(state, person('citizen'));
    expect(local.map((record) => record.id)).toContain(issue);
    expect(
      local.some(
        (record) =>
          record.district !== homeDistrict || record.owner === 'citizen',
      ),
    ).toBe(false);
    expect(topDistrict(state)).toMatchObject({ id: homeDistrict, resolved: 1 });
  });

  it('credits one reward only after inspector approval and accepts revised proof', () => {
    const state = seed();
    const action = (
      state: State,
      role: Role,
      cmd: Omit<Extract<Command, { type: 'case' }>, 'id' | 'type'>,
    ) => run(state, role, { type: 'case', id: issue, ...cmd });
    expect(caseProgress(findCase(state))).toBe(25);
    expect(action(state, 'district', { action: 'claimVolunteer' }).error).toBe(
      true,
    );
    const claimed = action(state, 'citizen', {
      action: 'claimVolunteer',
    }).state;
    expect(caseProgress(findCase(claimed))).toBe(45);
    expect(action(claimed, 'citizen', { action: 'claimVolunteer' }).error).toBe(
      true,
    );
    expect(
      action(claimed, 'citizen', {
        action: 'submitProof',
        note: 'جمع‌آوری انجام شد',
      }).error,
    ).toBe(true);
    expect(
      action(claimed, 'citizen', {
        action: 'submitProof',
        note: 'جمع‌آوری انجام شد',
        proof: { ...evidence, mime: 'image/svg+xml' },
      }).error,
    ).toBe(true);
    const proof = {
      action: 'submitProof',
      note: 'پاکسازی تأییدپذیر انجام شد',
      proof: evidence,
    } as const;
    const sent = action(claimed, 'citizen', proof).state;
    expect(caseProgress(findCase(sent))).toBe(85);
    expect(balance(sent, 'citizen')).toBe(balance(state, 'citizen'));
    expect(
      action(sent, 'citizen', {
        action: 'approve',
        note: 'تأیید',
        inspection: review,
      }).error,
    ).toBe(true);
    const rework = action(sent, 'inspector', {
      action: 'rework',
      note: 'بازبینی تصویر لازم است',
      inspection: review,
    }).state;
    expect(caseProgress(findCase(rework))).toBe(65);
    const resent = action(rework, 'citizen', proof).state;
    const approved = action(resent, 'inspector', {
      action: 'approve',
      note: 'رفع مسئله بررسی شد',
      inspection: review,
    }).state;
    expect(caseProgress(findCase(approved))).toBe(100);
    expect(balance(approved, 'citizen')).toBe(balance(state, 'citizen') + 30);
    expect(
      civicProgress(approved, now).entries.filter(
        (entry) => entry.event === 'issueSolved',
      ),
    ).toHaveLength(1);
    expect(
      action(approved, 'inspector', {
        action: 'approve',
        note: 'تأیید دوباره',
        inspection: review,
      }).state,
    ).toBe(approved);
    expect(action(approved, 'citizen', { action: 'confirm' }).state).toBe(
      approved,
    );
  });

  it('awards event XP after an authorized attendance check, only once', () => {
    const state = seed();
    const event = 'park-cleanup';
    const join = { type: 'eventAttendance', action: 'join', event } as const;
    const approve = {
      type: 'eventAttendance',
      action: 'approve',
      event,
    } as const;
    expect(run(state, 'district', approve).error).toBe(true);
    const enrolled = run(state, 'citizen', join).state;
    expect(civicProgress(enrolled, now).xp).toBe(0);
    expect(run(enrolled, 'citizen', approve).error).toBe(true);
    expect(
      run(enrolled, 'district', approve, '2026-11-19T12:00:00Z').error,
    ).toBe(true);
    const approved = run(enrolled, 'district', approve, later).state;
    expect(civicProgress(approved, later).xp).toBe(20);
    expect(run(approved, 'district', approve, later).state).toBe(approved);
  });

  it('issues purchased coupons and honors each only at its configured acceptors', () => {
    const purchased = run(seed(), 'citizen', {
      type: 'checkout',
      id: 'coupons-test',
      cart: { parking: 1, shahrvand: 1 },
      cara: 100,
    }).state;
    const mine = ownedCoupons(purchased, 'citizen');
    const parking = mine.find(
      (coupon) => coupon.id === 'coupons-test/parking/1',
    )!;
    const shahrvand = mine.find(
      (coupon) => coupon.id === 'coupons-test/shahrvand/1',
    )!;
    expect(parking.value).toBe(100000);
    expect(shahrvand.value).toBe(500000);
    const parkingUse = {
      type: 'redeemCoupon',
      coupon: parking.id,
      location: 'parking-5',
    } as const;
    expect(
      run(purchased, 'citizen', { ...parkingUse, location: 'uncontracted' })
        .error,
    ).toBe(true);
    expect(
      run(purchased, 'citizen', { ...parkingUse, coupon: shahrvand.id }).error,
    ).toBe(true);
    expect(run(purchased, 'vendor', parkingUse).error).toBe(true);
    const used = run(purchased, 'citizen', parkingUse);
    expect(used.error).toBeUndefined();
    expect(run(used.state, 'citizen', parkingUse).error).toBe(true);
    expect(
      run(used.state, 'citizen', {
        ...parkingUse,
        coupon: shahrvand.id,
        location: 'shahrvand-demo',
      }).error,
    ).toBeUndefined();
  });

  it('updates legacy sample catalog prices and keeps custom prices, stock and ledgers', () => {
    const current = seed();
    const legacy = {
      ...current,
      cases: current.cases.filter((record) => record.id !== issue),
      courses: current.courses.filter(
        (course) => course.id !== 'civil-emergency',
      ),
      products: current.products
        .filter((product) => product.id !== 'shahrvand')
        .map((product) =>
          product.id === 'parking'
            ? { ...product, price: 40000, stock: 5 }
            : product.id === 'fire'
              ? { ...product, price: 312000 }
              : product,
        ),
    };
    const next = restoreDemo(legacy);
    expect(
      next.products.find((product) => product.id === 'parking'),
    ).toMatchObject({ price: 100000, stock: 5 });
    expect(next.products.find((product) => product.id === 'fire')?.price).toBe(
      312000,
    );
    expect(next.products.some((product) => product.id === 'shahrvand')).toBe(
      true,
    );
    expect(next.courses.some((course) => course.id === 'civil-emergency')).toBe(
      true,
    );
    expect(next.ledger).toBe(legacy.ledger);
    expect(next.orders).toBe(legacy.orders);
    expect(findCase(next).volunteer?.reward).toBe(30);
  });
});
