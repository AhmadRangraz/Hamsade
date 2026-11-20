import {
  advanceMission,
  badgeProgress,
  forgeLevelThresholds,
  levelIndex,
  questOccurrence,
  streaks,
} from '@forge/shared';
import { tehranDay } from './calendar';
import type { CivicActivity, ProgressEntry, Role, State } from './types';

const activityXp: Record<CivicActivity, number> = {
  reportValidated: 25,
  ideaApproved: 35,
  caseVoted: 5,
  qualityConfirmed: 10,
  courseCompleted: 20,
  surveyAnswered: 10,
  eventAttended: 20,
  issueSolved: 30,
};

export const activityLabels: Record<ProgressEntry['event'], string> = {
  reportValidated: 'تأیید گزارش معتبر',
  ideaApproved: 'تأیید اجرای پیشنهاد',
  caseVoted: 'رأی به پروندهٔ محله',
  qualityConfirmed: 'تأیید کیفیت از سوی شهروند',
  courseCompleted: 'تکمیل دورهٔ آموزشی',
  surveyAnswered: 'پاسخ به نظرسنجی محله',
  eventAttended: 'حضور تأییدشده در رویداد',
  issueSolved: 'رفع تأییدشدهٔ مسئلهٔ محله',
  weeklyQuest: 'پاداش چالش هفتگی',
  civicMission: 'پاداش مأموریت از گزارش تا نتیجه',
};

export const mission = {
  key: 'report-to-result-v1',
  steps: [
    { event: 'reportValidated', target: 1 },
    { event: 'qualityConfirmed', target: 1 },
  ] satisfies { event: CivicActivity; target: number }[],
  xp: 25,
};

export const weeklyQuest = { target: 2, xp: 15 };

const badges = [
  {
    key: 'first-action',
    title: 'قدم اول',
    category: 'activity',
    rarity: 'common',
    target: 1,
  },
  {
    key: 'neighbor',
    title: 'همسایهٔ فعال',
    category: 'activity',
    rarity: 'rare',
    target: 4,
    requires: 'first-action',
  },
  {
    key: 'champion',
    title: 'همیار شهر',
    category: 'xp',
    rarity: 'epic',
    target: 150,
    requires: 'neighbor',
  },
] as const;

const getProgression = (state: State) =>
  state.progression ?? { entries: [], rankingOptIn: false };

const qualifyingActivity = (entry: ProgressEntry) =>
  entry.event !== 'civicMission' && entry.event !== 'weeklyQuest';

function missionProgress(entries: ProgressEntry[]) {
  const verifiedReports = new Set<string>();
  return entries.reduce(
    (position, entry) => {
      if (entry.event === 'reportValidated') verifiedReports.add(entry.source);
      if (
        entry.event === 'qualityConfirmed' &&
        !verifiedReports.has(entry.source)
      )
        return position;
      return advanceMission(mission.steps, position, entry.event);
    },
    { completedSteps: 0, stepCount: 0 },
  );
}

function weeklyCount(entries: ProgressEntry[], week: string, through: string) {
  return entries.filter((entry) => entry.day >= week && entry.day <= through)
    .length;
}

export function recordActivity(
  state: State,
  citizen: Role,
  event: CivicActivity,
  source: string,
  at: string,
): State {
  if (citizen !== 'citizen') return state;
  const progression = getProgression(state);
  const entries = progression.entries;
  if (
    entries.some(
      (entry) =>
        entry.citizen === citizen &&
        entry.event === event &&
        entry.source === source,
    )
  )
    return state;

  const day = tehranDay(at);
  const next: ProgressEntry[] = [
    ...entries,
    { citizen, event, source, xp: activityXp[event], at, day },
  ];
  const activities = next.filter(qualifyingActivity);
  const week = questOccurrence('weekly', day);
  if (
    weeklyCount(activities, week, day) >= weeklyQuest.target &&
    !entries.some(
      (entry) => entry.event === 'weeklyQuest' && entry.source === week,
    )
  ) {
    next.push({
      citizen,
      event: 'weeklyQuest',
      source: week,
      xp: weeklyQuest.xp,
      at,
      day,
    });
  }
  if (
    missionProgress(activities).completedSteps === mission.steps.length &&
    !entries.some(
      (entry) => entry.event === 'civicMission' && entry.source === mission.key,
    )
  ) {
    next.push({
      citizen,
      event: 'civicMission',
      source: mission.key,
      xp: mission.xp,
      at,
      day,
    });
  }
  return { ...state, progression: { ...progression, entries: next } };
}

export function setRankingConsent(state: State, optIn: boolean): State {
  return {
    ...state,
    progression: { ...getProgression(state), rankingOptIn: optIn },
  };
}

export function civicProgress(state: State, now: string) {
  const { entries, rankingOptIn } = getProgression(state);
  const today = tehranDay(now);
  const visibleEntries = entries.filter((entry) => entry.day <= today);
  const activities = visibleEntries.filter(qualifyingActivity);
  const xp = visibleEntries.reduce((total, entry) => total + entry.xp, 0);
  const index = levelIndex(xp, forgeLevelThresholds);
  const week = questOccurrence('weekly', today);
  return {
    xp,
    level: index + 1,
    levelStart: forgeLevelThresholds[index] ?? 0,
    nextLevel: forgeLevelThresholds[index + 1] ?? null,
    badges: badgeProgress(badges, xp, activities.length),
    streaks: streaks(
      activities.map((entry) => entry.day),
      today,
    ),
    mission: missionProgress(activities),
    weekly: {
      start: week,
      count: Math.min(weeklyQuest.target, weeklyCount(activities, week, today)),
      completed: visibleEntries.some(
        (entry) => entry.event === 'weeklyQuest' && entry.source === week,
      ),
    },
    entries: [...visibleEntries].reverse(),
    rankingOptIn,
  };
}

export function rankDemoCitizen(progress: ReturnType<typeof civicProgress>) {
  const peers = [
    { id: 'fictional-1', name: 'همسایهٔ نمونهٔ الف', xp: 120 },
    { id: 'fictional-2', name: 'همسایهٔ نمونهٔ ب', xp: 75 },
    { id: 'fictional-3', name: 'همسایهٔ نمونهٔ پ', xp: 30 },
  ];
  return (
    progress.rankingOptIn
      ? [...peers, { id: 'citizen', name: 'شما', xp: progress.xp }]
      : peers
  ).sort((a, b) => b.xp - a.xp);
}
