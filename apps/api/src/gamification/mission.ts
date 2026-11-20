import { advanceMission, forgeConfig } from '@forge/config';
import type { Prisma } from '../generated/prisma/client.js';
import type { BusinessEvent } from './award.js';

export async function recordMissionProgress(
  tx: Prisma.TransactionClient,
  { kind, accountId }: BusinessEvent,
  createdAt: Date,
  earnedDay: string,
) {
  const mission = forgeConfig.gamification.mission;
  if (!mission) return;
  if (mission.requiresQuest) {
    const prerequisite = await tx.questProgress.findUnique({
      where: {
        accountId_questKey_occurrence: {
          accountId,
          questKey: mission.requiresQuest,
          occurrence: 'once',
        },
      },
      select: { completedAt: true },
    });
    if (!prerequisite?.completedAt) return;
  }

  // The award has consumed this source and still holds the account lock.
  const key = { accountId, missionKey: mission.key };
  const where = { accountId_missionKey: key };
  const previous = await tx.missionProgress.findUnique({ where });
  if (previous?.completedAt) return;
  const position = {
    completedSteps: previous?.completedSteps ?? 0,
    stepCount: previous?.stepCount ?? 0,
  };
  const next = advanceMission(mission.steps, position, kind);
  if (next === position) return;
  const completedAt =
    next.completedSteps === mission.steps.length ? createdAt : null;
  const progress = { ...next, completedAt };
  const { id } = await tx.missionProgress.upsert({
    where,
    create: { ...key, ...progress },
    update: progress,
    select: { id: true },
  });
  if (!completedAt) return;

  await tx.pointEntry.create({
    data: {
      accountId,
      event: 'MISSION_COMPLETED',
      sourceId: id,
      outcome: 'AWARDED',
      ...mission.reward,
      earnedDay,
      createdAt,
    },
  });
}
