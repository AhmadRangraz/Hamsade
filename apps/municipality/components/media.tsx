'use client';

import { useEffect, useState } from 'react';
import { mediaTypes, supportedMedia } from '../domain/media';
import type { MediaRef } from '../domain/types';

function openMedia() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('karashahr-media', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('media');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function accessMedia<T>(
  mode: IDBTransactionMode,
  action: (collection: IDBObjectStore) => IDBRequest<T>,
) {
  const db = await openMedia();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction('media', mode);
      const request = action(transaction.objectStore('media'));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

export async function storeMedia(file: File): Promise<MediaRef> {
  if (!supportedMedia(file.type, file.size))
    throw new Error('Unsupported media');
  const id = crypto.randomUUID();
  await accessMedia('readwrite', (collection) => collection.add(file, id));
  return {
    id,
    mime: file.type,
    name: file.name.slice(0, 180),
    size: file.size,
  };
}

export const clearMedia = () =>
  accessMedia('readwrite', (collection) => collection.clear());

export function MediaPreview({
  media,
  file,
  label,
}: {
  media?: MediaRef;
  file?: File;
  label: string;
}) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState(false);
  const key = media?.id;
  useEffect(() => {
    if (!file && !key) return;
    let live = true;
    let objectUrl = '';
    async function load() {
      try {
        const blob =
          file ??
          (await accessMedia<Blob | undefined>('readonly', (collection) =>
            collection.get(key!),
          ));
        if (!blob) throw new Error('Missing attachment');
        if (live) {
          objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
        }
      } catch {
        if (live) setError(true);
      }
    }
    void load();
    return () => {
      live = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file, key]);
  if (error)
    return <small role="status">فایل در این مرورگر در دسترس نیست.</small>;
  if (!url) return null;
  return (file?.type ?? media?.mime)?.startsWith('video/') ? (
    <video
      className="case-media"
      controls
      preload="metadata"
      src={url}
      aria-label={label}
    />
  ) : (
    <img className="case-media" src={url} alt={label} />
  );
}

export function MediaField({
  label,
  file,
  onChange,
  required = false,
}: {
  label: string;
  file?: File;
  onChange: (file: File | undefined) => void;
  required?: boolean;
}) {
  const [error, setError] = useState(false);
  return (
    <div className="form-media">
      <label>
        {label}
        <input
          type="file"
          accept={mediaTypes.join(',')}
          required={required}
          onChange={(event) => {
            const selection = event.target.files?.[0];
            const invalid =
              !!selection && !supportedMedia(selection.type, selection.size);
            setError(invalid);
            if (invalid) event.target.value = '';
            onChange(invalid ? undefined : selection);
          }}
        />
      </label>
      <small>عکس JPG، PNG، WebP یا ویدیوی MP4، WebM تا ۲۰ مگابایت.</small>
      {error && (
        <small className="error-text" role="alert">
          فرمت یا اندازهٔ فایل قابل قبول نیست.
        </small>
      )}
      {file && (
        <MediaPreview
          key={file.name + file.lastModified}
          file={file}
          label="پیش‌نمایش رسانهٔ انتخاب‌شده"
        />
      )}
    </div>
  );
}
