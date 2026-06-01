import { useState, useCallback } from 'react';
import { IonButton, IonRippleEffect } from '@ionic/react';
import { useAppData } from '@/hooks/useAppData';

interface StreakData {
  completedDates: string[];
  longestStreak: number;
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

function calcCurrentStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const sorted = [...dates].sort().reverse();
  const today = toDateStr(new Date());
  const yesterday = toDateStr(new Date(Date.now() - 86400000));
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + 'T12:00:00');
    const curr = new Date(sorted[i] + 'T12:00:00');
    const diff = (prev.getTime() - curr.getTime()) / 86400000;
    if (Math.round(diff) === 1) streak++;
    else break;
  }
  return streak;
}

function calcLongest(dates: string[], currentBest: number): number {
  if (dates.length === 0) return currentBest;
  const sorted = [...dates].sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + 'T12:00:00');
    const curr = new Date(sorted[i] + 'T12:00:00');
    const diff = (curr.getTime() - prev.getTime()) / 86400000;
    if (Math.round(diff) === 1) { run++; best = Math.max(best, run); }
    else run = 1;
  }
  return Math.max(best, currentBest);
}

export default function WorkoutStreak() {
  const [data, setData] = useAppData<StreakData>('workout-streak', 'streakData', {
    completedDates: [],
    longestStreak: 0,
  });

  const today = toDateStr(new Date());
  const doneToday = data.completedDates.includes(today);
  const currentStreak = calcCurrentStreak(data.completedDates);
  const longestStreak = Math.max(data.longestStreak, currentStreak);

  const [pulse, setPulse] = useState(false);

  const handleTap = useCallback(() => {
    setPulse(true);
    setTimeout(() => setPulse(false), 600);
    if (doneToday) {
      const next = data.completedDates.filter(d => d !== today);
      setData({ completedDates: next, longestStreak: data.longestStreak });
    } else {
      const next = [...data.completedDates, today];
      const newLongest = calcLongest(next, data.longestStreak);
      setData({ completedDates: next, longestStreak: newLongest });
    }
  }, [doneToday, data, today, setData]);

  // Last 7 days for the mini calendar
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000);
    return toDateStr(d);
  });

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '28px 20px 32px',
      gap: '28px',
      maxWidth: '400px',
      margin: '0 auto',
    }}>

      {/* Big tap button */}
      <div
        onClick={handleTap}
        className="ion-activatable"
        style={{
          position: 'relative',
          overflow: 'hidden',
          width: '180px',
          height: '180px',
          borderRadius: '50%',
          background: doneToday
            ? 'radial-gradient(circle at 40% 35%, #f0923a, var(--foundry-ember) 60%, #b85510)'
            : 'var(--foundry-bg-elevated)',
          border: `2px solid ${doneToday ? 'var(--foundry-ember-bright)' : 'var(--foundry-border-strong)'}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          boxShadow: doneToday
            ? '0 0 40px rgba(232,116,44,0.35), 0 8px 32px rgba(0,0,0,0.4)'
            : '0 4px 20px rgba(0,0,0,0.3)',
          transform: pulse ? 'scale(0.94)' : 'scale(1)',
        }}
      >
        <IonRippleEffect />
        <span style={{ fontSize: '52px', lineHeight: 1, marginBottom: '6px' }}>
          {doneToday ? '🔥' : '💪'}
        </span>
        <span style={{
          fontFamily: 'var(--foundry-font-mono)',
          fontSize: '10px',
          letterSpacing: '0.16em',
          color: doneToday ? 'rgba(255,255,255,0.85)' : 'var(--foundry-text-dim)',
          textTransform: 'uppercase',
        }}>
          {doneToday ? 'Done!' : 'Tap to log'}
        </span>
      </div>

      {/* Streak numbers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        width: '100%',
      }}>
        {[
          { label: 'Current Streak', value: currentStreak, unit: currentStreak === 1 ? 'day' : 'days' },
          { label: 'Longest Streak', value: longestStreak, unit: longestStreak === 1 ? 'day' : 'days' },
        ].map(({ label, value, unit }) => (
          <div key={label} style={{
            background: 'var(--foundry-bg-card)',
            border: '1px solid var(--foundry-border)',
            borderRadius: 'var(--foundry-radius-md)',
            padding: '18px 16px',
            textAlign: 'center',
          }}>
            <div style={{
              fontFamily: 'var(--foundry-font-mono)',
              fontSize: '10px',
              letterSpacing: '0.16em',
              color: 'var(--foundry-text-dim)',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}>{label}</div>
            <div style={{
              fontFamily: 'var(--foundry-font-display)',
              fontSize: '48px',
              fontWeight: 700,
              lineHeight: 1,
              color: value > 0 ? 'var(--foundry-ember)' : 'var(--foundry-text-muted)',
              letterSpacing: '-0.02em',
            }}>{value}</div>
            <div style={{
              fontFamily: 'var(--foundry-font-mono)',
              fontSize: '10px',
              letterSpacing: '0.12em',
              color: 'var(--foundry-text-dim)',
              marginTop: '4px',
              textTransform: 'uppercase',
            }}>{unit}</div>
          </div>
        ))}
      </div>

      {/* Last 7 days */}
      <div style={{
        background: 'var(--foundry-bg-card)',
        border: '1px solid var(--foundry-border)',
        borderRadius: 'var(--foundry-radius-md)',
        padding: '16px',
        width: '100%',
      }}>
        <div style={{
          fontFamily: 'var(--foundry-font-mono)',
          fontSize: '10px',
          letterSpacing: '0.18em',
          color: 'var(--foundry-text-dim)',
          textTransform: 'uppercase',
          marginBottom: '14px',
        }}>Last 7 Days</div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '6px',
        }}>
          {last7.map((dateStr, i) => {
            const done = data.completedDates.includes(dateStr);
            const isToday = dateStr === today;
            const d = new Date(dateStr + 'T12:00:00');
            const dayIdx = d.getDay();
            return (
              <div key={dateStr} style={{ textAlign: 'center' }}>
                <div style={{
                  fontFamily: 'var(--foundry-font-mono)',
                  fontSize: '9px',
                  letterSpacing: '0.1em',
                  color: 'var(--foundry-text-dim)',
                  marginBottom: '5px',
                  textTransform: 'uppercase',
                }}>{dayLabels[dayIdx]}</div>
                <div style={{
                  width: '100%',
                  aspectRatio: '1',
                  borderRadius: 'var(--foundry-radius-sm)',
                  background: done ? 'var(--foundry-ember)' : 'var(--foundry-bg-elevated)',
                  border: isToday
                    ? `2px solid ${done ? 'var(--foundry-ember-bright)' : 'var(--foundry-border-strong)'}`
                    : '1px solid var(--foundry-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  transition: 'background 0.2s',
                }}>
                  {done ? '✓' : ''}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Undo / clear today */}
      {doneToday && (
        <IonButton fill="clear" size="small" onClick={handleTap} style={{ color: 'var(--foundry-text-dim)' }}>
          Undo today
        </IonButton>
      )}
    </div>
  );
}
