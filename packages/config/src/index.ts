export { default as forgeConfig } from '../../../forge.config';
export {
  apiPrefix,
  defineForgeConfig,
  resolveApiOrigin,
  resolveApiPort,
  rewardEvents,
  earningRuleKeys,
} from './define';
export type { ForgeConfig, ForgeConfigInput } from './define';
export {
  featureIds,
  featureRegistry,
  plannedTemplates,
  templateIds,
  templateRegistry,
} from './templates';
export type { FeatureId, TemplateId } from './templates';

export {
  advanceMission,
  badgeProgress,
  levelIndex,
  localDay,
  periodStart,
  questOccurrence,
  shiftDay,
  streaks,
} from './progression';
