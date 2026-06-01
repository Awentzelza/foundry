/**
 * Workout Streak — tap to mark today done.
 * Tracks current streak and longest streak. Resets when you miss a day.
 */
import { useCallback, useMemo } from 'react';
import { IonButton } from '@ionic/react';

import { useAppData } from '@/hooks/useAppData';

interface StreakData {
  completedDates: string[]; // ISO YYYY-MM-DD, ascending or any order
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function dayOffset(iso: string, daysBack: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - daysBack);
  return d.toISOString().slice(0, 10);
}

function calcCurrent(dates: Set<string>): number {
  let streak = 0;
  const today = todayKey();
  // If today isn't done, start from yesterday so we still credit an active streak.
  let cursor = dates.has(today) ? today : dayOffset(today, 1);
  while (dates.has(cursor)) {
    streak += 1;
    cursor = dayOffset(cursor, 1);
  }
  return streak;
}

function calcLongest(dates: string[]): number {
  if (dates.length === 0) return 0;
  const set = new Set(dates);
  let longest = 0;
  for (const d of dates) {
    // Only start counting from a "streak start" (no previous day in set).
    const prev = dayOffset(d, 1);
    if (set.has(prev)) continue;
    let len = 0;
    let cursor = d;
    while (set.has(cursor)) {
      len += 1;
      const next = new Date(cursor + 'T00:00:00Z');
      next.setUTCDate(next.getUTCDate() + 1);
      cursor = next.toISOString().slice(0, 10);
    }
    if (len > longest) longest = len;
  }
  return longest;
}

export default function WorkoutStreakApp() {
  const { value: data, setValue, ready } = useAppData<StreakData>(
    'workout-streak',
    'data',
    { completedDates: [] },
  );

  const today = todayKey();
  const completedToday = useMemo(
    () => data.completedDates.includes(today),
    [data.completedDates, today],
  );

  const currentStreak = useMemo(
    () => calcCurrent(new Set(data.completedDates)),
    [data.completedDates],
  );
  const longestStreak = useMemo(
    () => Math.max(calcLongest(data.completedDates), currentStreak),
    [data.completedDates, currentStreak],
  );

  const last7 = useMemo(() => {
    const days: { iso: string; done: boolean; isToday: boolean }[] = [];
    const set = new Set(data.completedDates);
    for (let i = 6; i >= 0; i--) {
      const iso = dayOffset(today, i);
      days.push({ iso, done: set.has(iso), isToday: iso === today });
    }
    return days;
  }, [data.completedDates, today]);

  const toggleToday = useCallback(async () => {
    const set = new Set(data.completedDates);
    if (set.has(today)) set.delete(today);
    else set.add(today);
    await setValue({ completedDates: Array.from(set).sort() });
  }, [data.completedDates, today, setValue]);

  if (!ready) return null;

  const accent = completedToday ? 'var(--foundry-ember)' : 'var(--foundry-text-dim)';
  const glow = completedToday
    ? '0 0 40px rgba(232, 116, 44, 0.35), inset 0 0 0 1px rgba(232, 116, 44, 0.6)'
    : 'inset 0 0 0 1px var(--foundry-border)';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 28,
        padding: '32px 20px 40px',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--foundry-font-mono)',
          textTransform: 'uppercase',
          letterSpacing: '0.18em',
          fontSize: 11,
          color: 'var(--foundry-text-dim)',
        }}
      >
        {completedToday ? "Today's logged" : 'Tap when done'}
      </div>

      <button
        type="button"
        onClick={() => void toggleToday()}
        aria-label={completedToday ? 'Undo today' : 'Mark today done'}
        style={{
          width: 220,
          height: 220,
          borderRadius: '50%',
          background: completedToday
            ? 'radial-gradient(circle, #2a1a10 0%, var(--foundry-bg-card) 70%)'
            : 'var(--foundry-bg-card)',
          border: 'none',
          color: accent,
          fontSize: 88,
          lineHeight: 1,
          boxShadow: glow,
          cursor: 'pointer',
          transition: 'transform 0.15s ease, box-shadow 0.25s ease',
          touchAction: 'manipulation',
        }}
        onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
        onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        <span aria-hidden>{completedToday ? '🔥' : '💪'}</span>
      </button>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          width: 'min(100%, 360px)',
        }}
      >
        <StatCard label="Current" value={currentStreak} hot={currentStreak > 0} />
        <StatCard label="Longest" value={longestStreak} hot={longestStreak > 0} />
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'flex-end',
        }}
        aria-label="Last 7 days"
      >
        {last7.map((d) => (
          <div
            key={d.iso}
            title={d.iso}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: d.done ? 'var(--foundry-ember)' : 'var(--foundry-bg-card)',
              border: d.isToday
                ? '1.5px solid var(--foundry-text)'
                : '1px solid var(--foundry-border)',
              opacity: d.done ? 1 : 0.85,
            }}
          />
        ))}
      </div>

      {completedToday && (
        <IonButton
          fill="clear"
          color="medium"
          size="small"
          onClick={() => void toggleToday()}
        >
          Undo today
        </IonButton>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  hot,
}: {
  label: string;
  value: number;
  hot: boolean;
}) {
  return (
    <div
      style={{
        padding: '14px 16px',
        border: '1px solid var(--foundry-border)',
        borderRadius: 'var(--foundry-radius-md)',
        background: 'var(--foundry-bg-card)',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--foundry-font-mono)',
          fontSize: 10,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--foundry-text-dim)',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--foundry-font-display)',
          fontSize: 32,
          fontWeight: 700,
          color: hot ? 'var(--foundry-ember)' : 'var(--foundry-text)',
          marginTop: 4,
          lineHeight: 1,
          letterSpacing: '-0.02em',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
        <span
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--foundry-text-dim)',
            marginLeft: 4,
          }}
        >
          day{value === 1 ? '' : 's'}
        </span>
      </div>
    </div>
  );
}
