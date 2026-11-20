import { districts } from './data';
import type { CivicCase, State, Status, User } from './types';

export const volunteerCategories = ['پسماند', 'فضای سبز'];

export function neighborhoodIssues(state: State, user: User) {
  return state.cases.filter(
    (record) =>
      record.district === user.district &&
      record.kind === 'report' &&
      record.owner !== user.id &&
      !['merged', 'rejected'].includes(record.status),
  );
}

const percentages: Record<Status, number> = {
  new: 10,
  review: 25,
  assigned: 45,
  progress: 65,
  inspection: 85,
  rework: 65,
  approved: 100,
  rejected: 0,
  merged: 0,
};
export const caseProgress = (record: CivicCase) => percentages[record.status];

export function topDistrict(state: State) {
  const results = districts.map((district) => ({
    ...district,
    resolved: state.cases.filter(
      (record) =>
        record.district === district.id &&
        record.kind === 'report' &&
        record.status === 'approved',
    ).length,
  }));
  return results.sort(
    (a, b) => b.resolved - a.resolved || a.name.localeCompare(b.name, 'fa'),
  )[0];
}
