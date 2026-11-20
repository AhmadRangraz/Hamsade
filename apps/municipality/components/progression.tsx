'use client';

import Link from 'next/link';
import { Award, Flame, Target, TrendingUp, Trophy } from 'lucide-react';
import {
  activityLabels,
  civicProgress,
  mission,
  rankDemoCitizen,
  weeklyQuest,
} from '../domain/progression';
import { useDemo } from './state';
import { Badge, Card, DataTable, Empty, Heading, More, date, num } from './ui';

type Progress = ReturnType<typeof civicProgress>;

function LevelMeter({ progress }: { progress: Progress }) {
  const next = progress.nextLevel;
  return (
    <div className="progression-meter">
      <div className="section-head">
        <strong>سطح {num(progress.level)}</strong>
        <span>{num(progress.xp)} امتیاز تجربه</span>
      </div>
      {next === null ? (
        <p>به بالاترین سطح رسیده‌اید.</p>
      ) : (
        <>
          <progress
            aria-label="پیشرفت تا سطح بعد"
            value={progress.xp - progress.levelStart}
            max={next - progress.levelStart}
          />
          <p className="muted">{num(next - progress.xp)} امتیاز تا سطح بعدی</p>
        </>
      )}
    </div>
  );
}

export function ProgressSummary() {
  const { state } = useDemo();
  const progress = civicProgress(state, new Date().toISOString());
  return (
    <Card className="progression-summary">
      <span className="mini-icon">
        <TrendingUp size={21} aria-hidden="true" />
      </span>
      <div>
        <h2>پیشرفت مشارکت</h2>
        <LevelMeter progress={progress} />
        <Link href="/desk/progress" className="text-link">
          مشاهدهٔ نشان‌ها و مأموریت‌ها <More />
        </Link>
      </div>
    </Card>
  );
}

export function ProgressPage() {
  const { state, send } = useDemo();
  const progress = civicProgress(state, new Date().toISOString());
  return (
    <>
      <Heading title="پیشرفت مشارکت">
        با مشارکت تأییدشده امتیاز تجربه بگیرید و نشان‌های محله را باز کنید. کارا
        در کیف پول جداگانه نگه‌داری می‌شود.
      </Heading>
      <div className="grid-two">
        <Card>
          <div className="section-head">
            <h2>امتیاز و سطح شهروندی</h2>
            <TrendingUp size={20} aria-hidden="true" />
          </div>
          <LevelMeter progress={progress} />
        </Card>
        <Card>
          <div className="section-head">
            <h2>تداوم مشارکت</h2>
            <Flame size={20} aria-hidden="true" />
          </div>
          <p>
            تداوم روزانه: {num(progress.streaks.daily.current)} روز · رکورد{' '}
            {num(progress.streaks.daily.longest)} روز
          </p>
          <p>
            تداوم هفتگی: {num(progress.streaks.weekly.current)} هفته · رکورد{' '}
            {num(progress.streaks.weekly.longest)} هفته
          </p>
        </Card>
        <Card>
          <div className="section-head">
            <h2>چالش هفتگی محله</h2>
            <Target size={20} aria-hidden="true" />
          </div>
          <p>
            در هفتهٔ جاری {num(weeklyQuest.target)} فعالیت واجد شرایط انجام دهید
            و {num(weeklyQuest.xp)} امتیاز پاداش بگیرید.
          </p>
          <progress
            className="progression-bar"
            aria-label="پیشرفت چالش هفتگی"
            value={progress.weekly.count}
            max={weeklyQuest.target}
          />
          <p>
            {num(progress.weekly.count)} از {num(weeklyQuest.target)} فعالیت ·
            آغاز هفته {date(progress.weekly.start)}
          </p>
          <Badge status={progress.weekly.completed ? 'approved' : 'progress'}>
            {progress.weekly.completed ? 'چالش تکمیل شد' : 'چالش در جریان است'}
          </Badge>
        </Card>
        <Card>
          <div className="section-head">
            <h2>مأموریت از گزارش تا نتیجه</h2>
            <Target size={20} aria-hidden="true" />
          </div>
          <p>
            به ترتیب مراحل را انجام دهید و {num(mission.xp)} امتیاز پاداش
            بگیرید.
          </p>
          <ol className="progression-steps">
            {mission.steps.map(({ event }, index) => {
              const completed = index < progress.mission.completedSteps;
              const active = index === progress.mission.completedSteps;
              return (
                <li key={event}>
                  <span>{activityLabels[event]}</span>
                  <Badge
                    status={
                      completed ? 'approved' : active ? 'progress' : undefined
                    }
                  >
                    {completed
                      ? 'انجام شد'
                      : active
                        ? 'مرحلهٔ فعلی'
                        : 'در انتظار مرحلهٔ قبل'}
                  </Badge>
                </li>
              );
            })}
          </ol>
        </Card>
      </div>
      <Card>
        <div className="section-head">
          <h2>نشان‌های مشارکت</h2>
          <Award size={20} aria-hidden="true" />
        </div>
        <DataTable
          head={['نشان', 'پیشرفت', 'وضعیت']}
          rows={progress.badges.map((badge) => [
            badge.title,
            `${num(Math.min(badge.current, badge.target))} از ${num(badge.target)} ${badge.category === 'xp' ? 'امتیاز' : 'فعالیت'}`,
            <Badge
              key={badge.key}
              status={badge.unlocked ? 'approved' : undefined}
            >
              {badge.unlocked ? 'باز شده' : 'در انتظار'}
            </Badge>,
          ])}
        />
      </Card>
      <Card>
        <div className="section-head">
          <h2>جدول نمونهٔ همسایه‌ها</h2>
          <Trophy size={20} aria-hidden="true" />
        </div>
        <p className="muted">
          امتیاز همسایه‌ها نمونه است. افزودن جایگاه شما فقط در همین مرورگر اعمال
          می‌شود.
        </p>
        <label className="check">
          <input
            type="checkbox"
            checked={progress.rankingOptIn}
            onChange={(event) =>
              send({ type: 'rankingConsent', optIn: event.target.checked })
            }
          />
          نمایش جایگاه من در جدول نمونه
        </label>
        <DataTable
          head={['رتبه', 'همسایه', 'امتیاز تجربه']}
          rows={rankDemoCitizen(progress).map((row, index) => [
            num(index + 1),
            row.name,
            num(row.xp),
          ])}
        />
      </Card>
      <Card>
        <h2>گردش امتیاز تجربه</h2>
        {progress.entries.length ? (
          <DataTable
            head={['فعالیت', 'امتیاز', 'تاریخ']}
            rows={progress.entries
              .slice(0, 20)
              .map((entry) => [
                activityLabels[entry.event],
                num(entry.xp),
                date(entry.day),
              ])}
          />
        ) : (
          <Empty>هنوز فعالیت واجد شرایط ثبت نشده است.</Empty>
        )}
      </Card>
    </>
  );
}
