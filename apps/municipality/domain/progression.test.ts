import { describe, expect, it } from 'vitest';
import { canOpen } from './access';
import { balance, execute, type Command } from './commands';
import { seed, users } from './data';
import { civicProgress, rankDemoCitizen, recordActivity } from './progression';
import type { Role, State } from './types';

const friday = '2026-11-20T20:29:59Z';
const saturday = '2026-11-20T20:30:00Z';

function run(state: State, role: Role, command: Command, now = saturday) {
  return execute(
    state,
    users.find((user) => user.id === role)!,
    command,
    now,
  );
}

describe('Hamsade citizen progression', () => {
  it('uses Tehran Saturday rollover and grants a single bonus per week', () => {
    let state = recordActivity(
      seed(),
      'citizen',
      'reportValidated',
      'one',
      friday,
    );
    state = recordActivity(state, 'citizen', 'caseVoted', 'one', saturday);
    expect(civicProgress(state, saturday).weekly).toMatchObject({
      start: '2026-11-21',
      count: 1,
      completed: false,
    });
    state = recordActivity(state, 'citizen', 'surveyAnswered', 'one', saturday);
    expect(civicProgress(state, saturday).weekly).toMatchObject({
      count: 2,
      completed: true,
    });
    expect(
      recordActivity(state, 'citizen', 'surveyAnswered', 'one', saturday),
    ).toBe(state);
    state = recordActivity(state, 'citizen', 'caseVoted', 'two', saturday);
    const nextWeek = '2026-11-27T20:30:00Z';
    state = recordActivity(state, 'citizen', 'caseVoted', 'three', nextWeek);
    state = recordActivity(state, 'citizen', 'caseVoted', 'four', nextWeek);
    const progress = civicProgress(state, nextWeek);
    expect(
      progress.entries
        .filter((entry) => entry.event === 'weeklyQuest')
        .map((entry) => entry.source),
    ).toEqual(['2026-11-28', '2026-11-21']);
    expect(progress.streaks.weekly.current).toBe(3);
  });

  it('requires a matching report in order and applies the shared FORGE levels and badges', () => {
    let state = recordActivity(
      seed(),
      'citizen',
      'qualityConfirmed',
      'old-case',
      friday,
    );
    state = recordActivity(
      state,
      'citizen',
      'reportValidated',
      'report',
      saturday,
    );
    state = recordActivity(
      state,
      'citizen',
      'qualityConfirmed',
      'other-case',
      saturday,
    );
    expect(civicProgress(state, saturday).mission.completedSteps).toBe(1);
    state = recordActivity(
      state,
      'citizen',
      'qualityConfirmed',
      'report',
      saturday,
    );
    const progress = civicProgress(state, saturday);
    expect(progress.mission.completedSteps).toBe(2);
    expect(
      progress.entries.filter((entry) => entry.event === 'civicMission'),
    ).toHaveLength(1);
    expect(progress).toMatchObject({
      xp: 95,
      level: 2,
      levelStart: 50,
      nextLevel: 150,
    });
    expect(progress.badges.map(({ unlocked }) => unlocked)).toEqual([
      true,
      true,
      false,
    ]);
    expect(balance(state, 'citizen')).toBe(balance(seed(), 'citizen'));
  });

  it('credits real command results without granting XP for spending or replay', () => {
    const start = seed();
    const vote: Command = { type: 'case', id: 'M-1039', action: 'vote' };
    const voted = run(start, 'citizen', vote).state;
    expect(civicProgress(voted, saturday).xp).toBe(5);
    expect(civicProgress(run(voted, 'citizen', vote).state, saturday).xp).toBe(
      5,
    );
    const bought = run(voted, 'citizen', {
      type: 'checkout',
      id: 'one',
      cart: { topup: 1 },
      cara: 0,
    });
    expect(bought.error).toBeUndefined();
    expect(balance(bought.state, 'citizen')).toBeGreaterThan(
      balance(voted, 'citizen'),
    );
    expect(civicProgress(bought.state, saturday).xp).toBe(5);
    const commented = run(start, 'citizen', {
      ...vote,
      action: 'evidence',
      note: 'بهبود مسیر محله',
    });
    expect(commented.error).toBeUndefined();
    expect(civicProgress(commented.state, saturday).xp).toBe(0);
  });

  it.each(['approve-first', 'quiz-first'] as const)(
    'records course progress once with %s',
    (order) => {
      const course = 'safety';
      const approved: Command = {
        type: 'attendance',
        course,
        action: 'approve',
      };
      const passed: Command = {
        type: 'attendance',
        course,
        action: 'quiz',
        answer: 'yes',
      };
      const first =
        order === 'approve-first'
          ? run(seed(), 'instructor', approved)
          : run(seed(), 'citizen', passed);
      expect(first.error).toBeUndefined();
      expect(civicProgress(first.state, saturday).xp).toBe(0);
      const second =
        order === 'approve-first'
          ? run(first.state, 'citizen', passed)
          : run(first.state, 'instructor', approved);
      expect(second.error).toBeUndefined();
      expect(civicProgress(second.state, saturday).xp).toBe(20);
      expect(
        civicProgress(run(second.state, 'citizen', passed).state, saturday).xp,
      ).toBe(20);
      expect(balance(second.state, 'citizen')).toBe(balance(seed(), 'citizen'));
    },
  );

  it('defaults to private rankings and enforces citizen-only participation', () => {
    const state = seed();
    const consent: Command = { type: 'rankingConsent', optIn: true };
    const ranking = (snapshot: State) =>
      rankDemoCitizen(civicProgress(snapshot, saturday));
    expect(canOpen('inspector', 'progress')).toBe(false);
    expect(canOpen('citizen', 'progress')).toBe(true);
    expect(ranking(state).some((entry) => entry.id === 'citizen')).toBe(false);
    expect(run(state, 'hq', consent).error).toBe(true);
    const optedIn = run(state, 'citizen', consent).state;
    expect(ranking(optedIn).some((entry) => entry.id === 'citizen')).toBe(true);
    expect(
      ranking(run(optedIn, 'citizen', { ...consent, optIn: false }).state).some(
        (entry) => entry.id === 'citizen',
      ),
    ).toBe(false);
  });
});
