'use client';

import {
  BookOpen,
  CalendarDays,
  CirclePlay,
  GraduationCap,
  QrCode,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { digits, jalaliInput, parseJalali } from '../domain/calendar';
import { events } from '../domain/data';
import type { Course, User } from '../domain/types';
import { useDemo } from './state';
import {
  Badge,
  Button,
  Card,
  DataTable,
  Empty,
  Heading,
  JalaliDatePicker,
  Modal,
  Notice,
  date,
  id,
  num,
  number,
  text,
  today,
} from './ui';

export function Training({ user }: { user: User }) {
  const { state, send } = useDemo();
  const [active, setActive] = useState<string | null>(null);
  const course = state.courses.find(
    (c) => c.id === active && c.district === user.district,
  );
  const attendance = state.attendance.find(
    (a) => a.course === active && a.user === user.id,
  );
  const paid = state.ledger.some(
    (row) => row.key === 'course:' + active + ':' + user.id,
  );
  return (
    <>
      <Heading title="آموزش شهروندی">
        درس‌های کوتاه و کلاس‌های محله را دنبال کنید و با تکمیل شرایط کارا
        بگیرید.
      </Heading>
      <div className="grid-two">
        {state.courses
          .filter((c) => c.district === user.district)
          .map((c) => (
            <Card key={c.id}>
              <span className="mini-icon">
                <BookOpen size={21} />
              </span>
              <h2>{c.title}</h2>
              <p>
                {c.venue} · {date(c.date)}
              </p>
              <div className="action-row">
                <Badge>{c.mode === 'online' ? 'آنلاین' : 'حضوری'}</Badge>
                <Badge>{num(c.reward)} کارا</Badge>
              </div>
              <Button tone="quiet" onClick={() => setActive(c.id)}>
                <CirclePlay size={18} /> ورود به درس
              </Button>
            </Card>
          ))}
      </div>
      {course && (
        <Modal title={course.title} onClose={() => setActive(null)}>
          <CoursePlayer key={course.id} course={course} />
          <p>
            حضور:{' '}
            {attendance?.approved
              ? 'تأیید شده'
              : attendance?.attended
                ? 'در انتظار تأیید'
                : 'ثبت نشده'}{' '}
            · آزمون: {attendance?.passed ? 'قبول' : 'تکمیل نشده'}
          </p>
          {paid && <Notice>پاداش دوره در کیف پول ثبت شده است.</Notice>}
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              send({
                type: 'attendance',
                course: course.id,
                action: 'attend',
                code: digits(
                  text(new FormData(e.currentTarget), 'code').trim(),
                ),
              });
            }}
          >
            <label>
              کد حضور یا متن QR
              <input dir="ltr" name="code" required />
            </label>
            <Button tone="quiet" type="submit">
              ثبت حضور
            </Button>
          </form>
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              send({
                type: 'attendance',
                course: course.id,
                action: 'quiz',
                answer: text(new FormData(e.currentTarget), 'answer'),
              });
            }}
          >
            <label>
              {course.id === 'waste'
                ? 'پسماند خشک تمیز را جدا کنیم؟'
                : course.id === 'safety'
                  ? 'مسیر خروج باید باز بماند؟'
                  : 'مطالب درس را مرور کردید؟'}
              <select name="answer">
                <option value="no">خیر</option>
                <option value="yes">بله</option>
              </select>
            </label>
            <Button type="submit">ثبت آزمون</Button>
          </form>
        </Modal>
      )}
    </>
  );
}

function CoursePlayer({ course }: { course: Course }) {
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(0);
  const parts = course.lesson.split(/(?<=[.!؟])\s+/);
  return (
    <div className="lesson">
      <div className="lesson-screen">
        <GraduationCap size={42} />
        <p>{playing ? parts[step] : course.title}</p>
      </div>
      <div className="action-row">
        <Button onClick={() => setPlaying(!playing)}>
          <CirclePlay size={18} />
          {playing ? 'توقف درس' : 'پخش درس'}
        </Button>
        {playing && (
          <>
            <Button
              tone="quiet"
              disabled={step === 0}
              onClick={() => setStep(step - 1)}
            >
              قبلی
            </Button>
            <Button
              tone="quiet"
              disabled={step === parts.length - 1}
              onClick={() => setStep(step + 1)}
            >
              بخش بعد
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export function Courses({ user }: { user: User }) {
  const { state, send } = useDemo();
  const [edit, setEdit] = useState<Course | null>(null);
  const [form, setForm] = useState(false);
  const [error, setError] = useState('');
  const [showCode, setShowCode] = useState<Course | null>(null);
  const courses = state.courses.filter((c) => c.instructor === user.id);
  return (
    <>
      <Heading
        title="مدیریت دوره‌ها"
        action={
          <Button
            onClick={() => {
              setEdit(null);
              setError('');
              setForm(true);
            }}
          >
            افزودن دوره
          </Button>
        }
      >
        حضور، نتیجهٔ آزمون و پاداش شرکت‌کنندگان را مدیریت کنید.
      </Heading>
      {courses.map((course) => {
        const record = state.attendance.find((a) => a.course === course.id);
        const paid = state.ledger.some(
          (entry) => entry.key === 'course:' + course.id + ':citizen',
        );
        return (
          <Card key={course.id}>
            <div className="section-head">
              <h2>{course.title}</h2>
              <Badge>{course.mode === 'online' ? 'آنلاین' : 'حضوری'}</Badge>
            </div>
            <p>
              {course.venue} · {date(course.date)} · {num(course.reward)} کارا
            </p>
            <div className="action-row">
              <Button tone="quiet" onClick={() => setShowCode(course)}>
                <QrCode size={18} /> کد حضور و QR
              </Button>
              <Button
                tone="quiet"
                onClick={() => {
                  setEdit(course);
                  setError('');
                  setForm(true);
                }}
              >
                ویرایش دوره
              </Button>
            </div>
            {record ? (
              <>
                <DataTable
                  head={['شرکت‌کننده', 'حضور', 'آزمون', 'پاداش']}
                  rows={[
                    [
                      'سارا احمدی',
                      record.approved ? 'تأیید شده' : 'ثبت شده',
                      record.passed ? 'قبول' : 'تکمیل نشده',
                      paid ? 'پرداخت شد' : 'پرداخت نشده',
                    ],
                  ]}
                />
                <div className="action-row">
                  <Button
                    tone="quiet"
                    disabled={record.approved}
                    onClick={() =>
                      send({
                        type: 'attendance',
                        course: course.id,
                        action: 'approve',
                      })
                    }
                  >
                    تأیید حضور
                  </Button>
                  <Button
                    disabled={!record.approved || !record.passed || paid}
                    onClick={() =>
                      send({
                        type: 'attendance',
                        course: course.id,
                        action: 'pay',
                      })
                    }
                  >
                    پرداخت پاداش کارا
                  </Button>
                </div>
              </>
            ) : (
              <Empty>هنوز حضوری ثبت نشده است.</Empty>
            )}
          </Card>
        );
      })}
      {showCode && (
        <Modal
          title={'کد حضور · ' + showCode.title}
          onClose={() => setShowCode(null)}
        >
          <AttendanceCode course={showCode} />
        </Modal>
      )}
      {form && (
        <Modal
          title={edit ? 'ویرایش دوره' : 'افزودن دوره'}
          onClose={() => setForm(false)}
        >
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              const day = parseJalali(text(d, 'date'));
              const code = digits(text(d, 'code').trim());
              if (!day || !/^\d{4}$/.test(code)) {
                setError('تاریخ معتبر و کد چهاررقمی وارد کنید.');
                return;
              }
              send({
                type: 'course',
                course: {
                  id: edit?.id ?? id(),
                  title: text(d, 'title'),
                  mode: text(d, 'mode') === 'online' ? 'online' : 'local',
                  instructor: user.id,
                  district: user.district,
                  venue: text(d, 'venue'),
                  date: day,
                  code,
                  reward: number(d, 'reward'),
                  lesson: text(d, 'lesson'),
                },
              });
              setForm(false);
            }}
          >
            <label>
              عنوان دوره
              <input name="title" defaultValue={edit?.title} required />
            </label>
            <div className="grid-two">
              <label>
                نوع
                <select name="mode" defaultValue={edit?.mode}>
                  <option value="local">حضوری</option>
                  <option value="online">آنلاین</option>
                </select>
              </label>
              <label>
                محل
                <input name="venue" defaultValue={edit?.venue} required />
              </label>
              <JalaliDatePicker
                label="تاریخ جلسه"
                initial={edit ? jalaliInput(edit.date) : today()}
                required
              />
              <label>
                کد چهاررقمی
                <input
                  name="code"
                  dir="ltr"
                  inputMode="numeric"
                  maxLength={4}
                  defaultValue={edit?.code}
                  required
                />
              </label>
              <label>
                پاداش کارا
                <input
                  name="reward"
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={edit?.reward ?? 15}
                  required
                />
              </label>
            </div>
            <label>
              متن درس
              <textarea name="lesson" defaultValue={edit?.lesson} required />
            </label>
            {error && <Notice error>{error}</Notice>}
            <Button type="submit">ذخیرهٔ دوره</Button>
          </form>
        </Modal>
      )}
    </>
  );
}

function AttendanceCode({ course }: { course: Course }) {
  const payload = 'CIVIC:' + course.id + ':' + course.code;
  const [image, setImage] = useState('');
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(payload, { width: 192, margin: 3 })
      .then((value) => {
        if (active) setImage(value);
      })
      .catch(() => {
        if (active) setImage('');
      });
    return () => {
      active = false;
    };
  }, [payload]);
  return (
    <div className="attendance-code">
      {image && (
        <img src={image} width={192} height={192} alt="کد QR حضور در جلسه" />
      )}
      <p>
        کد دستی{' '}
        <strong>
          <bdi>{course.code}</bdi>
        </strong>
      </p>
      <p>
        متن QR <code dir="ltr">{payload}</code>
      </p>
    </div>
  );
}

export function Community() {
  const { state, send } = useDemo();
  return (
    <>
      <Heading title="مشارکت محله">
        رویدادهای محلی، نظرسنجی و خدمات شهری آزمایشی.
      </Heading>
      <div className="grid-two">
        <Card>
          <div className="section-head">
            <h2>تقویم محله</h2>
            <CalendarDays size={22} />
          </div>
          <DataTable
            head={['رویداد', 'زمان', 'مکان']}
            rows={events.map((event) => [
              event.name,
              date(event.date),
              event.venue,
            ])}
          />
        </Card>
        <Card>
          <h2>نظرسنجی اولویت محله</h2>
          {state.ledger.some((entry) => entry.key === 'survey:citizen') ? (
            <Notice>پاسخ شما ثبت شد و ۵ کارا دریافت کردید.</Notice>
          ) : (
            <form
              className="form"
              onSubmit={(e) => {
                e.preventDefault();
                send({
                  type: 'survey',
                  answer: text(new FormData(e.currentTarget), 'answer'),
                });
              }}
            >
              <label>
                کدام موضوع اولویت دارد؟
                <select name="answer">
                  <option value="clean">نظافت محله</option>
                  <option value="parks">فضای سبز</option>
                  <option value="safety">ایمنی معابر</option>
                </select>
              </label>
              <Button type="submit">ثبت پاسخ</Button>
            </form>
          )}
        </Card>
      </div>
      <Card>
        <h2>رویدادهای سامانه‌های شهری</h2>
        <p>
          پرداخت به‌موقع عوارض و رخداد پارکینگ را با شناسه‌های نمونه دریافت
          کنید.
        </p>
        <div className="action-row">
          <Button onClick={() => send({ type: 'integration', source: 'toll' })}>
            دریافت عوارض آزمایشی
          </Button>
          <Button
            tone="quiet"
            onClick={() => send({ type: 'integration', source: 'parking' })}
          >
            دریافت رویداد پارکینگ
          </Button>
          <Button
            tone="quiet"
            onClick={() =>
              send({ type: 'integration', source: 'parking', fail: true })
            }
          >
            شبیه‌سازی خطا
          </Button>
        </div>
        {state.imports.length > 0 && (
          <p>
            شناسه‌های دریافت‌شده:{' '}
            {state.imports
              .filter((item) => !item.startsWith('137'))
              .map((item) => (
                <Badge key={item}>
                  <bdi>{item}</bdi>
                </Badge>
              ))}
          </p>
        )}
      </Card>
    </>
  );
}
