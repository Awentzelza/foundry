
import { useCallback, useMemo } from 'react';
import { IonButton } from '@ionic/react';
import { useAppData } from '@/hooks/useAppData';

const GOAL = 8;

interface DayRecord {
  date: string; // YYYY-MM-DD
  count: number;
}

interface WaterState {
  history: DayRecord[];
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function last7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }
  return days;
}

function shortDay(dateStr: string): string {
  const [y, m, day] = dateStr.split('-').map(Number);
  const d = new Date(y, m - 1, day);
  return ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][d.getDay()];
}

export default function WaterTracker() {
  const { value, setValue, ready } = useAppData<WaterState>('water-tracker', 'state', { history: [] });

  const today = todayStr();

  const todayCount = useMemo(() => {
    const rec = value.history.find(r => r.date === today);
    return rec ? rec.count : 0;
  }, [value, today]);

  const setTodayCount = useCallback((count: number) => {
    const clamped = Math.max(0, Math.min(GOAL, count));
    const existing = value.history.filter(r => r.date !== today);
    const updated = [...existing, { date: today, count: clamped }];
    // Keep only last 30 days
    const trimmed = updated.sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
    setValue({ history: trimmed });
  }, [value, setValue, today]);

  const days = useMemo(() => last7Days(), []);

  const pct = Math.min(1, todayCount / GOAL);
  const radius = 54;
  const circ = 2 * Math.PI * radius;
  const dash = pct * circ;
  const done = todayCount >= GOAL;

  if (!ready) return null;

  return (
    <div style={{ padding: '24px 20px 32px', display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 400, margin: '0 auto' }}>

      {/* Ring + count */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <div style={{ position: 'relative', width: 140, height: 140 }}>
          <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="70" cy="70" r={radius} fill="none" stroke="var(--foundry-border-strong)" strokeWidth="10" />
            <circle
              cx="70" cy="70" r={radius}
              fill="none"
              stroke={done ? '#4ade80' : 'var(--foundry-ember)'}
              strokeWidth="10"
              strokeDasharray={`${dash} ${circ}`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 0.35s ease' }}
            />
          </svg>
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center'
          }}>
            <span style={{
              fontFamily: 'var(--foundry-font-display)', fontSize: 44, fontWeight: 700,
              color: done ? '#4ade80' : 'var(--foundry-text)', lineHeight: 1
            }}>{todayCount}</span>
            <span style={{
              fontFamily: 'var(--foundry-font-mono)', fontSize: 10, letterSpacing: '0.16em',
              color: 'var(--foundry-text-dim)', textTransform: 'uppercase', marginTop: 2
            }}>of {GOAL}</span>
          </div>
        </div>
        {done && (
          <span style={{
            fontFamily: 'var(--foundry-font-mono)', fontSize: 11, letterSpacing: '0.18em',
            color: '#4ade80', textTransform: 'uppercase'
          }}>Goal reached 🎉</span>
        )}
        {!done && (
          <span style={{
            fontFamily: 'var(--foundry-font-mono)', fontSize: 10, letterSpacing: '0.16em',
            color: 'var(--foundry-text-dim)', textTransform: 'uppercase'
          }}>{GOAL - todayCount} to go</span>
        )}
      </div>

      {/* Glass grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10,
        background: 'var(--foundry-bg-card)', border: '1px solid var(--foundry-border)',
        borderRadius: 'var(--foundry-radius-md)', padding: 16
      }}>
        {Array.from({ length: GOAL }).map((_, i) => {
          const filled = i < todayCount;
          return (
            <button
              key={i}
              onClick={() => setTodayCount(filled ? i : i + 1)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 36, padding: 4, borderRadius: 8,
                opacity: filled ? 1 : 0.22,
                transform: filled ? 'scale(1)' : 'scale(0.88)',
                transition: 'opacity 0.2s, transform 0.2s',
                filter: filled ? (done ? 'hue-rotate(120deg)' : 'none') : 'grayscale(1)',
              }}
              aria-label={filled ? `Undo glass ${i + 1}` : `Log glass ${i + 1}`}
            >
              💧
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <IonButton
          expand="block"
          fill="outline"
          style={{ flex: 1 }}
          disabled={todayCount <= 0}
          onClick={() => setTodayCount(todayCount - 1)}
        >
          Undo
        </IonButton>
        <IonButton
          expand="block"
          fill={done ? 'outline' : 'solid'}
          style={{ flex: 1 }}
          disabled={todayCount >= GOAL}
          onClick={() => setTodayCount(todayCount + 1)}
        >
          +1 Glass
        </IonButton>
      </div>

      {/* 7-day history */}
      <div>
        <div style={{
          fontFamily: 'var(--foundry-font-mono)', fontSize: 10, letterSpacing: '0.18em',
          color: 'var(--foundry-text-dim)', textTransform: 'uppercase', marginBottom: 10
        }}>This Week</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {days.map(dateStr => {
            const rec = value.history.find(r => r.date === dateStr);
            const cnt = rec ? rec.count : 0;
            const isToday = dateStr === today;
            const goalMet = cnt >= GOAL;
            const barPct = Math.min(1, cnt / GOAL);
            return (
              <div key={dateStr} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: '100%', height: 48,
                  background: 'var(--foundry-bg-elevated)',
                  borderRadius: 6,
                  border: isToday ? '1px solid var(--foundry-ember)' : '1px solid var(--foundry-border)',
                  overflow: 'hidden',
                  position: 'relative',
                  display: 'flex', alignItems: 'flex-end'
                }}>
                  <div style={{
                    width: '100%',
                    height: `${barPct * 100}%`,
                    background: goalMet ? '#4ade8066' : 'var(--foundry-ember-dim)',
                    transition: 'height 0.3s ease'
                  }} />
                </div>
                <span style={{
                  fontFamily: 'var(--foundry-font-mono)', fontSize: 9, letterSpacing: '0.1em',
                  color: isToday ? 'var(--foundry-ember)' : 'var(--foundry-text-dim)',
                  textTransform: 'uppercase'
                }}>{shortDay(dateStr)}</span>
                <span style={{
                  fontFamily: 'var(--foundry-font-display)', fontSize: 12, fontWeight: 600,
                  color: goalMet ? '#4ade80' : 'var(--foundry-text-muted)'
                }}>{cnt}</span>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
