import type { MediaRef } from './types';

export const mediaTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/webm',
];
export const mediaLimit = 20 * 1024 * 1024;
export const supportedMedia = (mime: string, size: number) =>
  mediaTypes.includes(mime) &&
  Number.isSafeInteger(size) &&
  size > 0 &&
  size <= mediaLimit;

export const validMedia = (file: MediaRef) =>
  /^[a-f0-9-]{36}$/.test(file.id) &&
  Boolean(file.name.trim()) &&
  file.name.length <= 180 &&
  supportedMedia(file.mime, file.size);
