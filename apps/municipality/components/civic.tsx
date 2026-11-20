'use client';

import { ClipboardList, FilePlus2, MapPin, ThumbsUp } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { blocked, privateCase, visibleCase } from '../domain/access';
import { parseJalali, tehranInstant } from '../domain/calendar';
import { transitions, totalScore } from '../domain/commands';
import {
  districtName,
  districts,
  homeDistrict,
  parameters,
  statusLabel,
} from '../domain/data';
import {
  caseProgress,
  neighborhoodIssues,
  volunteerCategories,
} from '../domain/neighborhood';
import { gisLocations } from '../domain/integrations';
import type { CivicCase, Status, User } from '../domain/types';
import { useDemo } from './state';
import { MediaField, MediaPreview, storeMedia } from './media';
import {
  Badge,
  Button,
  Card,
  DataTable,
  Empty,
  Heading,
  JalaliDatePicker,
  Notice,
  PhotoField,
  ScoreWidget,
  StatusStepper,
  date,
  dateTime,
  money,
  num,
  number,
  text,
  today,
} from './ui';

export function LocationPicker({ district }: { district: string }) {
  const [selected, setSelected] = useState(gisLocations(district)[0] ?? '');
  return (
    <fieldset className="location-picker">
      <legend>انتخاب محل از نقشهٔ نمونهٔ محله</legend>
      <div className="map">
        <div className="map-road" />
        <div className="map-road second" />
        {gisLocations(district).map((item, index) => (
          <button
            type="button"
            className="map-pin"
            data-pin={index}
            key={item}
            onClick={() => setSelected(item)}
            aria-pressed={selected === item}
          >
            <MapPin size={17} />
            {item}
          </button>
        ))}
      </div>
      <label>
        محل گزارش
        <select
          name="location"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          {gisLocations(district).map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>
    </fieldset>
  );
}

export function SubmitCase() {
  const { state, send } = useDemo();
  const [district, setDistrict] = useState(homeDistrict);
  const [kind, setKind] = useState<CivicCase['kind']>('report');
  const [media, setMedia] = useState<File>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState<string | null>(null);
  const result = submitted
    ? state.cases.find((c) => c.id === submitted)
    : undefined;
  return (
    <>
      <Heading title="ثبت گزارش یا پیشنهاد">
        مشکل یا ایدهٔ خود را با محل و جزئیات کافی ثبت کنید.
      </Heading>
      <div className="form-layout">
        <Card>
          {result ? (
            <div className="form">
              <Notice>
                پروندهٔ <bdi>{result.id}</bdi> ثبت شد.
              </Notice>
              <Link className="ui-button" href={'/desk/cases/' + result.id}>
                مشاهدهٔ پرونده
              </Link>
              <Button
                tone="quiet"
                onClick={() => {
                  setSubmitted(null);
                  setMedia(undefined);
                }}
              >
                ثبت مورد دیگر
              </Button>
            </div>
          ) : (
            <form
              className="form"
              onSubmit={async (e) => {
                e.preventDefault();
                const data = new FormData(e.currentTarget);
                const value = parseJalali(text(data, 'date'));
                if (!value) {
                  setError('تاریخ شمسی معتبر وارد کنید.');
                  return;
                }
                if (saving) return;
                setSaving(true);
                setError('');
                try {
                  const attachment = media
                    ? await storeMedia(media)
                    : undefined;
                  setSubmitted('M-' + (1050 + state.cases.length));
                  send({
                    type: 'submit',
                    fields: {
                      kind,
                      district,
                      title: text(data, 'title'),
                      category: text(data, 'category'),
                      description: text(data, 'description'),
                      location: text(data, 'location'),
                      date: value,
                      photo: '',
                      media: attachment,
                    },
                  });
                } catch {
                  setError('ذخیرهٔ فایل انجام نشد. فضای مرورگر را بررسی کنید.');
                } finally {
                  setSaving(false);
                }
              }}
            >
              <div className="tab-row" aria-label="نوع پرونده">
                <Button
                  tone={kind === 'report' ? 'primary' : 'quiet'}
                  aria-pressed={kind === 'report'}
                  onClick={() => setKind('report')}
                >
                  گزارش مشکل
                </Button>
                <Button
                  tone={kind === 'idea' ? 'primary' : 'quiet'}
                  aria-pressed={kind === 'idea'}
                  onClick={() => setKind('idea')}
                >
                  پیشنهاد محله
                </Button>
              </div>
              <label>
                عنوان
                <input
                  required
                  minLength={4}
                  maxLength={90}
                  name="title"
                  placeholder="مثلاً روشنایی مسیر پیاده‌روی"
                />
              </label>
              <div className="grid-two">
                <label>
                  دسته‌بندی
                  <select name="category">
                    {state.categories.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label>
                  منطقه
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                  >
                    {districts.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <LocationPicker key={district} district={district} />
              <JalaliDatePicker
                label="تاریخ مشاهده"
                initial={today()}
                required
              />
              <label>
                شرح پرونده
                <textarea
                  name="description"
                  required
                  minLength={8}
                  maxLength={800}
                  rows={4}
                />
              </label>
              <MediaField
                label="افزودن عکس یا ویدیو (اختیاری)"
                file={media}
                onChange={setMedia}
              />
              {error && <Notice error>{error}</Notice>}
              <Button type="submit" disabled={saving}>
                <FilePlus2 size={19} /> ثبت پرونده
              </Button>
            </form>
          )}
        </Card>
        <Card>
          <span className="mini-icon">
            <ClipboardList size={22} />
          </span>
          <h2>بعد از ثبت چه می‌شود؟</h2>
          <ol className="instructions">
            <li>منطقه گزارش را بررسی می‌کند.</li>
            <li>پس از ارزیابی، پرونده به مجری ارجاع می‌شود.</li>
            <li>نتیجهٔ کار پس از بازرسی در پرونده نمایش داده می‌شود.</li>
          </ol>
          <p className="muted">
            نشانی دقیق و رسانه فقط در فضای مربوط به پرونده نمایش داده می‌شوند.
          </p>
        </Card>
      </div>
    </>
  );
}

export function ReportProgress({ record }: { record: CivicCase }) {
  if (record.kind !== 'report') return <Badge status={record.status} />;
  const percent = caseProgress(record);
  return (
    <div className="report-progress">
      <div>
        <Badge status={record.status} />
        {percent > 0 && <strong>{num(percent)}٪</strong>}
      </div>
      {percent > 0 && (
        <progress
          aria-label={'پیشرفت ' + record.title}
          value={percent}
          max={100}
        />
      )}
    </div>
  );
}

export function NeighborhoodPanel({ user }: { user: User }) {
  const { state } = useDemo();
  const issues = neighborhoodIssues(state, user);
  return (
    <Card>
      <div className="section-head">
        <h2>مسائل محلهٔ من</h2>
        <span className="muted">{districtName(user.district)}</span>
      </div>
      {issues.length ? (
        <ul className="neighborhood-list">
          {issues.map((record) => (
            <li key={record.id}>
              <Link className="text-link" href={'/desk/cases/' + record.id}>
                {record.title}
              </Link>
              {record.volunteer &&
              record.status === 'review' &&
              !record.project ? (
                <Badge>
                  داوطلب می‌پذیرد · {num(record.volunteer.reward)} کارا
                </Badge>
              ) : (
                <ReportProgress record={record} />
              )}
            </li>
          ))}
        </ul>
      ) : (
        <Empty>هنوز مسئله‌ای از همسایه‌های این ناحیه ثبت نشده است.</Empty>
      )}
    </Card>
  );
}

export function CaseList({
  user,
  kind,
}: {
  user: User;
  kind: 'cases' | 'inspection' | 'execution';
}) {
  const { state, send } = useDemo();
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    district: '',
    kind: '',
    from: '',
    to: '',
  });
  const [error, setError] = useState('');
  const list = state.cases.filter(
    (record) =>
      visibleCase(user, record) &&
      (kind !== 'execution' || !!record.project) &&
      (kind !== 'inspection' ||
        (!!record.project &&
          (record.status === 'inspection' || record.inspections.length > 0))) &&
      (!filters.status || filters.status === record.status) &&
      (!filters.category || filters.category === record.category) &&
      (!filters.kind || filters.kind === record.kind) &&
      (!filters.district || filters.district === record.district) &&
      (!filters.from || record.date >= filters.from) &&
      (!filters.to || record.date <= filters.to),
  );
  return (
    <>
      <Heading
        title={
          kind === 'inspection'
            ? 'صف و سوابق بازرسی'
            : kind === 'execution'
              ? 'پروژه‌ها و قراردادها'
              : 'گزارش‌ها و پیشنهادها'
        }
        action={
          user.role === 'citizen' ? (
            <Link className="ui-button" href="/desk/submit">
              <FilePlus2 size={18} /> ثبت پرونده
            </Link>
          ) : undefined
        }
      >
        پرونده‌ها را بر اساس منطقه، موضوع، تاریخ یا روند رسیدگی پیدا کنید.
      </Heading>
      {user.role === 'district' && kind === 'cases' && (
        <Card className="action-row">
          <Button onClick={() => send({ type: 'integration', source: '137' })}>
            ورود گزارش آزمایشی ۱۳۷
          </Button>
          <Button
            tone="quiet"
            onClick={() =>
              send({ type: 'integration', source: '137', fail: true })
            }
          >
            شبیه‌سازی خطای همگام‌سازی
          </Button>
        </Card>
      )}
      <Card>
        <form
          className="filter-form"
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            const start = text(data, 'from');
            const end = text(data, 'to');
            const from = start ? parseJalali(start) : '';
            const to = end ? parseJalali(end) : '';
            if (from === null || to === null || (from && to && from > to)) {
              setError('بازهٔ تاریخ معتبر وارد کنید.');
              return;
            }
            setError('');
            setFilters({
              status: text(data, 'status'),
              category: text(data, 'category'),
              district: text(data, 'district'),
              kind: text(data, 'kind'),
              from,
              to,
            });
          }}
        >
          <label>
            نوع
            <select name="kind">
              <option value="">همه</option>
              <option value="report">گزارش</option>
              <option value="idea">پیشنهاد</option>
            </select>
          </label>
          <label>
            وضعیت
            <select name="status">
              <option value="">همه</option>
              {Object.entries(statusLabel).map(([key, label]) => (
                <option value={key} key={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            دسته
            <select name="category">
              <option value="">همه</option>
              {state.categories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            منطقه
            <select name="district">
              <option value="">همهٔ مناطق مجاز</option>
              {districts
                .filter(
                  (d) =>
                    ['hq', 'citizen'].includes(user.role) ||
                    d.id === user.district,
                )
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </select>
          </label>
          <JalaliDatePicker name="from" label="از تاریخ" />
          <JalaliDatePicker name="to" label="تا تاریخ" />
          <Button type="submit">اعمال فیلتر</Button>
        </form>
        {error && <Notice error>{error}</Notice>}
      </Card>
      <Card>
        <DataTable
          head={['پرونده', 'منطقه', 'تاریخ', 'امتیاز', 'وضعیت']}
          rows={list.map((record) => [
            <Link
              className="case-link"
              key={record.id}
              href={'/desk/' + kind + '/' + record.id}
            >
              {record.title}
              <small>
                <bdi>{record.id}</bdi> ·{' '}
                {record.kind === 'report' ? 'گزارش' : 'پیشنهاد'}
              </small>
            </Link>,
            districtName(record.district),
            date(record.date),
            record.score ? num(totalScore(record.score)) : '—',
            <ReportProgress key="status" record={record} />,
          ])}
        />
      </Card>
    </>
  );
}

const methods = {
  internal: 'تیم داخلی شهرداری',
  direct: 'قرارداد قیمت مستقیم',
  tender: 'مناقصهٔ آزمایشی',
};
export function CasePage({ user, id }: { user: User; id: string }) {
  const { state, send } = useDemo();
  const record = state.cases.find(
    (item) => item.id === id && visibleCase(user, item),
  );
  const router = useRouter();
  if (!record)
    return (
      <Card>
        <Heading title="پرونده در دسترس نیست" />
        <Button tone="quiet" onClick={() => router.push('/desk/cases')}>
          بازگشت به پرونده‌ها
        </Button>
      </Card>
    );
  const full = privateCase(user, record);
  const operational = full && user.role !== 'citizen';
  const volunteer = record.project?.method === 'volunteer';
  const seesProof = operational || record.project?.worker === user.id;
  const publicVolunteer = record.volunteer && record.district === user.district;
  return (
    <>
      <Heading title={record.title} action={<Badge status={record.status} />}>
        <bdi>{record.id}</bdi> · {record.category} ·{' '}
        {districtName(record.district)} · {date(record.date)}
      </Heading>
      {record.kind === 'report' && (
        <Card>
          <h2>پیشرفت گزارش</h2>
          <ReportProgress record={record} />
        </Card>
      )}
      <div className="grid-two">
        <Card>
          <h2>شرح پرونده</h2>
          <p>
            {full || publicVolunteer
              ? full
                ? record.description
                : (record.volunteer?.task ?? record.description)
              : 'جزئیات عمومی در روند رسیدگی و امتیاز پرونده نمایش داده می‌شود.'}
          </p>
          {(full || publicVolunteer) && (
            <>
              <p>
                <MapPin size={16} /> {record.location}
              </p>
              {full && record.media && (
                <MediaPreview
                  key={record.media.id}
                  media={record.media}
                  label="رسانهٔ پرونده"
                />
              )}
              {full && record.photo && (
                <img
                  className="photo-preview"
                  src={record.photo}
                  alt="تصویر پرونده"
                />
              )}
            </>
          )}
          {record.mergedInto && (
            <Link
              className="text-link"
              href={'/desk/cases/' + record.mergedInto}
            >
              پروندهٔ مقصد <bdi>{record.mergedInto}</bdi>
            </Link>
          )}
          {record.project && operational && (
            <div className="contract-summary">
              <strong>
                {volunteer
                  ? 'اجرای داوطلبانهٔ شهروند'
                  : methods[record.project.method as keyof typeof methods]}
              </strong>
              <span>
                {volunteer
                  ? num(record.volunteer?.reward ?? 0) + ' کارا'
                  : money(record.project.price)}
              </span>
            </div>
          )}
          <p>
            مشارکت: {num(record.votes.length)} رأی ·{' '}
            {num(record.evidence.length)} توضیح{' '}
            {record.confirmed && '· کیفیت تأیید شد'}
          </p>
          {full && record.evidence.length > 0 && (
            <ul>
              {record.evidence.map((evidence, index) => (
                <li key={index}>{evidence}</li>
              ))}
            </ul>
          )}
          {user.role === 'citizen' &&
            !['merged', 'rejected'].includes(record.status) && (
              <div className="form">
                {record.owner !== user.id && (
                  <>
                    <Button
                      tone="quiet"
                      disabled={record.votes.includes(user.id)}
                      onClick={() => send({ type: 'case', id, action: 'vote' })}
                    >
                      <ThumbsUp size={18} />{' '}
                      {record.votes.includes(user.id)
                        ? 'رأی شما ثبت شد'
                        : 'رأی به پرونده'}
                    </Button>
                    <form
                      className="form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        send({
                          type: 'case',
                          id,
                          action: 'evidence',
                          note: text(new FormData(e.currentTarget), 'evidence'),
                        });
                      }}
                    >
                      <label>
                        افزودن توضیح یا شواهد
                        <textarea
                          name="evidence"
                          minLength={4}
                          maxLength={500}
                          required
                        />
                      </label>
                      <Button tone="quiet" type="submit">
                        ارسال توضیح
                      </Button>
                    </form>
                  </>
                )}
                {record.status === 'approved' &&
                  !record.confirmed &&
                  !(volunteer && record.project?.worker === user.id) && (
                    <Button
                      onClick={() =>
                        send({ type: 'case', id, action: 'confirm' })
                      }
                    >
                      تأیید کیفیت از سوی شهروند
                    </Button>
                  )}
              </div>
            )}
        </Card>
        <ScoreWidget score={record.score} />
      </div>
      {publicVolunteer &&
        user.role === 'citizen' &&
        record.owner !== user.id && (
          <VolunteerActions key={record.id} record={record} user={user} />
        )}
      {seesProof && record.volunteer?.proof && (
        <Card>
          <h2>مدرک رفع مسئله</h2>
          <p>{record.volunteer.proof.note}</p>
          <MediaPreview
            key={record.volunteer.proof.media.id}
            media={record.volunteer.proof.media}
            label="رسانهٔ رفع مسئله"
          />
        </Card>
      )}
      {full && <CaseActions record={record} user={user} />}
      <div className="grid-two">
        <Card>
          <h2>روند رسیدگی</h2>
          <StatusStepper record={record} privateDetails={operational} />
        </Card>
        {operational && record.inspections.length > 0 && (
          <Card>
            <h2>سوابق کیفیت و اصلاح</h2>
            {record.inspections.map((row, i) => (
              <div className="inspection-row" key={i}>
                <strong>{num(row.quality)} از ۱۰۰</strong>
                <p>{row.checklist}</p>
                <small>
                  {row.location} · {dateTime(row.at)}
                </small>
                {row.photo && (
                  <img
                    className="photo-preview"
                    src={row.photo}
                    alt="مدرک تصویری بازرسی"
                  />
                )}
              </div>
            ))}
          </Card>
        )}
      </div>
    </>
  );
}

function VolunteerActions({ record, user }: { record: CivicCase; user: User }) {
  const { state, send } = useDemo();
  const [proof, setProof] = useState<File>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  if (!record.volunteer || ['rejected', 'merged'].includes(record.status))
    return null;
  const assigned =
    record.project?.method === 'volunteer' && record.project.worker === user.id;
  return (
    <Card>
      <h2>مشارکت در رفع مسئله</h2>
      {record.volunteer.task && <p>{record.volunteer.task}</p>}
      <p>
        با تأیید بازرس {num(record.volunteer.reward)} کارا به کیف پول داوطلب
        اضافه می‌شود.
      </p>
      {record.status === 'review' && !record.project && (
        <Button
          disabled={blocked(state, user.role, 'case')}
          onClick={() =>
            send({ type: 'case', id: record.id, action: 'claimVolunteer' })
          }
        >
          انجام این کار را می‌پذیرم
        </Button>
      )}
      {assigned &&
        (record.status === 'assigned' || record.status === 'rework') && (
          <form
            className="form"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!proof || saving) return;
              const note = text(new FormData(event.currentTarget), 'note');
              setSaving(true);
              setError('');
              try {
                send({
                  type: 'case',
                  id: record.id,
                  action: 'submitProof',
                  note,
                  proof: await storeMedia(proof),
                });
              } catch {
                setError('ذخیرهٔ رسانه انجام نشد. لطفاً دوباره تلاش کنید.');
              } finally {
                setSaving(false);
              }
            }}
          >
            <label>
              شرح کار انجام‌شده
              <textarea name="note" minLength={8} maxLength={800} required />
            </label>
            <MediaField
              label="عکس یا ویدیوی مدرک رفع مسئله"
              file={proof}
              onChange={setProof}
              required
            />
            {error && <Notice error>{error}</Notice>}
            <Button
              type="submit"
              disabled={saving || blocked(state, user.role, 'case')}
            >
              ارسال مدرک برای تأیید
            </Button>
          </form>
        )}
      {assigned && record.status === 'inspection' && (
        <Notice>مدرک در صف بازرسی است.</Notice>
      )}
      {assigned && record.status === 'approved' && (
        <Notice>رفع مسئله تأیید شد و پاداش به کیف پول شما اضافه شد.</Notice>
      )}
    </Card>
  );
}

function CaseActions({ record, user }: { record: CivicCase; user: User }) {
  const { state, send } = useDemo();
  const [method, setMethod] = useState<keyof typeof methods>('direct');
  const [image, setImage] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const allowed = (action: keyof typeof transitions.report) =>
    (transitions[record.kind][action] as Status[]).includes(record.status);
  const id = record.id;
  const staff = user.role === 'district';
  const isWorker =
    record.project?.worker === user.id && record.project.method !== 'volunteer';
  const canReview = staff && (allowed('reject') || allowed('merge'));
  return (
    <>
      {staff && allowed('evaluate') && !record.score && (
        <Card>
          <h2>ارزیابی پرونده</h2>
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              send({
                type: 'case',
                id,
                action: 'evaluate',
                values: [number(d, '0'), number(d, '1'), number(d, '2')],
              });
            }}
          >
            <div className="grid-three">
              {parameters.map((label, i) => (
                <label key={label}>
                  {label}
                  <input
                    name={String(i)}
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={75}
                    required
                  />
                </label>
              ))}
            </div>
            <Button type="submit">ثبت امتیاز و بررسی</Button>
          </form>
        </Card>
      )}
      {staff &&
        record.kind === 'report' &&
        record.status === 'review' &&
        record.score &&
        !record.volunteer &&
        volunteerCategories.includes(record.category) && (
          <Card>
            <h2>واگذاری به داوطلب محله</h2>
            <p>
              فقط کار کم‌خطر و مشخص را منتشر کنید. کار تخصصی را به مجری شهرداری
              بسپارید.
            </p>
            <form
              className="form"
              onSubmit={(event) => {
                event.preventDefault();
                send({
                  type: 'case',
                  id,
                  action: 'openVolunteer',
                  note: text(new FormData(event.currentTarget), 'task'),
                });
              }}
            >
              <label>
                شرح عمومی کار داوطلبانه
                <textarea name="task" minLength={8} maxLength={800} required />
              </label>
              <Button type="submit">انتشار برای داوطلبان ناحیه</Button>
            </form>
          </Card>
        )}
      {staff && allowed('assign') && record.score && (
        <Card>
          <h2>ارجاع پرونده به مجری</h2>
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              send({
                type: 'case',
                id,
                action: 'assign',
                note: text(d, 'reason'),
                project: {
                  method,
                  worker: method === 'internal' ? 'district' : 'contractor',
                  inspector: 'inspector',
                  price: method === 'internal' ? 0 : number(d, 'price'),
                },
              });
            }}
          >
            <div className="grid-two">
              <label>
                روش ارجاع
                <select
                  value={method}
                  onChange={(e) =>
                    setMethod(e.target.value as keyof typeof methods)
                  }
                >
                  {Object.entries(methods).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              {method !== 'internal' && (
                <label>
                  مبلغ پیشنهادی (تومان)
                  <input
                    name="price"
                    type="number"
                    min={1}
                    defaultValue={1250000}
                    required
                  />
                </label>
              )}
            </div>
            <label>
              شرح و دلیل ارجاع
              <input name="reason" required maxLength={300} />
            </label>
            <Button type="submit">ثبت ارجاع</Button>
          </form>
        </Card>
      )}
      {canReview && (
        <Card>
          <h2>رد یا ادغام پرونده</h2>
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              const action = text(d, 'action') === 'merge' ? 'merge' : 'reject';
              send({
                type: 'case',
                id,
                action,
                note: text(d, 'reason'),
                target: text(d, 'target'),
              });
            }}
          >
            <div className="grid-two">
              <label>
                تصمیم
                <select name="action">
                  <option value="reject">رد پرونده</option>
                  <option value="merge">ادغام با پروندهٔ دیگر</option>
                </select>
              </label>
              <label>
                پروندهٔ مقصد
                <select name="target">
                  <option value="">انتخاب کنید</option>
                  {state.cases
                    .filter(
                      (item) =>
                        item.id !== id &&
                        item.district === record.district &&
                        item.kind === record.kind &&
                        !['merged', 'rejected'].includes(item.status),
                    )
                    .map((item) => (
                      <option value={item.id} key={item.id}>
                        {item.title}
                      </option>
                    ))}
                </select>
              </label>
            </div>
            <label>
              دلیل تصمیم
              <input name="reason" required maxLength={300} />
            </label>
            <Button tone="danger" type="submit">
              ثبت تصمیم
            </Button>
          </form>
        </Card>
      )}
      {isWorker && (allowed('progress') || allowed('inspect')) && (
        <Card>
          <h2>ثبت پیشرفت اجرا</h2>
          <form
            className="form"
            onSubmit={async (e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              const action =
                (e.nativeEvent as SubmitEvent).submitter?.getAttribute(
                  'value',
                ) === 'inspect'
                  ? 'inspect'
                  : 'progress';
              const file = d.get('document');
              let document;
              if (file instanceof File && file.size) {
                if (
                  !['application/pdf', 'image/png', 'image/jpeg'].includes(
                    file.type,
                  ) ||
                  file.size > 350_000 ||
                  file.name.length > 180
                ) {
                  setError('سند PDF، PNG یا JPG تا ۳۵۰ کیلوبایت انتخاب کنید.');
                  return;
                }
                setUploading(true);
                try {
                  const data = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(String(reader.result));
                    reader.onerror = () =>
                      reject(new Error('Document could not be read'));
                    reader.readAsDataURL(file);
                  });
                  document = { name: file.name, data };
                } catch {
                  setError('خواندن فایل انجام نشد.');
                  return;
                } finally {
                  setUploading(false);
                }
              }
              setError('');
              send({
                type: 'case',
                id,
                action,
                note: text(d, 'note'),
                document,
              });
            }}
          >
            <label>
              شرح پیشرفت
              <textarea name="note" required maxLength={500} />
            </label>
            <label>
              سند کار (PDF یا تصویر، اختیاری)
              <input
                type="file"
                accept="application/pdf,image/png,image/jpeg"
                name="document"
              />
            </label>
            {error && <Notice error>{error}</Notice>}
            <div className="action-row">
              <Button value="progress" type="submit" disabled={uploading}>
                ذخیرهٔ پیشرفت
              </Button>
              {allowed('inspect') && (
                <Button
                  value="inspect"
                  tone="quiet"
                  type="submit"
                  disabled={uploading}
                >
                  ارسال برای بازرسی
                </Button>
              )}
            </div>
          </form>
        </Card>
      )}
      {user.role === 'inspector' &&
        record.project?.inspector === user.id &&
        allowed('approve') && (
          <Card>
            <h2>نتیجهٔ بازدید و بازرسی</h2>
            <form
              className="form"
              onSubmit={(e) => {
                e.preventDefault();
                const d = new FormData(e.currentTarget);
                const day = parseJalali(text(d, 'date'));
                const visitedAt = day && tehranInstant(day, text(d, 'clock'));
                if (!visitedAt) {
                  setError('تاریخ یا ساعت بازرسی معتبر نیست.');
                  return;
                }
                setError('');
                const action =
                  (e.nativeEvent as SubmitEvent).submitter?.getAttribute(
                    'value',
                  ) === 'rework'
                    ? 'rework'
                    : 'approve';
                send({
                  type: 'case',
                  id,
                  action,
                  note: text(d, 'reason'),
                  inspection: {
                    at: visitedAt,
                    quality: number(d, 'quality'),
                    location: text(d, 'location'),
                    checklist: text(d, 'checklist'),
                    photo: image,
                  },
                });
              }}
            >
              <div className="grid-two">
                <JalaliDatePicker
                  label="تاریخ بازدید"
                  initial={today()}
                  required
                />
                <label>
                  ساعت بازدید (وقت تهران)
                  <input
                    dir="ltr"
                    type="time"
                    name="clock"
                    defaultValue="10:00"
                    required
                  />
                </label>
                <label>
                  محل بازدید
                  <select name="location">
                    {gisLocations(record.district).map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label>
                  امتیاز کیفیت از صد
                  <input
                    name="quality"
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={90}
                    required
                  />
                </label>
                <label>
                  چک‌لیست کیفیت
                  <select name="checklist">
                    <option>ایمنی، تطابق با قرارداد و نظافت بررسی شد</option>
                    <option>
                      بازبینی ایمنی انجام شد؛ تطابق نیازمند اصلاح است
                    </option>
                  </select>
                </label>
              </div>
              <PhotoField label="تصویر بازدید (اختیاری)" onChange={setImage} />
              <label>
                دلیل و شرح نتیجه
                <textarea name="reason" required maxLength={600} />
              </label>
              {error && <Notice error>{error}</Notice>}
              <div className="action-row">
                <Button value="approve" type="submit">
                  تأیید نتیجه
                </Button>
                <Button value="rework" tone="danger" type="submit">
                  رد نتیجه و درخواست اصلاح
                </Button>
              </div>
            </form>
          </Card>
        )}
      {user.role === 'inspector' &&
        record.status !== 'inspection' &&
        !record.inspections.length && <Empty>بازدید هنوز ثبت نشده است.</Empty>}
    </>
  );
}
