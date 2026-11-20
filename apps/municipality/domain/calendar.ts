import { localDay } from '@forge/shared';
import { isValidJalaaliDate, toGregorian, toJalaali } from 'jalaali-js';

export const digits = (value: string) =>
  value.replace(/[۰-۹٠-٩]/g, (char) =>
    String(char.charCodeAt(0) - (char >= '۰' ? 0x06f0 : 0x0660)),
  );

export const tehranDay = (value: string) =>
  localDay(new Date(value), 'Asia/Tehran');

export function parseJalali(value: string) {
  const match = /^(13\d\d|14\d\d)\/(\d{1,2})\/(\d{1,2})$/.exec(
    digits(value.trim()),
  );
  if (!match) return null;
  const [, year, month, day] = match;
  if (!isValidJalaaliDate(Number(year), Number(month), Number(day)))
    return null;
  const { gy, gm, gd } = toGregorian(Number(year), Number(month), Number(day));
  return [gy, gm, gd].map((part) => String(part).padStart(2, '0')).join('-');
}

export function jalaliInput(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  const { jy, jm, jd } = toJalaali(year!, month!, day!);
  return [jy, jm, jd]
    .map((part) => String(part).padStart(2, '0'))
    .join('/')
    .replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]!);
}

export const jalaliMonth = (timestamp: string) =>
  jalaliInput(tehranDay(timestamp)).slice(0, 7);

const tehranTime = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Tehran',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
const tehranOffset = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Tehran',
  timeZoneName: 'longOffset',
});

export function tehranInstant(day: string, clock: string) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
    !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(clock)
  )
    return null;
  const local = day + 'T' + clock + ':00';
  const civil = new Date(local + 'Z');
  if (!Number.isFinite(civil.getTime())) return null;
  const zone = tehranOffset
    .formatToParts(civil)
    .find((part) => part.type === 'timeZoneName')?.value;
  const candidate = new Date(local + (zone?.slice(3) || 'Z'));
  if (!Number.isFinite(candidate.getTime())) return null;
  const instant = candidate.toISOString();
  return tehranDay(instant) === day && tehranTime.format(candidate) === clock
    ? instant
    : null;
}
