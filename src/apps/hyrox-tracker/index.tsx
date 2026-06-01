
import { useState, useEffect, useRef, useCallback } from 'react';
import { IonButton } from '@ionic/react';

interface Segment {
  id: number;
  type: 'run' | 'station';
  label: string;
  detail: string;
  enabled: boolean;
}

interface Split {
  label: string;
  detail: string;
  type: 'run' | 'station';
  seconds: number;
  speed: string | null;
}

const DEFAULT_SEGMENTS: Omit<Segment, 'enabled'>[] = [
  { id: 1,  type: 'run',     label: 'Run 1',              detail: '1 km · 0.62 mi' },
  { id: 2,  type: 'station', label: 'SkiErg',             detail: '1,000 m' },
  { id: 3,  type: 'run',     label: 'Run 2',              detail: '1 km · 0.62 mi' },
  { id: 4,  type: 'station', label: 'Sled Push',          detail: '50 m' },
  { id: 5,  type: 'run',     label: 'Run 3',              detail: '1 km · 0.62 mi' },
  { id: 6,  type: 'station', label: 'Sled Pull',          detail: '50 m' },
  { id: 7,  type: 'run',     label: 'Run 4',              detail: '1 km · 0.62 mi' },
  { id: 8,  type: 'station', label: 'Burpee Broad Jumps', detail: '80 m' },
  { id: 9,  type: 'run',     label: 'Run 5',              detail: '1 km · 0.62 mi' },
  { id: 10, type: 'station', label: 'Row',                detail: '1,000 m' },
  { id: 11, type: 'run',     label: 'Run 6',              detail: '1 km · 0.62 mi' },
  { id: 12, type: 'station', label: 'Farmers Carry',      detail: '200 m' },
  { id: 13, type: 'run',     label: 'Run 7',              detail: '1 km · 0.62 mi' },
  { id: 14, type: 'station', label: 'Sandbag Lunges',     detail: '100 m' },
  { id: 15, type: 'run',     label: 'Run 8',              detail: '1 km · 0.62 mi' },
  { id: 16, type: 'station', label: 'Wall Balls',         detail: '100 reps' },
];

let nextSegId = 100;

function fmt(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function goalBadge(secs: number): { label: string; color: string } {
  if (!secs) return { label: '—', color: 'var(--foundry-text-dim)' };
  if (secs <= 5100) return { label: 'SUB 1:25', color: 'var(--foundry-ember-bright)' };
  if (secs <= 5400) return { label: '~1:30 PACE', color: 'var(--foundry-ember)' };
  return { label: 'OVER 1:30', color: 'var(--foundry-text-muted)' };
}

function segColor(type: 'run' | 'station'): string {
  return type === 'run' ? 'var(--foundry-ember)' : 'var(--foundry-text-muted)';
}

const mono: React.CSSProperties = {
  fontFamily: 'var(--foundry-font-mono)',
  fontSize: 10,
  letterSpacing: '0.18em',
  color: 'var(--foundry-text-dim)',
  textTransform: 'uppercase' as const,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  background: 'var(--foundry-bg)',
  border: '1px solid var(--foundry-border-strong)',
  borderRadius: 'var(--foundry-radius-sm)',
  color: 'var(--foundry-text)',
  fontSize: 15,
  outline: 'none',
  boxSizing: 'border-box',
};

// Vintage ornamental divider
function Divider({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 14 }}>
      <div style={{ flex: 1, height: 1, background: 'var(--foundry-border)' }} />
      <div style={{ ...mono, fontSize: 9, letterSpacing: '0.26em', color: 'var(--foundry-text-dim)' }}>{label}</div>
      <div style={{ flex: 1, height: 1, background: 'var(--foundry-border)' }} />
    </div>
  );
}

export default function HyroxTracker() {
  const [phase, setPhase] = useState<'setup' | 'active' | 'done'>('setup');
  const [simMode, setSimMode] = useState<'full' | 'custom'>('full');
  const [segments, setSegments] = useState<Segment[]>(
    DEFAULT_SEGMENTS.map(s => ({ ...s, enabled: true }))
  );
  const [editingId, setEditingId] = useState<number | null>(null);
  const [addPanel, setAddPanel] = useState(false);
  const [newSeg, setNewSeg] = useState<{ type: 'run' | 'station'; label: string; detail: string }>({
    type: 'run', label: '', detail: '',
  });

  const [currentIdx, setCurrentIdx] = useState(0);
  const [totalSec, setTotalSec] = useState(0);
  const [segSec, setSegSec] = useState(0);
  const [splits, setSplits] = useState<Split[]>([]);
  const [speed, setSpeed] = useState('');
  const [copied, setCopied] = useState(false);
  const [flash, setFlash] = useState(false);

  const totalRef = useRef(0);
  const segRef = useRef(0);
  const ivRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (ivRef.current) clearInterval(ivRef.current); }, []);

  const tick = useCallback(() => {
    totalRef.current += 1;
    segRef.current += 1;
    setTotalSec(totalRef.current);
    setSegSec(segRef.current);
  }, []);

  const activeSegments = segments.filter(s => simMode === 'full' || s.enabled);

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const arr = [...segments];
    [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
    setSegments(arr);
  };
  const moveDown = (idx: number) => {
    if (idx === segments.length - 1) return;
    const arr = [...segments];
    [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
    setSegments(arr);
  };
  const toggleEnabled = (id: number) => {
    setSegments(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
  };
  const removeSegment = (id: number) => {
    setSegments(prev => prev.filter(s => s.id !== id));
  };
  const addSegment = () => {
    if (!newSeg.label.trim()) return;
    setSegments(prev => [...prev, { ...newSeg, id: ++nextSegId, enabled: true }]);
    setNewSeg({ type: 'run', label: '', detail: '' });
    setAddPanel(false);
  };
  const updateSegmentField = (id: number, field: keyof Segment, val: string) => {
    setSegments(prev => prev.map(s => s.id === id ? { ...s, [field]: val } : s));
  };
  const resetToDefault = () => setSegments(DEFAULT_SEGMENTS.map(s => ({ ...s, enabled: true })));

  const startSim = () => {
    if (activeSegments.length === 0) return;
    if (ivRef.current) clearInterval(ivRef.current);
    totalRef.current = 0;
    segRef.current = 0;
    setTotalSec(0); setSegSec(0); setSplits([]); setCurrentIdx(0); setSpeed(''); setFlash(false);
    setPhase('active');
    ivRef.current = setInterval(tick, 1000);
  };

  const handleNext = () => {
    const seg = activeSegments[currentIdx];
    const newSplits: Split[] = [...splits, {
      label: seg.label, detail: seg.detail, type: seg.type,
      seconds: segRef.current, speed: seg.type === 'run' ? speed : null,
    }];
    setSplits(newSplits);
    setFlash(true);
    setTimeout(() => setFlash(false), 280);
    if (currentIdx >= activeSegments.length - 1) {
      if (ivRef.current) clearInterval(ivRef.current);
      setPhase('done');
    } else {
      segRef.current = 0;
      setSegSec(0);
      setCurrentIdx(i => i + 1);
      setSpeed('');
    }
  };

  const buildOutput = (splitsData: Split[]): string => {
    const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const lines = [`HYROX SIM — ${date}`, `Total: ${fmt(totalRef.current)}`, ''];
    splitsData.forEach(s => {
      lines.push(`${s.label}: ${fmt(s.seconds)}${s.speed ? ` @ ${s.speed} mph` : ''}`);
    });
    lines.push('', 'Goal: sub-1:25');
    return lines.join('\n');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(buildOutput(splits)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    });
  };

  const reset = () => {
    if (ivRef.current) clearInterval(ivRef.current);
    setPhase('setup');
    setSplits([]); setCurrentIdx(0); setTotalSec(0); setSegSec(0); setSpeed('');
  };

  // ── SETUP ────────────────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <div style={{ background: 'var(--foundry-bg)', color: 'var(--foundry-text)', minHeight: '100%' }}>
        <div style={{ padding: '28px 20px 0', maxWidth: 460, margin: '0 auto' }}>

          {/* Heritage header */}
          <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--foundry-border)' }}>
            <div style={{ ...mono, color: 'var(--foundry-ember-dim)', marginBottom: 8, letterSpacing: '0.26em' }}>
              ✦ RACE DAY PREP ✦
            </div>
            <div style={{
              fontFamily: 'var(--foundry-font-display)',
              fontSize: 58, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em',
              color: 'var(--foundry-text)',
            }}>Hyrox</div>
            <div style={{ ...mono, marginTop: 8, color: 'var(--foundry-text-muted)', fontSize: 10, letterSpacing: '0.24em' }}>
              SIM TRACKER · OPEN FORMAT
            </div>
          </div>

          {/* Mode toggle */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {(['full', 'custom'] as const).map(m => (
              <button key={m} onClick={() => setSimMode(m)} style={{
                flex: 1, padding: '11px 0',
                background: simMode === m ? 'var(--foundry-text)' : 'var(--foundry-bg-card)',
                color: simMode === m ? 'var(--foundry-bg)' : 'var(--foundry-text-muted)',
                border: `1px solid ${simMode === m ? 'var(--foundry-text)' : 'var(--foundry-border)'}`,
                borderRadius: 'var(--foundry-radius-sm)',
                fontSize: 10, fontWeight: 700, letterSpacing: '0.18em',
                cursor: 'pointer', fontFamily: 'var(--foundry-font-mono)',
                transition: 'all 0.15s',
              }}>
                {m === 'full' ? 'FULL SIM' : 'CUSTOM'}
              </button>
            ))}
          </div>

          {simMode === 'full' && (
            <div style={{ ...mono, marginBottom: 14, fontSize: 10 }}>
              Standard Open · 8 runs + 8 stations
            </div>
          )}
          {simMode === 'custom' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ ...mono }}>{activeSegments.length} segments selected</div>
              <button onClick={resetToDefault} style={{
                background: 'none', border: 'none', color: 'var(--foundry-ember-dim)',
                fontSize: 10, cursor: 'pointer', fontFamily: 'var(--foundry-font-mono)',
                letterSpacing: '0.14em', padding: '4px 0',
              }}>RESET</button>
            </div>
          )}
        </div>

        <div style={{ padding: '0 20px', maxWidth: 460, margin: '0 auto', paddingBottom: 120 }}>
          {segments.map((seg, idx) => {
            const ac = segColor(seg.type);
            const dimmed = simMode === 'custom' && !seg.enabled;
            const isEditing = editingId === seg.id;
            return (
              <div key={seg.id} style={{
                background: 'var(--foundry-bg-card)',
                borderRadius: 'var(--foundry-radius-sm)',
                marginBottom: 4,
                border: '1px solid var(--foundry-border)',
                opacity: dimmed ? 0.38 : 1,
                transition: 'opacity 0.15s',
                overflow: 'hidden',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '11px 14px', gap: 10 }}>
                  {simMode === 'custom' && (
                    <button onClick={() => toggleEnabled(seg.id)} style={{
                      width: 22, height: 22, borderRadius: 4,
                      border: `1.5px solid ${seg.enabled ? ac : 'var(--foundry-border-strong)'}`,
                      background: seg.enabled ? ac : 'transparent',
                      flexShrink: 0, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, color: 'var(--foundry-bg)', fontWeight: 700,
                      fontFamily: 'var(--foundry-font-mono)',
                    }}>
                      {seg.enabled ? '✓' : ''}
                    </button>
                  )}
                  {simMode === 'full' && (
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: ac, flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--foundry-text)', fontFamily: 'var(--foundry-font-display)' }}>{seg.label}</div>
                    <div style={{ ...mono, fontSize: 10, marginTop: 2 }}>{seg.detail}</div>
                  </div>
                  {simMode === 'custom' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                      <button onClick={() => moveUp(idx)} disabled={idx === 0} style={{
                        background: 'none', border: 'none',
                        color: idx === 0 ? 'var(--foundry-border-strong)' : 'var(--foundry-text-dim)',
                        fontSize: 14, cursor: idx === 0 ? 'default' : 'pointer', padding: '4px 6px',
                      }}>↑</button>
                      <button onClick={() => moveDown(idx)} disabled={idx === segments.length - 1} style={{
                        background: 'none', border: 'none',
                        color: idx === segments.length - 1 ? 'var(--foundry-border-strong)' : 'var(--foundry-text-dim)',
                        fontSize: 14, cursor: idx === segments.length - 1 ? 'default' : 'pointer', padding: '4px 6px',
                      }}>↓</button>
                      <button onClick={() => setEditingId(isEditing ? null : seg.id)} style={{
                        background: 'none', border: 'none',
                        color: isEditing ? 'var(--foundry-ember)' : 'var(--foundry-text-dim)',
                        fontSize: 10, cursor: 'pointer', padding: '4px 8px',
                        fontFamily: 'var(--foundry-font-mono)', letterSpacing: '0.08em',
                      }}>EDIT</button>
                      <button onClick={() => removeSegment(seg.id)} style={{
                        background: 'none', border: 'none',
                        color: 'var(--foundry-text-dim)', fontSize: 14, cursor: 'pointer', padding: '4px 6px',
                      }}>×</button>
                    </div>
                  )}
                </div>
                {isEditing && simMode === 'custom' && (
                  <div style={{
                    padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 8,
                    borderTop: '1px solid var(--foundry-border)',
                  }}>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      {(['run', 'station'] as const).map(t => (
                        <button key={t} onClick={() => updateSegmentField(seg.id, 'type', t)} style={{
                          flex: 1, padding: '8px 0',
                          background: seg.type === t ? 'var(--foundry-bg-elevated)' : 'transparent',
                          border: `1.5px solid ${seg.type === t ? 'var(--foundry-ember)' : 'var(--foundry-border-strong)'}`,
                          color: seg.type === t ? 'var(--foundry-ember)' : 'var(--foundry-text-muted)',
                          borderRadius: 'var(--foundry-radius-sm)', fontSize: 10, fontWeight: 700,
                          letterSpacing: '0.14em', cursor: 'pointer',
                          fontFamily: 'var(--foundry-font-mono)',
                        }}>{t.toUpperCase()}</button>
                      ))}
                    </div>
                    <input value={seg.label}
                      onChange={e => updateSegmentField(seg.id, 'label', e.target.value)}
                      placeholder="Label (e.g. Run 2)" style={inputStyle} />
                    <input value={seg.detail}
                      onChange={e => updateSegmentField(seg.id, 'detail', e.target.value)}
                      placeholder="Detail (e.g. 0.62 mi)" style={inputStyle} />
                    <button onClick={() => setEditingId(null)} style={{
                      background: 'var(--foundry-bg-elevated)', border: '1px solid var(--foundry-border)',
                      color: 'var(--foundry-text)',
                      padding: '9px 0', borderRadius: 'var(--foundry-radius-sm)',
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
                      cursor: 'pointer', fontFamily: 'var(--foundry-font-mono)',
                    }}>DONE</button>
                  </div>
                )}
              </div>
            );
          })}

          {simMode === 'custom' && (
            <div style={{ marginTop: 8 }}>
              {!addPanel ? (
                <button onClick={() => setAddPanel(true)} style={{
                  width: '100%', padding: '12px 0',
                  background: 'transparent',
                  border: '1px dashed var(--foundry-border-strong)',
                  borderRadius: 'var(--foundry-radius-sm)',
                  color: 'var(--foundry-text-dim)', fontSize: 10, fontWeight: 700,
                  letterSpacing: '0.18em', cursor: 'pointer',
                  fontFamily: 'var(--foundry-font-mono)',
                }}>+ ADD SEGMENT</button>
              ) : (
                <div style={{
                  background: 'var(--foundry-bg-card)', borderRadius: 'var(--foundry-radius-sm)',
                  padding: '14px 14px', border: '1px solid var(--foundry-border-strong)',
                  display: 'flex', flexDirection: 'column', gap: 8,
                }}>
                  <div style={{ ...mono, marginBottom: 2 }}>NEW SEGMENT</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['run', 'station'] as const).map(t => (
                      <button key={t} onClick={() => setNewSeg(n => ({ ...n, type: t }))} style={{
                        flex: 1, padding: '8px 0',
                        background: newSeg.type === t ? 'var(--foundry-bg-elevated)' : 'transparent',
                        border: `1.5px solid ${newSeg.type === t ? 'var(--foundry-ember)' : 'var(--foundry-border-strong)'}`,
                        color: newSeg.type === t ? 'var(--foundry-ember)' : 'var(--foundry-text-muted)',
                        borderRadius: 'var(--foundry-radius-sm)', fontSize: 10, fontWeight: 700,
                        letterSpacing: '0.14em', cursor: 'pointer',
                        fontFamily: 'var(--foundry-font-mono)',
                      }}>{t.toUpperCase()}</button>
                    ))}
                  </div>
                  <input value={newSeg.label}
                    onChange={e => setNewSeg(n => ({ ...n, label: e.target.value }))}
                    placeholder="Label (e.g. Extra SkiErg)" style={inputStyle} />
                  <input value={newSeg.detail}
                    onChange={e => setNewSeg(n => ({ ...n, detail: e.target.value }))}
                    placeholder="Detail (e.g. 500 m)" style={inputStyle} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={addSegment} style={{
                      flex: 2, padding: '10px 0',
                      background: 'var(--foundry-ember)', color: 'var(--foundry-bg)',
                      border: 'none', borderRadius: 'var(--foundry-radius-sm)',
                      fontSize: 10, fontWeight: 800, letterSpacing: '0.16em',
                      cursor: 'pointer', fontFamily: 'var(--foundry-font-mono)',
                    }}>ADD</button>
                    <button onClick={() => setAddPanel(false)} style={{
                      flex: 1, padding: '10px 0', background: 'transparent',
                      color: 'var(--foundry-text-muted)', border: '1px solid var(--foundry-border)',
                      borderRadius: 'var(--foundry-radius-sm)', fontSize: 10, fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'var(--foundry-font-mono)',
                    }}>CANCEL</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky start */}
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'var(--foundry-bg)',
          borderTop: '1px solid var(--foundry-border)',
          padding: '16px 20px 28px',
        }}>
          <div style={{ maxWidth: 460, margin: '0 auto' }}>
            <IonButton
              expand="block"
              disabled={activeSegments.length === 0}
              onClick={startSim}
              style={{
                '--background': activeSegments.length === 0 ? 'var(--foundry-bg-elevated)' : 'var(--foundry-text)',
                '--color': activeSegments.length === 0 ? 'var(--foundry-text-dim)' : 'var(--foundry-bg)',
                '--border-radius': 'var(--foundry-radius-md)',
                height: '56px', fontSize: '12px', fontWeight: '700', letterSpacing: '0.2em',
              } as React.CSSProperties}
            >
              {activeSegments.length === 0 ? 'SELECT SEGMENTS' : `START SIM · ${activeSegments.length} SEGMENTS`}
            </IonButton>
          </div>
        </div>
      </div>
    );
  }

  // ── ACTIVE ────────────────────────────────────────────────────────
  if (phase === 'active') {
    const seg = activeSegments[currentIdx];
    const isRun = seg.type === 'run';
    const ac = segColor(seg.type);
    const nextSeg = activeSegments[currentIdx + 1];
    const progress = (currentIdx / activeSegments.length) * 100;

    return (
      <div style={{ background: 'var(--foundry-bg)', color: 'var(--foundry-text)', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Timer bar */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 100,
          background: 'var(--foundry-bg)',
          borderBottom: '1px solid var(--foundry-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 20px',
        }}>
          <div>
            <div style={mono}>TOTAL</div>
            <div style={{
              fontFamily: 'var(--foundry-font-mono)',
              fontSize: 30, fontWeight: 700, color: 'var(--foundry-text)', lineHeight: 1, marginTop: 2,
            }}>{fmt(totalSec)}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ ...mono, fontSize: 9 }}>HYROX</div>
            <div style={{ fontFamily: 'var(--foundry-font-display)', fontSize: 18, fontWeight: 700, color: 'var(--foundry-text)' }}>
              {currentIdx + 1} / {activeSegments.length}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={mono}>SEGMENT</div>
            <div style={{ fontFamily: 'var(--foundry-font-mono)', fontSize: 13, color: ac, fontWeight: 700, marginTop: 2, letterSpacing: '0.08em' }}>
              {isRun ? 'RUN' : 'STATION'}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ width: '100%', height: 3, background: 'var(--foundry-border)', flexShrink: 0 }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'var(--foundry-ember)', transition: 'width 0.4s ease' }} />
        </div>

        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          padding: '20px 20px 28px', maxWidth: 460, width: '100%',
          boxSizing: 'border-box', margin: '0 auto',
        }}>
          {/* Segment card */}
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            justifyContent: 'center', alignItems: 'center',
            background: flash ? 'var(--foundry-bg-elevated)' : 'var(--foundry-bg-card)',
            border: `1px solid ${flash ? 'var(--foundry-border-strong)' : 'var(--foundry-border)'}`,
            borderRadius: 'var(--foundry-radius-lg)',
            padding: '36px 20px', marginBottom: 18, transition: 'background 0.15s, border-color 0.15s',
          }}>
            <Divider label={isRun ? '✦ RUN ✦' : '✦ STATION ✦'} />

            <div style={{
              fontFamily: 'var(--foundry-font-display)',
              fontSize: 42, fontWeight: 700, textAlign: 'center', lineHeight: 1.1, marginBottom: 6,
              color: 'var(--foundry-text)',
            }}>
              {seg.label}
            </div>
            <div style={{ ...mono, marginBottom: 32 }}>{seg.detail}</div>

            <div style={{
              fontFamily: 'var(--foundry-font-mono)',
              fontSize: 68, fontWeight: 700, color: ac, lineHeight: 1, letterSpacing: '-0.02em',
            }}>
              {fmt(segSec)}
            </div>

            {isRun && (
              <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="number" step="0.1" min="4" max="12" placeholder="—"
                  value={speed}
                  onChange={e => setSpeed(e.target.value)}
                  style={{
                    width: 80, padding: '10px',
                    background: 'var(--foundry-bg)',
                    border: '1px solid var(--foundry-border-strong)',
                    borderRadius: 'var(--foundry-radius-sm)',
                    color: 'var(--foundry-text)',
                    fontSize: 24, fontWeight: 700,
                    fontFamily: 'var(--foundry-font-mono)',
                    textAlign: 'center', outline: 'none',
                  }}
                />
                <span style={{ ...mono, fontSize: 11 }}>MPH</span>
              </div>
            )}
          </div>

          <IonButton
            expand="block"
            onClick={handleNext}
            style={{
              '--background': 'var(--foundry-ember)',
              '--color': 'var(--foundry-bg)',
              '--border-radius': 'var(--foundry-radius-md)',
              height: '62px', fontSize: '14px', fontWeight: '700',
              letterSpacing: '0.2em', marginBottom: '14px',
            } as React.CSSProperties}
          >
            {currentIdx >= activeSegments.length - 1 ? 'FINISH' : 'DONE'}
          </IonButton>

          {nextSeg && (
            <div style={{ textAlign: 'center', ...mono, fontSize: 10, marginTop: 4 }}>
              NEXT:{' '}
              <span style={{ color: segColor(nextSeg.type), fontWeight: 700 }}>{nextSeg.label}</span>
              {' · '}
              <span>{nextSeg.detail}</span>
            </div>
          )}

          <button onClick={reset} style={{
            background: 'none', border: 'none',
            color: 'var(--foundry-border-strong)', fontSize: 10, cursor: 'pointer',
            marginTop: 20, fontFamily: 'var(--foundry-font-mono)',
            letterSpacing: '0.18em', padding: '8px 0', display: 'block', width: '100%',
          }}>ABORT</button>
        </div>
      </div>
    );
  }

  // ── DONE ────────────────────────────────────────────────────────
  if (phase === 'done') {
    const badge = goalBadge(totalSec);
    const runSplits = splits.filter(s => s.type === 'run' && s.speed !== null && !isNaN(parseFloat(s.speed ?? '')));
    const avgSpd = runSplits.length
      ? (runSplits.reduce((a, s) => a + parseFloat(s.speed ?? '0'), 0) / runSplits.length).toFixed(1)
      : null;
    const fastestRun = runSplits.length
      ? Math.max(...runSplits.map(s => parseFloat(s.speed ?? '0'))).toFixed(1)
      : null;

    return (
      <div style={{ background: 'var(--foundry-bg)', color: 'var(--foundry-text)', minHeight: '100%' }}>
        <div style={{ maxWidth: 460, margin: '0 auto', padding: '32px 20px 80px' }}>

          {/* Result hero */}
          <div style={{ textAlign: 'center', marginBottom: 28, paddingBottom: 28, borderBottom: '1px solid var(--foundry-border)' }}>
            <Divider label="SIM COMPLETE" />
            <div style={{
              fontFamily: 'var(--foundry-font-display)',
              fontSize: 76, fontWeight: 700, lineHeight: 1, color: 'var(--foundry-text)',
            }}>{fmt(totalSec)}</div>

            <div style={{
              display: 'inline-block', marginTop: 16, padding: '6px 20px', borderRadius: 999,
              border: `1px solid ${badge.color}`,
              ...mono, fontSize: 11, color: badge.color, letterSpacing: '0.2em',
            }}>{badge.label}</div>

            {(avgSpd || fastestRun) && (
              <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', gap: 32 }}>
                {avgSpd && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={mono}>AVG RUN</div>
                    <div style={{ fontFamily: 'var(--foundry-font-display)', fontSize: 22, fontWeight: 700, color: 'var(--foundry-ember)', marginTop: 4 }}>{avgSpd} mph</div>
                  </div>
                )}
                {fastestRun && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={mono}>FASTEST</div>
                    <div style={{ fontFamily: 'var(--foundry-font-display)', fontSize: 22, fontWeight: 700, color: 'var(--foundry-ember)', marginTop: 4 }}>{fastestRun} mph</div>
                  </div>
                )}
                <div style={{ textAlign: 'center' }}>
                  <div style={mono}>TARGET</div>
                  <div style={{ fontFamily: 'var(--foundry-font-display)', fontSize: 22, fontWeight: 700, color: 'var(--foundry-text-dim)', marginTop: 4 }}>6.5–7.0</div>
                </div>
              </div>
            )}
          </div>

          {/* Splits */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ ...mono, marginBottom: 12 }}>SPLITS</div>
            {splits.map((s, i) => {
              const ac = segColor(s.type);
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center',
                  padding: '11px 14px', borderRadius: 'var(--foundry-radius-sm)',
                  background: 'var(--foundry-bg-card)', border: '1px solid var(--foundry-border)',
                  gap: 10, marginBottom: 3,
                }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: ac, flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 14, fontWeight: 600, fontFamily: 'var(--foundry-font-display)', color: 'var(--foundry-text)' }}>{s.label}</div>
                  {s.speed && (
                    <div style={{ fontFamily: 'var(--foundry-font-mono)', fontSize: 11, color: 'var(--foundry-ember-dim)', letterSpacing: '0.06em' }}>
                      {s.speed} mph
                    </div>
                  )}
                  <div style={{ fontFamily: 'var(--foundry-font-mono)', fontSize: 14, fontWeight: 700, color: ac }}>{fmt(s.seconds)}</div>
                </div>
              );
            })}
          </div>

          {/* Copy */}
          <button onClick={handleCopy} style={{
            width: '100%', padding: '14px 0',
            background: 'var(--foundry-bg-card)',
            color: copied ? 'var(--foundry-ember-bright)' : 'var(--foundry-text)',
            border: `1px solid ${copied ? 'var(--foundry-ember)' : 'var(--foundry-border)'}`,
            borderRadius: 'var(--foundry-radius-sm)',
            ...mono, fontSize: 11, letterSpacing: '0.18em',
            cursor: 'pointer', marginBottom: 12, transition: 'all 0.2s',
          }}>
            {copied ? 'COPIED ✓' : 'COPY FOR CLAUDE'}
          </button>

          <div style={{
            background: 'var(--foundry-bg-card)', border: '1px solid var(--foundry-border)',
            borderRadius: 'var(--foundry-radius-sm)',
            padding: '14px 16px', marginBottom: 20,
            fontFamily: 'var(--foundry-font-mono)', fontSize: 11,
            color: 'var(--foundry-text-dim)', lineHeight: 1.8, whiteSpace: 'pre-wrap',
          }}>
            {buildOutput(splits)}
          </div>

          <IonButton
            expand="block"
            onClick={reset}
            style={{
              '--background': 'var(--foundry-text)',
              '--color': 'var(--foundry-bg)',
              '--border-radius': 'var(--foundry-radius-md)',
              height: '56px', fontSize: '13px', fontWeight: '700', letterSpacing: '0.2em',
            } as React.CSSProperties}
          >
            NEW SIM
          </IonButton>
        </div>
      </div>
    );
  }

  return null;
}
