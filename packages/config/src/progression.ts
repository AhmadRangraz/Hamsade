const millisecondsPerDay = 86_400_000;
const persianDayOfMonth = new Intl.DateTimeFormat(
  'en-US-u-ca-persian-nu-latn',
  {
    timeZone: 'UTC',
    day: 'numeric',
  },
);
const calendars = new Map<string, Intl.DateTimeFormat>();

export function localDay(date: Date, timeZone: string) {
  let calendar = calendars.get(timeZone);
  if (!calendar) {
    calendar = new Intl.DateTimeFormat('en-CA-u-ca-gregory-nu-latn', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    calendars.set(timeZone, calendar);
  }
  const parts = calendar.formatToParts(date);
  const part = (type: string) =>
    parts.find((value) => value.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function dayNumber(date: string) {
  return Date.parse(`${date}T00:00:00Z`) / millisecondsPerDay;
}

function dayKey(day: number) {
  return new Date(day * millisecondsPerDay).toISOString().slice(0, 10);
}

export function shiftDay(day: string, offset: number) {
  return dayKey(dayNumber(day) + offset);
}

function weekStart(day: number) {
  const weekday = new Date(day * millisecondsPerDay).getUTCDay();
  return day - ((weekday + 1) % 7);
}

function countStreak(periods: number[], now: number, step: number) {
  const active = new Set(periods.filter((period) => period <= now));
  const sorted = [...active].sort((a, b) => a - b);
  let longest = 0;
  let run = 0;
  let previous = -Infinity;
  for (const period of sorted) {
    run = period === previous + step ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = period;
  }
  let current = 0;
  for (
    let period = active.has(now) ? now : now - step;
    active.has(period);
    period -= step
  ) {
    current++;
  }
  return { current, longest };
}

export function streaks(earnedDays: string[], today: string) {
  const now = dayNumber(today);
  const days = new Set(earnedDays);
  return {
    daily: countStreak(earnedDays.map(dayNumber), now, 1),
    weekly: countStreak(
      earnedDays.map((date) => weekStart(dayNumber(date))),
      weekStart(now),
      7,
    ),
    recentDays: Array.from({ length: 14 }, (_, index) => {
      const day = dayKey(now - 13 + index);
      return { day, active: days.has(day) };
    }),
  };
}

export function periodStart(
  period: 'daily' | 'weekly' | 'monthly' | 'all',
  today: string,
) {
  if (period === 'daily') return today;
  if (period === 'weekly') return dayKey(weekStart(dayNumber(today)));
  if (period === 'monthly') {
    const day = dayNumber(today);
    const dayOfMonth = Number(
      persianDayOfMonth.format(new Date(day * millisecondsPerDay)),
    );
    return dayKey(day - dayOfMonth + 1);
  }
  return null;
}

export function levelIndex(xp: number, thresholds: readonly number[]) {
  return thresholds.reduce(
    (level, threshold, index) => (threshold <= xp ? index : level),
    0,
  );
}

export function badgeProgress<Rarity extends string>(
  badges: readonly {
    key: string;
    title: string;
    category: 'activity' | 'xp';
    rarity: Rarity;
    target: number;
    requires?: string;
  }[],
  xp: number,
  count: number,
) {
  const unlockedBadges = new Set<string>();
  return badges.map(({ requires, ...badge }) => {
    const current = badge.category === 'xp' ? xp : count;
    const unlocked =
      current >= badge.target && (!requires || unlockedBadges.has(requires));
    if (unlocked) unlockedBadges.add(badge.key);
    return { ...badge, current, unlocked };
  });
}

export function questOccurrence(
  cadence: 'once' | 'daily' | 'weekly',
  day: string,
) {
  return cadence === 'once' ? 'once' : periodStart(cadence, day)!;
}

export function advanceMission<Event extends string>(
  steps: readonly { event: Event; target: number }[],
  position: { completedSteps: number; stepCount: number },
  event: Event,
) {
  const step = steps[position.completedSteps];
  if (step?.event !== event) return position;
  const count = position.stepCount + 1;
  return count >= step.target
    ? { completedSteps: position.completedSteps + 1, stepCount: 0 }
    : { completedSteps: position.completedSteps, stepCount: count };
}
