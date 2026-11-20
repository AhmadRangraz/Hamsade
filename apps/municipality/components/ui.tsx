'use client';

import { Button, Panel as Card, Notice } from '@forge/ui';
import { formatJalaliDate, formatNumber } from '@forge/shared';
import {
  CalendarDays,
  ChevronLeft,
  CircleCheck,
  CircleAlert,
  Wallet,
} from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { jalaliInput, parseJalali, tehranDay } from '../domain/calendar';
import { parameters, statusLabel } from '../domain/data';
import { totalScore } from '../domain/commands';
import type { CivicCase, Score, Status } from '../domain/types';

export { Button, Card, Notice };
export const num = (n: number) => formatNumber(n);
export const date = (value: string) =>
  formatJalaliDate(
    new Date(value.length === 10 ? value + 'T12:00:00Z' : value),
  );
const timeFormat = new Intl.DateTimeFormat('fa-IR', {
  timeZone: 'Asia/Tehran',
  hour: '2-digit',
  minute: '2-digit',
});
export const dateTime = (value: string) =>
  date(value) + '، ' + timeFormat.format(new Date(value));
export const money = (n: number) => num(n) + ' تومان';
export const today = () => jalaliInput(tehranDay(new Date().toISOString()));
export const id = () => crypto.randomUUID();
export const text = (data: FormData, key: string) =>
  String(data.get(key) ?? '');
export const number = (data: FormData, key: string) => Number(data.get(key));

export function Badge({
  status,
  children,
}: {
  status?: Status;
  children?: ReactNode;
}) {
  return (
    <span className="badge" data-status={status}>
      <i />
      {children ?? (status && statusLabel[status])}
    </span>
  );
}
export function Heading({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="page-title">
      <div>
        <h1>{title}</h1>
        {children && <p>{children}</p>}
      </div>
      {action}
    </header>
  );
}
export function Empty({
  children = 'موردی برای نمایش پیدا نشد.',
}: {
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <p>{children}</p>
    </div>
  );
}
export function JalaliDatePicker({
  label,
  name = 'date',
  initial = '',
  required = false,
}: {
  label: string;
  name?: string;
  initial?: string;
  required?: boolean;
}) {
  const input = useId();
  const [value, setValue] = useState(initial);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => {
    const initialDay = parseJalali(initial);
    return (initialDay ? jalaliInput(initialDay) : today()).slice(0, 7);
  });
  const monthStart = parseJalali(month + '/۱');
  const firstColumn = monthStart
    ? (new Date(monthStart + 'T12:00:00Z').getUTCDay() + 1) % 7
    : 0;
  const calendarId = useId();
  function closeCalendar() {
    setOpen(false);
    document.getElementById(input)?.focus();
  }
  return (
    <div className="date-field">
      <label htmlFor={input}>{label}</label>
      <div className="input-icon">
        <input
          id={input}
          dir="ltr"
          name={name}
          placeholder="۱۴۰۵/۰۸/۲۹"
          value={value}
          required={required}
          onChange={(event) => setValue(event.target.value)}
          aria-invalid={!!value && !parseJalali(value)}
        />
        <Button
          tone="quiet"
          aria-label={'تقویم ' + label}
          aria-expanded={open}
          aria-controls={open ? calendarId : undefined}
          onClick={() => {
            const selected = parseJalali(value);
            if (!open && selected) setMonth(jalaliInput(selected).slice(0, 7));
            setOpen(!open);
          }}
        >
          <CalendarDays size={18} />
        </Button>
      </div>
      {open && (
        <div
          className="date-pop"
          id={calendarId}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation();
              event.preventDefault();
              closeCalendar();
            }
          }}
        >
          <div className="date-toolbar">
            <Button
              tone="quiet"
              onClick={() => {
                if (monthStart) {
                  const day = new Date(monthStart + 'T12:00:00Z');
                  day.setUTCDate(day.getUTCDate() - 1);
                  setMonth(jalaliInput(day.toISOString()).slice(0, 7));
                }
              }}
            >
              ماه قبل
            </Button>
            <bdi>{month}</bdi>
            <Button
              tone="quiet"
              onClick={() => {
                if (monthStart) {
                  const day = new Date(monthStart + 'T12:00:00Z');
                  day.setUTCDate(day.getUTCDate() + 32);
                  setMonth(jalaliInput(day.toISOString()).slice(0, 7));
                }
              }}
            >
              ماه بعد
            </Button>
          </div>
          <div className="date-grid">
            {['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'].map((day) => (
              <span key={day} className="weekday" aria-hidden="true">
                {day}
              </span>
            ))}
            {Array.from({ length: firstColumn }, (_, i) => (
              <span aria-hidden="true" key={'blank-' + i} />
            ))}
            {Array.from({ length: 31 }, (_, i) => i + 1)
              .filter((day) => parseJalali(month + '/' + day))
              .map((day) => (
                <Button
                  key={day}
                  tone="quiet"
                  aria-label={'انتخاب ' + month + '/' + num(day)}
                  aria-pressed={
                    parseJalali(value) === parseJalali(month + '/' + day)
                  }
                  onClick={() => {
                    setValue(month + '/' + num(day).padStart(2, '۰'));
                    closeCalendar();
                  }}
                >
                  {num(day)}
                </Button>
              ))}
          </div>
        </div>
      )}
      {value && !parseJalali(value) && (
        <small className="error-text">تاریخ شمسی معتبر وارد کنید.</small>
      )}
    </div>
  );
}
export function DataTable({
  head,
  rows,
}: {
  head: string[];
  rows: ReactNode[][];
}) {
  if (!rows.length) return <Empty />;
  return (
    <div
      className="table-scroll"
      tabIndex={0}
      role="region"
      aria-label={head.join('، ')}
    >
      <table>
        <thead>
          <tr>
            {head.map((cell) => (
              <th scope="col" key={cell}>
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function StatusStepper({
  record,
  privateDetails,
}: {
  record: CivicCase;
  privateDetails: boolean;
}) {
  return (
    <ol className="timeline">
      {record.events.map((event, i) => (
        <li key={i}>
          <span className="timeline-dot" />
          <div>
            <strong>{statusLabel[event.status]}</strong>
            <small>{date(event.at)}</small>
            {privateDetails && (
              <p>
                {event.note}
                {event.document && (
                  <>
                    <br />
                    سند:{' '}
                    <a
                      className="text-link"
                      href={event.document.data}
                      download={event.document.name}
                    >
                      <bdi>{event.document.name}</bdi>
                    </a>
                  </>
                )}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
export function ScoreWidget({ score }: { score?: Score }) {
  return (
    <Card>
      <div className="section-head">
        <h2>امتیاز اولویت</h2>
        {score && (
          <span className="score-pill">
            {num(totalScore(score))}
            <small> از ۱۰۰</small>
          </span>
        )}
      </div>
      {score ? (
        <>
          <p className="muted">
            نسخهٔ <bdi>{score.revision.id}</bdi> · {date(score.revision.at)}
          </p>
          <DataTable
            head={['پارامتر', 'امتیاز خام', 'وزن', 'سهم']}
            rows={parameters.map((item, i) => [
              item,
              num(score.values[i]!),
              num(score.revision.weights[i]!) + '٪',
              num((score.values[i]! * score.revision.weights[i]!) / 100),
            ])}
          />
        </>
      ) : (
        <Empty>هنوز امتیازدهی نشده است.</Empty>
      )}
    </Card>
  );
}
export function WalletWidget({
  balance,
  rate,
}: {
  balance: number;
  rate: number;
}) {
  return (
    <div className="wallet-widget">
      <div className="mini-icon">
        <Wallet size={22} />
      </div>
      <div>
        <span>موجودی کارا</span>
        <strong>
          {num(balance)} <small>کارا</small>
        </strong>
        <small>{money(balance * rate)} ارزش نمایشی</small>
      </div>
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useId();
  useEffect(() => {
    const target =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const element = dialog.current;
    element?.showModal();
    return () => {
      element?.close();
      target?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      aria-labelledby={heading}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="section-head">
        <h2 id={heading}>{title}</h2>
        <Button tone="quiet" onClick={onClose}>
          بستن
        </Button>
      </div>
      {children}
    </dialog>
  );
}
export function Toast({ message, error }: { message: string; error: boolean }) {
  return (
    <div className="toast" data-error={error} role={error ? 'alert' : 'status'}>
      {error ? <CircleAlert size={20} /> : <CircleCheck size={20} />}
      <span>{message}</span>
    </div>
  );
}
export function More() {
  return <ChevronLeft size={17} aria-hidden="true" />;
}
export function PhotoField({
  label = 'تصویر',
  onChange,
}: {
  label?: string;
  onChange: (value: string) => void;
}) {
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  return (
    <label>
      {label}
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(event) => {
          const file = event.target.files?.[0];
          setError('');
          if (
            !file ||
            !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
            file.size > 350_000
          ) {
            setPreview('');
            onChange('');
            if (file)
              setError('تصویر PNG، JPG یا WebP تا ۳۵۰ کیلوبایت انتخاب کنید.');
            return;
          }
          const reader = new FileReader();
          reader.onload = () => {
            const value = String(reader.result);
            setPreview(value);
            onChange(value);
          };
          reader.readAsDataURL(file);
        }}
      />
      {error && (
        <small className="error-text" role="alert">
          {error}
        </small>
      )}
      {preview && (
        <img
          className="photo-preview"
          src={preview}
          alt="پیش‌نمایش تصویر انتخاب‌شده"
        />
      )}
    </label>
  );
}
