/**
 * Water — a record of water taken today, with a seven-day history.
 *
 * Brand Book: no celebration, no emoji, no off-palette colour. A target of
 * eight is shown as a quiet reference, not a goal to be cheered.
 */
import { useCallback, useMemo } from 'react';
import { IonButton } from '@ionic/react';
import { useAppData } from '@/hooks/useAppData';

const TARGET = 8;

interface DayRecord {
  date: string;
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
  return ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()];
}

const eyebrow: React.CSSProperties = {
  fontFamily: 'var(--foundry-font-mono)',
  fontSize: 10,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: 'var(--foundry-text-subtle)',
};

export default function WaterApp() {
  const { value, setValue, ready } = useAppData<WaterState>('water-tracker', 'state', { history: [] });
  const today = todayStr();

  const todayCount = useMemo(() => {
    const rec = value.history.find((r) => r.date === today);
    return rec ? rec.count : 0;
  }, [value, today]);

  const setTodayCount = useCallback(
    (count: number) => {
      const clamped = Math.max(0, Math.min(TARGET, count));
      const existing = value.history.filter((r) => r.date !== today);
      const updated = [...existing, { date: today, count: clamped }];
      const trimmed = updated.sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
      setValue({ history: trimmed });
    },
    [value, setValue, today],
  );

  const days = useMemo(() => last7Days(), []);

  if (!ready) return null;

  const pct = Math.min(1, todayCount / TARGET);
  const radius = 54;
  const circ = 2 * Math.PI * radius;
  const dash = pct * circ;

  return (
    <div style={{ padding: '24px 20px 40px', display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 400, margin: '0 auto' }}>
      {/* Ring + count */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div style={{ position: 'relative', width: 140, height: 140 }}>
          <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="70" cy="70" r={radius} fill="none" stroke="var(--foundry-border-strong)" strokeWidth="8" />
            <circle
              cx="70" cy="70" r={radius}
              fill="none"
              stroke="var(--foundry-ember)"
              strokeWidth="8"
              strokeDasharray={`${dash} ${circ}`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 0.35s ease' }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'var(--foundry-font-display)', fontSize: 46, fontWeight: 700, color: 'var(--foundry-text)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {todayCount}
            </span>
            <span style={{ ...eyebrow, marginTop: 4 }}>of {TARGET}</span>
          </div>
        </div>
        <span style={eyebrow}>Glasses today</span>
      </div>

      {/* Tally — flat cells, no emoji */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(8, 1fr)',
          gap: 8,
          background: 'var(--foundry-card)',
          border: '1px solid var(--foundry-border)',
          borderRadius: 'var(--foundry-radius-md)',
          padding: 16,
        }}
      >
        {Array.from({ length: TARGET }).map((_, i) => {
          const filled = i < todayCount;
          return (
            <button
              key={i}
              onClick={() => setTodayCount(filled ? i : i + 1)}
              aria-label={filled ? `Remove glass ${i + 1}` : `Log glass ${i + 1}`}
              style={{
                height: 34,
                borderRadius: 6,
                cursor: 'pointer',
                background: filled ? 'var(--foundry-ember)' : 'var(--foundry-elevated)',
                border: filled ? '1px solid var(--foundry-ember)' : '1px solid var(--foundry-border)',
                transition: 'background 0.15s ease, border-color 0.15s ease',
              }}
            />
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <IonButton expand="block" fill="outline" color="medium" style={{ flex: 1 }} disabled={todayCount <= 0} onClick={() => setTodayCount(todayCount - 1)}>
          Undo
        </IonButton>
        <IonButton expand="block" fill="outline" color="primary" style={{ flex: 1 }} disabled={todayCount >= TARGET} onClick={() => setTodayCount(todayCount + 1)}>
          Add glass
        </IonButton>
      </div>

      {/* 7-day history */}
      <div>
        <div style={{ ...eyebrow, marginBottom: 12 }}>This Week</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {days.map((dateStr) => {
            const rec = value.history.find((r) => r.date === dateStr);
            const cnt = rec ? rec.count : 0;
            const isToday = dateStr === today;
            const barPct = Math.min(1, cnt / TARGET);
            return (
              <div key={dateStr} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div
                  style={{
                    width: '100%', height: 48,
                    background: 'var(--foundry-elevated)',
                    borderRadius: 6,
                    border: isToday ? '1px solid var(--foundry-border-strong)' : '1px solid var(--foundry-border)',
                    overflow: 'hidden',
                    display: 'flex', alignItems: 'flex-end',
                  }}
                >
                  <div style={{ width: '100%', height: `${barPct * 100}%`, background: 'var(--foundry-ember-dim)', transition: 'height 0.3s ease' }} />
                </div>
                <span style={{ ...eyebrow, fontSize: 9, letterSpacing: '0.1em', color: isToday ? 'var(--foundry-text-muted)' : 'var(--foundry-text-subtle)' }}>
                  {shortDay(dateStr)}
                </span>
                <span style={{ fontFamily: 'var(--foundry-font-display)', fontSize: 13, fontWeight: 600, color: 'var(--foundry-text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                  {cnt}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
