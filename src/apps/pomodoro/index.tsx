/**
 * Pomodoro — Foundry sample app.
 *
 * 25/5 timer (work 25min → break 5min → repeat). Tracks today's completed
 * work sessions. Persists today's count via useAppData so it survives
 * reloads. Resets each calendar day.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  IonButton,
  IonIcon,
  IonNote,
  IonText,
} from '@ionic/react';
import { pause, play, refresh, stopCircle } from 'ionicons/icons';

import { useAppData } from '@/hooks/useAppData';

const APP_ID = 'pomodoro';
const WORK_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;

type Mode = 'work' | 'break';
type DailyHistory = Record<string, number>; // 'YYYY-MM-DD' → completed work sessions

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function PomodoroApp() {
  const { value: history, setValue: setHistory, ready } = useAppData<DailyHistory>(
    APP_ID,
    'history',
    {},
  );

  const [mode, setMode] = useState<Mode>('work');
  const [remaining, setRemaining] = useState<number>(WORK_SECONDS);
  const [running, setRunning] = useState<boolean>(false);
  const intervalRef = useRef<number | null>(null);

  const today = todayKey();
  const todayCount = history[today] ?? 0;

  const total = mode === 'work' ? WORK_SECONDS : BREAK_SECONDS;
  const progress = useMemo(
    () => Math.max(0, Math.min(1, 1 - remaining / total)),
    [remaining, total],
  );

  const completeSession = useCallback(async () => {
    if (mode === 'work') {
      const next: DailyHistory = { ...history, [today]: (history[today] ?? 0) + 1 };
      await setHistory(next);
      setMode('break');
      setRemaining(BREAK_SECONDS);
    } else {
      setMode('work');
      setRemaining(WORK_SECONDS);
    }
    setRunning(false);
  }, [mode, history, today, setHistory]);

  // Timer tick.
  useEffect(() => {
    if (!running) return;
    intervalRef.current = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          window.clearInterval(intervalRef.current ?? undefined);
          intervalRef.current = null;
          void completeSession();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current != null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running, completeSession]);

  const toggle = useCallback(() => setRunning((r) => !r), []);
  const reset = useCallback(() => {
    setRunning(false);
    setMode('work');
    setRemaining(WORK_SECONDS);
  }, []);
  const skip = useCallback(() => {
    void completeSession();
  }, [completeSession]);

  if (!ready) return null;

  const isWork = mode === 'work';
  const accent = isWork ? 'var(--foundry-ember)' : '#6fbf73';
  const circumference = 2 * Math.PI * 96;
  const dashOffset = circumference * (1 - progress);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24,
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
        {isWork ? 'Focus' : 'Break'}
      </div>

      <div style={{ position: 'relative', width: 240, height: 240 }}>
        <svg width="240" height="240" viewBox="0 0 240 240">
          <circle
            cx="120"
            cy="120"
            r="96"
            fill="none"
            stroke="var(--foundry-border)"
            strokeWidth="6"
          />
          <circle
            cx="120"
            cy="120"
            r="96"
            fill="none"
            stroke={accent}
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform="rotate(-90 120 120)"
            style={{ transition: 'stroke-dashoffset 0.4s linear' }}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--foundry-font-display)',
              fontSize: 56,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1,
              color: 'var(--foundry-text)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {fmt(remaining)}
          </div>
          <div
            style={{
              marginTop: 8,
              fontFamily: 'var(--foundry-font-mono)',
              fontSize: 11,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--foundry-text-dim)',
            }}
          >
            {isWork ? `${WORK_SECONDS / 60} min` : `${BREAK_SECONDS / 60} min`}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <IonButton fill="solid" color="primary" onClick={toggle}>
          <IonIcon slot="start" icon={running ? pause : play} />
          {running ? 'Pause' : 'Start'}
        </IonButton>
        <IonButton fill="outline" color="medium" onClick={skip}>
          <IonIcon slot="start" icon={stopCircle} />
          Skip
        </IonButton>
        <IonButton fill="clear" color="medium" onClick={reset}>
          <IonIcon slot="icon-only" icon={refresh} />
        </IonButton>
      </div>

      <div
        style={{
          marginTop: 12,
          padding: '16px 20px',
          border: '1px solid var(--foundry-border)',
          borderRadius: 'var(--foundry-radius-md)',
          background: 'var(--foundry-bg-card)',
          minWidth: 220,
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
          Today
        </div>
        <div
          style={{
            fontFamily: 'var(--foundry-font-display)',
            fontSize: 28,
            fontWeight: 700,
            color: 'var(--foundry-text)',
            marginTop: 4,
          }}
        >
          {todayCount}{' '}
          <IonText color="medium" style={{ fontSize: 14, fontWeight: 500 }}>
            session{todayCount === 1 ? '' : 's'}
          </IonText>
        </div>
      </div>

      <IonNote style={{ fontSize: 12 }}>
        25 min focus · 5 min break · resets daily
      </IonNote>
    </div>
  );
}
