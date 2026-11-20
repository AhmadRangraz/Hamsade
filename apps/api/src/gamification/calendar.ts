import { forgeConfig, localDay as dayInZone } from '@forge/config';

export { periodStart, shiftDay, streaks } from '@forge/config';

export const localDay = (date: Date) => dayInZone(date, forgeConfig.timezone);
