/**
 * Training Log — a record of days trained.
 *
 * Brand Book: no streaks, badges, or celebration. This keeps the simple
 * record (which days were marked) and presents it as a ledger, not a game.
 */
import { useCallback, useMemo } from 'react';
import { IonButton } from '@ionic/react';

import { useAppData } from '@/hooks/useAppData';

interface LogData {
  completedDates: string[]; // ISO YYYY-MM-DD
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function dayOffset(iso: string, daysBack: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - daysBack);
  return d.toISOString().slice(0, 10);
}

function formatLong(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

const WEEKDAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const eyebrow: React.CSSProperties = {
  fontFamily: 'var(--foundry-font-mono)',
  fontSize: 10,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: 'var(--foundry-text-subtle)',
};

export default function TrainingLogApp() {
  const { value: data, setValue, ready } = useAppData<LogData>(
    'workout-streak',
    'data',
    { completedDates: [] },
  );

  const today = todayKey();
  const set = useMemo(() => new Set(data.completedDates), [data.completedDates]);
  const recordedToday = set.has(today);

  const thisWeek = useMemo(() => {
    let n = 0;
    for (let i = 0; i < 7; i++) if (set.has(dayOffset(today, i))) n += 1;
    return n;
  }, [set, today]);

  const thisMonth = useMemo(() => {
    const prefix = today.slice(0, 7);
    return data.completedDates.filter((d) => d.startsWith(prefix)).length;
  }, [data.completedDates, today]);

  const lastRecorded = useMemo(() => {
    if (data.completedDates.length === 0) return null;
    return [...data.completedDates].sort().at(-1) ?? null;
  }, [data.completedDates]);

  const last7 = useMemo(() => {
    const days: { iso: string; done: boolean; isToday: boolean; wd: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const iso = dayOffset(today, i);
      const wd = WEEKDAY[new Date(iso + 'T00:00:00Z').getUTCDay()];
      days.push({ iso, done: set.has(iso), isToday: iso === today, wd });
    }
    return days;
  }, [set, today]);

  const toggleToday = useCallback(async () => {
    const next = new Set(set);
    if (next.has(today)) next.delete(today);
    else next.add(today);
    await setValue({ completedDates: Array.from(next).sort() });
  }, [set, today, setValue]);

  if (!ready) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        padding: '24px 20px 40px',
        maxWidth: 420,
        margin: '0 auto',
      }}
    >
      {/* Record action */}
      <div
        style={{
          background: 'var(--foundry-card)',
          border: '1px solid var(--foundry-border)',
          borderRadius: 'var(--foundry-radius-md)',
          padding: '20px 22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div>
          <div style={eyebrow}>Today</div>
          <div
            style={{
              fontFamily: 'var(--foundry-font-display)',
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: recordedToday ? 'var(--foundry-ember)' : 'var(--foundry-text)',
              marginTop: 4,
            }}
          >
            {recordedToday ? 'Recorded' : 'Not recorded'}
          </div>
        </div>
        <IonButton
          fill={recordedToday ? 'clear' : 'outline'}
          color={recordedToday ? 'medium' : 'primary'}
          onClick={() => void toggleToday()}
        >
          {recordedToday ? 'Undo' : 'Record today'}
        </IonButton>
      </div>

      {/* Facts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Stat label="This Week" value={`${thisWeek}`} sub={`of 7 days`} />
        <Stat label="This Month" value={`${thisMonth}`} sub={thisMonth === 1 ? 'day' : 'days'} />
      </div>

      {/* 7-day record */}
      <div
        style={{
          background: 'var(--foundry-card)',
          border: '1px solid var(--foundry-border)',
          borderRadius: 'var(--foundry-radius-md)',
          padding: '18px 20px',
        }}
      >
        <div style={{ ...eyebrow, marginBottom: 14 }}>Last Seven Days</div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
          {last7.map((d) => (
            <div
              key={d.iso}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
            >
              <div
                title={d.iso}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 6,
                  background: d.done ? 'var(--foundry-ember)' : 'var(--foundry-elevated)',
                  border: d.isToday
                    ? '1.5px solid var(--foundry-text)'
                    : '1px solid var(--foundry-border)',
                }}
              />
              <span style={{ ...eyebrow, fontSize: 9, letterSpacing: '0.1em' }}>{d.wd}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ ...eyebrow, textAlign: 'center' }}>
        {lastRecorded ? `Last recorded ${formatLong(lastRecorded)}` : 'No sessions recorded'}
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div
      style={{
        padding: '16px 18px',
        border: '1px solid var(--foundry-border)',
        borderRadius: 'var(--foundry-radius-md)',
        background: 'var(--foundry-card)',
      }}
    >
      <div style={eyebrow}>{label}</div>
      <div
        style={{
          fontFamily: 'var(--foundry-font-display)',
          fontSize: 34,
          fontWeight: 700,
          color: 'var(--foundry-text)',
          marginTop: 4,
          lineHeight: 1,
          letterSpacing: '-0.02em',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
        <span
          style={{
            fontFamily: 'var(--foundry-font-body)',
            fontSize: 14,
            color: 'var(--foundry-text-subtle)',
            marginLeft: 6,
          }}
        >
          {sub}
        </span>
      </div>
    </div>
  );
}
