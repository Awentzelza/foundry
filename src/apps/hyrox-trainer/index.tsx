
import { useState, useCallback, useRef, useEffect } from 'react';
import { IonButton, IonSegment, IonSegmentButton, IonLabel } from '@ionic/react';
import { useAppData } from '@/hooks/useAppData';

interface BlockLog { val: string; note: string; ts: number; }
interface SessionRecord {
  date: string; week: number; phase: string; dayIdx: number;
  rpe: number | null; weight: string; notes: string;
}
interface SimSplit { idx: number; seconds: number; total: number; }
interface SimRecord { date: string; week: number; totalTime: string; notes: string; }
interface AppState {
  workoutLogs: SessionRecord[];
  simHistory: SimRecord[];
  lastWeight: string;
}

type BlockDef = { id: string; name: string; detail: string; sets?: number; };
type GroupDef =
  | { type: 'single'; block: BlockDef }
  | { type: 'superset'; label: string; blocks: BlockDef[] }
  | { type: 'round'; rounds: number; deloadRounds?: number; restNote: string; blocks: BlockDef[] };

const WORKOUTS: Record<string, GroupDef[][]> = {
  BASE: [
    [
      { type:'single', block:{ id:'base-mon-sq', name:'Front Squat', sets:4, detail:'6 reps @ 70-75% (~230 lb). Tempo 3-1-1. Rest 2:30.' }},
      { type:'single', block:{ id:'base-mon-dl', name:'Trap-Bar Deadlift', sets:4, detail:'6 reps @ 70% (~280 lb). Full reset each rep.' }},
      { type:'single', block:{ id:'base-mon-pu', name:'Weighted Pull-Up', sets:4, detail:'6 reps @ +15 lb. Controlled 3-second descent.' }},
      { type:'single', block:{ id:'base-mon-z2', name:'Z2 Run', detail:'30 min treadmill @ 1% incline. 5.8–6.2 mph. HR under 145.' }},
      { type:'single', block:{ id:'base-mon-ski', name:'SkiErg Intervals', sets:3, detail:'500m @ sub-2:20. Rest 90s between sets.' }},
    ],
    [
      { type:'single', block:{ id:'base-tue-sq', name:'Back Squat', sets:4, detail:'5 reps @ 255–265 lb. Watch knee tracking.' }},
      { type:'single', block:{ id:'base-tue-rdl', name:'Romanian Deadlift', sets:3, detail:'8 reps @ 185–205 lb. Controlled descent.' }},
      { type:'single', block:{ id:'base-tue-bench', name:'Bench Press', sets:3, detail:'6–8 reps @ 185 lb.' }},
      { type:'round', rounds:3, deloadRounds:2, restNote:'60s rest — then Round',
        blocks:[
          { id:'base-tue-run', name:'Run 0.37 mi', detail:'@ 6.3–6.5 mph. Straight onto sled.' },
          { id:'base-tue-sled', name:'Sled Push 50m', detail:'4–5 plates (~270–315 lb). Overload vs race weight.' },
          { id:'base-tue-ski', name:'SkiErg 500m', detail:'Target sub-2:10.' },
        ]},
    ],
    [
      { type:'single', block:{ id:'base-wed-z2', name:'Z2 Run', detail:'35 min @ 1% incline. 5.8–6.2 mph. HR 130–145.' }},
      { type:'superset', label:'Superset A — Push / Pull', blocks:[
        { id:'base-wed-bench', name:'Bench Press', sets:4, detail:'8 reps @ 185 lb.' },
        { id:'base-wed-row', name:'BB Row', sets:4, detail:'8 reps @ 165 lb. 1s hold at top.' },
      ]},
      { type:'superset', label:'Superset B — Shoulders / Rear Delt', blocks:[
        { id:'base-wed-ohp', name:'DB OHP', sets:3, detail:'10 reps @ 55 lb DBs.' },
        { id:'base-wed-fp', name:'Face Pulls', sets:3, detail:'15 reps. Light weight, quality reps.' },
      ]},
    ],
    [
      { type:'single', block:{ id:'base-thu-wu', name:'Warm-Up Run', detail:'15 min easy Z2. 5.5–5.8 mph.' }},
      { type:'single', block:{ id:'base-thu-t1', name:'Threshold Interval 1', detail:'10 min @ 7.0–7.1 mph. RPE 7–8.' }},
      { type:'single', block:{ id:'base-thu-rec', name:'Recovery Jog', detail:'3 min easy @ 5.5 mph.' }},
      { type:'single', block:{ id:'base-thu-t2', name:'Threshold Interval 2', detail:'10 min @ 7.1–7.2 mph. Match or beat Interval 1.' }},
      { type:'single', block:{ id:'base-thu-sled', name:'Sled Push — Technique', sets:4, detail:'25m @ race weight (335 lb / 5 plates). Technique only.' }},
      { type:'single', block:{ id:'base-thu-wb', name:'Wall Balls — Technique', sets:3, detail:'25 reps @ 6 kg unbroken.' }},
    ],
    [
      { type:'round', rounds:4, deloadRounds:3, restNote:'90s rest — then Round',
        blocks:[
          { id:'base-fri-run1', name:'Run 0.62 mi', detail:'Run 1: 6.0 mph. Build each round.' },
          { id:'base-fri-ski', name:'SkiErg 1000m', detail:'Target sub-4:10. Hip-hinge drive, damper 5.' },
          { id:'base-fri-run2', name:'Run 0.62 mi', detail:'Run 2: 6.3 mph.' },
          { id:'base-fri-sled', name:'Sled Pull 50m', detail:'TRX bands. 2 plates. Deadlift stance, hip snap.' },
          { id:'base-fri-run3', name:'Run 0.62 mi', detail:'Run 3: 6.5 mph.' },
          { id:'base-fri-bbj', name:'Burpee Broad Jumps 80m', detail:'Step-up method. Chunk 4x20m.' },
          { id:'base-fri-run4', name:'Run 0.62 mi', detail:'Run 4: 6.8–7.0 mph. Empty the tank.' },
          { id:'base-fri-wb', name:'Wall Balls 100 reps', detail:'6 kg. Break 30/25/20/15/10 if needed.' },
        ]},
    ],
    [
      { type:'single', block:{ id:'base-sat-z2', name:'Long Z2 Run', detail:'70 min @ 1–2% incline. 5.8–6.2 mph. HR under 148.' }},
      { type:'single', block:{ id:'base-sat-ins', name:'HYROX-Pace Inserts', sets:4, detail:'2 min @ 6.5–6.8 mph in the final 20 min.' }},
    ],
    [
      { type:'single', block:{ id:'base-sun-rest', name:'Full Rest', detail:'No training. Foam roll 10–15 min. 20 min walk optional.' }},
    ],
  ],
  BUILD: [
    [
      { type:'single', block:{ id:'build-mon-sq', name:'Front Squat', sets:5, detail:'3 reps @ 85% (~245 lb). Rest 3:00.' }},
      { type:'single', block:{ id:'build-mon-dl', name:'Trap-Bar Deadlift', sets:4, detail:'4 reps @ 335 lb. Reset grip each rep.' }},
      { type:'single', block:{ id:'build-mon-pu', name:'Weighted Pull-Up', sets:4, detail:'5 reps @ +25 lb.' }},
      { type:'single', block:{ id:'build-mon-pp', name:'Push Press', sets:4, detail:'4 reps @ 155 lb.' }},
      { type:'single', block:{ id:'build-mon-vo2', name:'VO2max Interval — 4 min', sets:5, detail:'4 min @ 7.5–8.0 mph. RPE 9. Rest 3 min walk-jog.' }},
    ],
    [
      { type:'round', rounds:4, deloadRounds:2, restNote:'60s rest — then Round',
        blocks:[
          { id:'build-tue-run1', name:'Run 0.31 mi', detail:'@ race pace 6.5–7.0 mph. Straight into lunges.' },
          { id:'build-tue-lunge', name:'Walking Lunges 30m', detail:'@ 20 kg sandbag.' },
          { id:'build-tue-run2', name:'Run 0.31 mi', detail:'@ race pace 6.5–7.0 mph.' },
          { id:'build-tue-carry', name:'Farmers Carry 100m', detail:'@ 2x24 kg. End of round.' },
        ]},
    ],
    [
      { type:'single', block:{ id:'build-wed-z2', name:'Z2 Run', detail:'30 min @ 1% incline. 5.8–6.2 mph.' }},
      { type:'superset', label:'Superset A — Push / Pull', blocks:[
        { id:'build-wed-bench', name:'Bench Press', sets:4, detail:'8 reps @ 195 lb.' },
        { id:'build-wed-row', name:'BB Row', sets:4, detail:'8 reps @ 165 lb.' },
      ]},
      { type:'single', block:{ id:'build-wed-bss', name:'Bulgarian Split Squat', sets:3, detail:'8 reps/side @ 60 lb DBs.' }},
      { type:'single', block:{ id:'build-wed-hlr', name:'Hanging Leg Raise', sets:3, detail:'12 reps. Controlled.' }},
    ],
    [
      { type:'single', block:{ id:'build-thu-wu', name:'Warm-Up', detail:'15 min easy Z2. 5.5 mph.' }},
      { type:'single', block:{ id:'build-thu-t1', name:'Threshold Interval 1', detail:'15 min @ 7.0–7.1 mph.' }},
      { type:'single', block:{ id:'build-thu-rec', name:'Recovery Jog', detail:'3 min easy. 5.5 mph.' }},
      { type:'single', block:{ id:'build-thu-t2', name:'Threshold Interval 2', detail:'15 min @ 7.1–7.2 mph.' }},
      { type:'single', block:{ id:'build-thu-slp', name:'Sled Pull', sets:4, detail:'25m @ 2 plates. Deadlift stance, hip-snap.' }},
      { type:'single', block:{ id:'build-thu-wb', name:'Wall Balls', sets:3, detail:'25 reps @ 6 kg unbroken.' }},
    ],
    [
      { type:'single', block:{ id:'build-fri-r1', name:'Run 1 — 0.62 mi', detail:'@ 6.5 mph. Restraint.' }},
      { type:'single', block:{ id:'build-fri-ski', name:'SkiErg — 1000m', detail:'Target sub-4:00.' }},
      { type:'single', block:{ id:'build-fri-r2', name:'Run 2 — 0.62 mi', detail:'@ 6.5–6.8 mph.' }},
      { type:'single', block:{ id:'build-fri-sled', name:'Sled Push — 50m', detail:'@ race weight 335 lb / 5 plates.' }},
      { type:'single', block:{ id:'build-fri-r3', name:'Run 3 — 0.62 mi', detail:'@ 6.8 mph.' }},
      { type:'single', block:{ id:'build-fri-slp', name:'Sled Pull — 50m', detail:'@ 2 plates TRX.' }},
      { type:'single', block:{ id:'build-fri-r4', name:'Run 4 — 0.62 mi', detail:'@ 7.0+ mph. Empty the tank.' }},
      { type:'single', block:{ id:'build-fri-bbj', name:'Burpee Broad Jumps — 80m', detail:'Step-up method. Chunk 4x20m.' }},
    ],
    [
      { type:'single', block:{ id:'build-sat-z2', name:'Long Z2/3 Run', detail:'75 min. Mostly Z2, last 30 min introduce Z3. 6.0–6.5 mph.' }},
      { type:'single', block:{ id:'build-sat-ins', name:'HYROX-Pace Inserts', sets:4, detail:'3 min @ 6.5–7.0 mph in last 30 min.' }},
    ],
    [
      { type:'single', block:{ id:'build-sun-rest', name:'Full Rest', detail:'Full rest. HRV check.' }},
    ],
  ],
  PEAK: [
    [
      { type:'single', block:{ id:'peak-mon-sq', name:'Squat', sets:3, detail:'3 reps @ 80% (~260 lb). Maintenance.' }},
      { type:'single', block:{ id:'peak-mon-dl', name:'Deadlift', sets:3, detail:'3 reps @ 80% (~320 lb).' }},
      { type:'single', block:{ id:'peak-mon-bench', name:'Bench', sets:3, detail:'5 reps @ 75% (~185 lb).' }},
      { type:'single', block:{ id:'peak-mon-vo2', name:'VO2max Interval — 4 min', sets:5, detail:'4 min @ 7.5–8.0 mph. Rest 3 min. RPE 9.' }},
    ],
    [
      { type:'round', rounds:4, restNote:'60s rest — then Round',
        blocks:[
          { id:'peak-tue-run1', name:'Run 0.31 mi', detail:'@ race pace 6.5–7.0 mph.' },
          { id:'peak-tue-lunge', name:'Walking Lunges 30m', detail:'@ 20 kg sandbag.' },
          { id:'peak-tue-run2', name:'Run 0.31 mi', detail:'@ race pace 6.5–7.0 mph.' },
          { id:'peak-tue-carry', name:'Farmers Carry 100m', detail:'@ 2x24 kg.' },
        ]},
    ],
    [
      { type:'single', block:{ id:'peak-wed-wu', name:'Warm-Up + Drills', detail:'15 min easy Z2 + drills. 5.5 mph.' }},
      { type:'single', block:{ id:'peak-wed-1k', name:'Keystone — 1 mi @ Race Pace', sets:6, detail:'1 mi @ 6.5–7.0 mph. 90s standing rest between sets.' }},
      { type:'superset', label:'Light Upper', blocks:[
        { id:'peak-wed-pu', name:'Pull-Ups', sets:3, detail:'6 reps bodyweight.' },
        { id:'peak-wed-pp', name:'Push Press', sets:3, detail:'5 reps @ 135 lb.' },
        { id:'peak-wed-fp', name:'Face Pulls', sets:3, detail:'15 reps.' },
      ]},
    ],
    [
      { type:'single', block:{ id:'peak-thu-wu', name:'Warm-Up', detail:'15 min easy Z2. 5.5 mph.' }},
      { type:'single', block:{ id:'peak-thu-t1', name:'Threshold Interval 1', detail:'15 min @ 7.0–7.1 mph.' }},
      { type:'single', block:{ id:'peak-thu-rec', name:'Recovery Jog', detail:'3 min easy. 5.5 mph.' }},
      { type:'single', block:{ id:'peak-thu-t2', name:'Threshold Interval 2', detail:'15 min @ 7.1–7.2 mph.' }},
      { type:'single', block:{ id:'peak-thu-sled', name:'Sled Push', sets:4, detail:'25m @ race weight 335 lb / 5 plates.' }},
      { type:'single', block:{ id:'peak-thu-sb', name:'Sandbag Lunges', sets:2, detail:'100m @ 20 kg. Attack the distance.' }},
    ],
    [
      { type:'single', block:{ id:'peak-fri-r1', name:'Run 1 — 0.62 mi', detail:'@ 6.5 mph. Restraint.' }},
      { type:'single', block:{ id:'peak-fri-ski', name:'SkiErg — 1000m', detail:'Target sub-4:00.' }},
      { type:'single', block:{ id:'peak-fri-r2', name:'Run 2 — 0.62 mi', detail:'@ 6.5–6.8 mph.' }},
      { type:'single', block:{ id:'peak-fri-sled', name:'Sled Push — 50m', detail:'@ race weight 335 lb / 5 plates.' }},
      { type:'single', block:{ id:'peak-fri-r3', name:'Run 3 — 0.62 mi', detail:'@ 6.8 mph.' }},
      { type:'single', block:{ id:'peak-fri-slp', name:'Sled Pull — 50m', detail:'@ 2 plates TRX.' }},
      { type:'single', block:{ id:'peak-fri-r4', name:'Run 4 — 0.62 mi', detail:'@ 7.0+ mph. Empty the tank.' }},
      { type:'single', block:{ id:'peak-fri-bbj', name:'Burpee BJ — 80m', detail:'Step-up method. Chunk 4x20m.' }},
    ],
    [
      { type:'single', block:{ id:'peak-sat-z2', name:'Long Run', detail:'70 min Z2 with pace inserts in last 25 min. 5.8–6.2 mph base.' }},
      { type:'single', block:{ id:'peak-sat-ins', name:'HYROX-Pace Inserts', sets:5, detail:'2 min @ 6.5–7.0 mph in last 25 min.' }},
    ],
    [
      { type:'single', block:{ id:'peak-sun-rest', name:'Full Rest', detail:'Full rest. HRV check. Sleep 8–9 hrs.' }},
    ],
  ],
  TAPER: [
    [
      { type:'single', block:{ id:'taper-mon-sq', name:'Squat', sets:3, detail:'3 reps @ 60% (~195 lb). Feel only.' }},
      { type:'single', block:{ id:'taper-mon-dl', name:'Deadlift', sets:3, detail:'3 reps @ 60% (~240 lb).' }},
      { type:'single', block:{ id:'taper-mon-bench', name:'Bench', sets:3, detail:'5 reps @ 65% (~160 lb).' }},
      { type:'single', block:{ id:'taper-mon-sled', name:'Sled Push — Technique', sets:4, detail:'12.5m @ race weight 335 lb. 80% effort.' }},
    ],
    [
      { type:'round', rounds:3, restNote:'90s rest — then Round',
        blocks:[
          { id:'taper-tue-run', name:'Run 0.25 mi', detail:'@ race pace 6.8–7.0 mph.' },
          { id:'taper-tue-sled', name:'Sled Push 50m', detail:'@ 3 plates (~265 lb). Light taper load.' },
          { id:'taper-tue-row', name:'Row 200m', detail:'Moderate effort. End of round.' },
        ]},
    ],
    [
      { type:'single', block:{ id:'taper-wed-z2', name:'Easy Z2 Run', detail:'25 min easy. 5.5–5.8 mph. HR under 135.' }},
    ],
    [
      { type:'single', block:{ id:'taper-thu-sim', name:'3-Station Light Sim', detail:'3 stations @ 70% effort. ~25 min total.' }},
    ],
    [
      { type:'single', block:{ id:'taper-fri-z2', name:'Easy Z2', detail:'30 min. 5.5 mph. HR under 140.' }},
    ],
    [
      { type:'single', block:{ id:'taper-sat-z2', name:'Z2 Run', detail:'45 min Z2. 5.8 mph.' }},
      { type:'single', block:{ id:'taper-sat-ins', name:'HYROX-Pace Strides', sets:3, detail:'2 min @ 6.8–7.0 mph in final 15 min.' }},
    ],
    [
      { type:'single', block:{ id:'taper-sun-rest', name:'Full Rest', detail:'Full rest. Begin 5-day hydration ramp: +500 ml water + sodium.' }},
    ],
  ],
};

const DELOAD_OVERRIDES: Record<string, string> = {
  'base-mon-ski': 'Deload — 2x500m easy @ 2:30. Two sets only.',
  'base-thu-t2': 'Deload — skip second interval. 1x10 min @ 7.0 mph only.',
  'base-sat-ins': 'Deload — skip pace inserts.',
  'build-mon-vo2': 'Deload — 3x4 min @ 7.5 mph only.',
  'build-sat-ins': 'Deload — skip pace inserts.',
};

const DELOAD_WEEKS = [4, 7, 11, 14];

const SIM_SEGMENTS = [
  { name:'Run 1',          type:'run',     target:285, note:'0.62 mi — restraint, 6.5 mph' },
  { name:'SkiErg',         type:'station', target:325, note:'1000m — hip-hinge, damper 5' },
  { name:'Run 2',          type:'run',     target:310, note:'0.62 mi — build to 6.8 mph' },
  { name:'Sled Push',      type:'station', target:250, note:'50m @ 335 lb / 5 plates' },
  { name:'Run 3',          type:'run',     target:315, note:'0.62 mi — short steps, 6.8 mph' },
  { name:'Sled Pull',      type:'station', target:340, note:'50m @ 2 plates TRX' },
  { name:'Run 4',          type:'run',     target:320, note:'0.62 mi — settle HR, 6.8 mph' },
  { name:'Burpee BJ',      type:'station', target:340, note:'80m — chunk 4x20m' },
  { name:'Run 5',          type:'run',     target:325, note:'0.62 mi — biggest spike, 6.8 mph' },
  { name:'Row',            type:'station', target:330, note:'1000m — damper 4, sub-5:00' },
  { name:'Run 6',          type:'run',     target:325, note:'0.62 mi — 7.0 mph' },
  { name:'Farmers Carry',  type:'station', target:190, note:'200m @ 2x24 kg — unbroken' },
  { name:'Run 7',          type:'run',     target:330, note:'0.62 mi — grip shot, 7.0 mph' },
  { name:'Sandbag Lunges', type:'station', target:340, note:'100m @ 20 kg — attack' },
  { name:'Run 8',          type:'run',     target:340, note:'0.62 mi — empty the tank, 7.5 mph' },
  { name:'Wall Balls',     type:'station', target:435, note:'100 reps @ 6 kg — 30/25/20/15/10' },
];

const DAY_NAMES = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const SESSION_TITLES: Record<string, string[]> = {
  BASE:  ['Heavy Lower + Engine','Strength + Compromised Brick','Z2 + Upper Strength','Threshold + Station Skill','Mini Sim — Station Day','Long Run','Rest'],
  BUILD: ['Strength + VO2max','Compromised Race Brick','Z2 + Upper Strength','Threshold + Stations','Half Sim','Long Run + HYROX Pace','Rest'],
  PEAK:  ['Maintenance Strength + VO2','Race-Specific Brick','Keystone 6x1 mi','Threshold + Stations','Full / Half Sim','Long Run + HYROX Pace','Rest'],
  TAPER: ['Technique @ 80%','Light Brick','Easy Shakeout','Light Half Sim','Easy Z2','Short Long Run','Rest + Carb Load'],
};

// Race date: September 18, 2026. Week 1 started April 27, 2026.
function getCurrentWeek(): number {
  const start = new Date('2026-04-27T00:00:00');
  const now = new Date();
  const elapsed = Math.floor((now.getTime() - start.getTime()) / (7 * 24 * 3600 * 1000));
  return Math.min(Math.max(elapsed + 1, 1), 20);
}
function getPhase(w: number): string {
  return w <= 7 ? 'BASE' : w <= 14 ? 'BUILD' : w <= 18 ? 'PEAK' : 'TAPER';
}
function formatTime(s: number): string {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
    : `${m}:${String(sec).padStart(2,'0')}`;
}

const INITIAL: AppState = { workoutLogs: [], simHistory: [], lastWeight: '' };

const card: React.CSSProperties = {
  background: 'var(--foundry-card)',
  border: '1px solid var(--foundry-border)',
  borderRadius: 'var(--foundry-radius-md)',
  padding: 16,
  marginBottom: 12,
};
const eyebrow: React.CSSProperties = {
  fontFamily: 'var(--foundry-font-mono)',
  fontSize: 9,
  letterSpacing: '0.18em',
  textTransform: 'uppercase' as const,
  color: 'var(--foundry-text-subtle)',
  marginBottom: 4,
};
const inputStyle: React.CSSProperties = {
  background: 'var(--foundry-bg)',
  border: '1px solid var(--foundry-border)',
  borderRadius: 'var(--foundry-radius-sm)',
  padding: '6px 8px',
  color: 'var(--foundry-text)',
  fontFamily: 'var(--foundry-font-body)',
  fontSize: 13,
  width: '100%',
};

export default function HyroxTrainer() {
  const WEEK = getCurrentWeek();
  const PHASE = getPhase(WEEK);
  const DELOAD = DELOAD_WEEKS.includes(WEEK);

  const { value, setValue, ready } = useAppData<AppState>('hyrox-trainer', 'state', INITIAL);

  const [tab, setTab] = useState<'workout' | 'sim'>('workout');
  const [selectedDay, setSelectedDay] = useState<number>(() => {
    const d = new Date().getDay(); return d === 0 ? 6 : d - 1;
  });
  const [sessionLogs, setSessionLogs] = useState<Record<string, BlockLog[]>>({});
  const [rpe, setRpe] = useState<number | null>(null);
  const [weight, setWeight] = useState('');
  const [roundsDone, setRoundsDone] = useState<Record<string, boolean>>({});
  const [timers, setTimers] = useState<Record<string, number>>({});
  const [running, setRunning] = useState<Record<string, boolean>>({});
  const timerRefs = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const logRefs = useRef<Record<string, { val: HTMLInputElement | null; note: HTMLInputElement | null }>>({});

  const [simRunning, setSimRunning] = useState(false);
  const [simStarted, setSimStarted] = useState(false);
  const [simSec, setSimSec] = useState(0);
  const [simSegIdx, setSimSegIdx] = useState(0);
  const [simSegStart, setSimSegStart] = useState(0);
  const [splits, setSplits] = useState<SimSplit[]>([]);
  const simRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (ready && value.lastWeight) setWeight(value.lastWeight);
  }, [ready]);

  const save = useCallback((updates: Partial<AppState>) => {
    setValue({ ...value, ...updates });
  }, [value, setValue]);

  const toggleTimer = useCallback((id: string) => {
    if (running[id]) {
      clearInterval(timerRefs.current[id]);
      setRunning(r => ({ ...r, [id]: false }));
    } else if ((timers[id] || 0) > 0) {
      setTimers(t => ({ ...t, [id]: 0 }));
    } else {
      timerRefs.current[id] = setInterval(() => {
        setTimers(t => ({ ...t, [id]: (t[id] || 0) + 1 }));
      }, 1000);
      setRunning(r => ({ ...r, [id]: true }));
    }
  }, [timers, running]);

  const logBlock = useCallback((id: string) => {
    const refs = logRefs.current[id];
    if (!refs) return;
    const val = refs.val?.value?.trim() || '';
    if (!val) return;
    const note = refs.note?.value?.trim() || '';
    setSessionLogs(prev => ({ ...prev, [id]: [...(prev[id] || []), { val, note, ts: Date.now() }] }));
    if (refs.val) refs.val.value = '';
    if (refs.note) refs.note.value = '';
  }, []);

  const deleteLog = useCallback((id: string, idx: number) => {
    setSessionLogs(prev => {
      const arr = [...(prev[id] || [])];
      arr.splice(idx, 1);
      return { ...prev, [id]: arr };
    });
  }, []);

  const saveSession = useCallback(() => {
    const notes = Object.entries(sessionLogs)
      .filter(([, logs]) => logs.length > 0)
      .map(([id, logs]) => `${id}: ${logs.map(l => (l.note ? l.note + ': ' : '') + l.val).join(', ')}`)
      .join(' | ');
    const record: SessionRecord = {
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      week: WEEK, phase: PHASE, dayIdx: selectedDay, rpe, weight, notes,
    };
    save({ workoutLogs: [...value.workoutLogs, record], lastWeight: weight });
    setSessionLogs({}); setRpe(null); setRoundsDone({});
  }, [sessionLogs, rpe, weight, value, save, WEEK, PHASE, selectedDay]);

  const simStart = useCallback(() => {
    setSimStarted(true); setSimRunning(true);
    simRef.current = setInterval(() => setSimSec(s => s + 1), 1000);
  }, []);
  const simPause = useCallback(() => { if (simRef.current) clearInterval(simRef.current); setSimRunning(false); }, []);
  const simResume = useCallback(() => {
    setSimRunning(true);
    simRef.current = setInterval(() => setSimSec(s => s + 1), 1000);
  }, []);
  const simReset = useCallback(() => {
    if (simRef.current) clearInterval(simRef.current);
    setSimRunning(false); setSimStarted(false); setSimSec(0);
    setSimSegIdx(0); setSimSegStart(0); setSplits([]);
  }, []);
  const recordSplit = useCallback((idx: number) => {
    if (!simRunning) return;
    setSplits(prev => [...prev, { idx, seconds: simSec - simSegStart, total: simSec }]);
    setSimSegStart(simSec); setSimSegIdx(idx + 1);
  }, [simRunning, simSec, simSegStart]);
  const saveSim = useCallback(() => {
    const notes = splits.map(sp => {
      const seg = SIM_SEGMENTS[sp.idx];
      const d = sp.seconds - seg.target;
      return `${seg.name}: ${formatTime(sp.seconds)} (${d >= 0 ? '+' : ''}${formatTime(Math.abs(d))})`;
    }).join(' | ');
    save({ simHistory: [...value.simHistory, { date: new Date().toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }), week: WEEK, totalTime: formatTime(simSec), notes }] });
    simReset();
  }, [splits, simSec, value, save, WEEK, simReset]);

  if (!ready) return null;

  const renderBlock = (b: BlockDef, setLabel?: string, showDetail = true) => {
    const id = b.id + (setLabel ? `-${setLabel.replace(/\s/g, '').toLowerCase()}` : '');
    const rawId = b.id;
    const detailText = DELOAD && DELOAD_OVERRIDES[rawId] ? DELOAD_OVERRIDES[rawId] : b.detail;
    const isDeload = DELOAD && !!DELOAD_OVERRIDES[rawId];
    const logs = sessionLogs[id] || [];
    const t = timers[id] || 0;
    const isRunning = running[id] || false;
    if (!logRefs.current[id]) logRefs.current[id] = { val: null, note: null };

    return (
      <div key={id} style={{ borderBottom: '1px solid var(--foundry-border)', paddingBottom: 12, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' as const }}>
            <span style={{ fontFamily: 'var(--foundry-font-display)', fontSize: 16, color: 'var(--foundry-text)', fontWeight: 600 }}>{b.name}</span>
            {setLabel && <span style={{ ...eyebrow, marginBottom: 0, background: 'var(--foundry-elevated)', padding: '2px 6px', borderRadius: 'var(--foundry-radius-sm)' }}>{setLabel}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {t > 0 && <span style={{ fontFamily: 'var(--foundry-font-mono)', fontSize: 12, color: 'var(--foundry-ember)' }}>{formatTime(t)}</span>}
            <IonButton fill="outline" size="small" onClick={() => toggleTimer(id)}
              style={{ '--color': isRunning ? 'var(--foundry-ember)' : 'var(--foundry-text-muted)', '--border-color': isRunning ? 'var(--foundry-ember)' : 'var(--foundry-border)' } as React.CSSProperties}>
              {isRunning ? 'Stop' : t > 0 ? 'Reset' : 'Start'}
            </IonButton>
          </div>
        </div>
        {showDetail && detailText && (
          <p style={{ fontFamily: 'var(--foundry-font-body)', fontSize: 13, color: isDeload ? 'var(--foundry-ember)' : 'var(--foundry-text-muted)', marginBottom: 8, lineHeight: 1.5 }}>
            {isDeload ? 'Deload — ' : ''}{detailText}
          </p>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 6, marginBottom: 4 }}>
          <input ref={el => { if (logRefs.current[id]) logRefs.current[id].val = el; }} placeholder="Wt / reps / time" style={inputStyle} />
          <input ref={el => { if (logRefs.current[id]) logRefs.current[id].note = el; }} placeholder="Note" style={inputStyle} />
          <IonButton size="small" onClick={() => logBlock(id)} style={{ '--background': 'var(--foundry-ember)', '--color': 'var(--foundry-bg)' } as React.CSSProperties}>Log</IonButton>
        </div>
        {logs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {logs.map((l, li) => (
              <div key={li} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--foundry-font-body)', fontSize: 12, color: 'var(--foundry-text-muted)' }}>
                <span>{l.note ? <strong style={{ color: 'var(--foundry-text)' }}>{l.note}: </strong> : null}{l.val}</span>
                <button onClick={() => deleteLog(id, li)} style={{ background: 'none', border: 'none', color: 'var(--foundry-text-subtle)', cursor: 'pointer', fontSize: 13 }}>x</button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderGroup = (g: GroupDef, gi: number) => {
    if (g.type === 'single') {
      const sets = g.block.sets || 1;
      return <div key={gi}>{sets === 1 ? renderBlock(g.block) : Array.from({ length: sets }, (_, i) => renderBlock(g.block, `Set ${i + 1}`, i === 0))}</div>;
    }
    if (g.type === 'superset') {
      return (
        <div key={gi} style={{ border: '1px solid var(--foundry-border)', borderRadius: 'var(--foundry-radius-md)', marginBottom: 12, overflow: 'hidden' }}>
          <div style={{ background: 'var(--foundry-elevated)', padding: '6px 12px', ...eyebrow, marginBottom: 0 }}>{g.label}</div>
          <div style={{ padding: '12px 12px 0' }}>
            {g.blocks.map(b => (b.sets || 1) === 1 ? renderBlock(b) : Array.from({ length: b.sets || 1 }, (_, i) => renderBlock(b, `Set ${i + 1}`, i === 0)))}
          </div>
        </div>
      );
    }
    if (g.type === 'round') {
      const total = DELOAD && g.deloadRounds ? g.deloadRounds : g.rounds;
      return (
        <div key={gi} style={{ marginBottom: 12 }}>
          {Array.from({ length: total }, (_, r) => {
            const key = `${PHASE}-${selectedDay}-${gi}-r${r}`;
            const done = roundsDone[key] || false;
            return (
              <div key={r} style={{ border: `1px solid ${done ? 'var(--foundry-border)' : 'var(--foundry-ember-dim)'}`, borderRadius: 'var(--foundry-radius-md)', marginBottom: 8, overflow: 'hidden' }}>
                <div style={{ background: 'var(--foundry-elevated)', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontFamily: 'var(--foundry-font-mono)', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: done ? 'var(--foundry-text-subtle)' : 'var(--foundry-ember)' }}>
                      Round {r + 1} of {total}
                    </span>
                    <span style={{ fontFamily: 'var(--foundry-font-body)', fontSize: 12, color: 'var(--foundry-text-subtle)', marginLeft: 8 }}>{g.blocks.map(b => b.name).join(' — ')}</span>
                  </div>
                  <IonButton fill="outline" size="small" onClick={() => setRoundsDone(prev => ({ ...prev, [key]: !prev[key] }))}
                    style={{ '--color': done ? 'var(--foundry-text-subtle)' : 'var(--foundry-ember)', '--border-color': done ? 'var(--foundry-border)' : 'var(--foundry-ember)' } as React.CSSProperties}>
                    {done ? 'Done' : 'Mark done'}
                  </IonButton>
                </div>
                {!done && <div style={{ padding: '12px 12px 0' }}>{g.blocks.map(b => renderBlock(b))}</div>}
                {r < total - 1 && <div style={{ padding: '6px 12px', borderTop: '1px solid var(--foundry-border)', fontFamily: 'var(--foundry-font-body)', fontSize: 12, color: 'var(--foundry-text-subtle)' }}>{g.restNote} {r + 2}</div>}
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  const renderWorkout = () => {
    const groups = WORKOUTS[PHASE][selectedDay];
    const history = value.workoutLogs.filter(l => l.dayIdx === selectedDay).slice(-3).reverse();
    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 16 }}>
          {DAY_NAMES.map((d, i) => (
            <button key={i} onClick={() => { setSelectedDay(i); setSessionLogs({}); setRoundsDone({}); }}
              style={{ padding: '8px 2px', border: `1px solid ${i === selectedDay ? 'var(--foundry-ember)' : 'var(--foundry-border)'}`, background: 'transparent', color: i === selectedDay ? 'var(--foundry-ember)' : 'var(--foundry-text-muted)', fontFamily: 'var(--foundry-font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' as const, cursor: 'pointer', borderRadius: 'var(--foundry-radius-sm)', textAlign: 'center' as const }}>
              {d}
            </button>
          ))}
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={eyebrow}>W{WEEK} · {PHASE}{DELOAD ? ' · Deload' : ''}</div>
          <div style={{ fontFamily: 'var(--foundry-font-display)', fontSize: 20, fontWeight: 600, color: 'var(--foundry-text)' }}>{SESSION_TITLES[PHASE][selectedDay]}</div>
        </div>
        <div style={card}>{groups.map((g, gi) => renderGroup(g, gi))}</div>
        <div style={card}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <div style={eyebrow}>RPE</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {[6,7,8,9,10].map(r => (
                  <button key={r} onClick={() => setRpe(r)}
                    style={{ flex: 1, padding: '6px 2px', border: `1px solid ${rpe === r ? 'var(--foundry-ember)' : 'var(--foundry-border)'}`, background: rpe === r ? 'var(--foundry-ember)' : 'transparent', color: rpe === r ? 'var(--foundry-bg)' : 'var(--foundry-text-muted)', fontFamily: 'var(--foundry-font-mono)', fontSize: 13, cursor: 'pointer', borderRadius: 'var(--foundry-radius-sm)', textAlign: 'center' as const }}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div style={eyebrow}>Bodyweight (lb)</div>
              <input value={weight} onChange={e => setWeight(e.target.value)} placeholder="e.g. 218" style={inputStyle} />
            </div>
          </div>
          <IonButton expand="block" onClick={saveSession} style={{ '--background': 'var(--foundry-ember)', '--color': 'var(--foundry-bg)' } as React.CSSProperties}>Save Session</IonButton>
        </div>
        {history.length > 0 && (
          <div>
            <div style={eyebrow}>Past Sessions — {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][selectedDay]}</div>
            {history.map((l, li) => (
              <div key={li} style={card}>
                <div style={{ fontFamily: 'var(--foundry-font-display)', fontSize: 14, color: 'var(--foundry-text)', marginBottom: 4 }}>{l.date} · W{l.week}</div>
                <div style={{ fontFamily: 'var(--foundry-font-body)', fontSize: 13, color: 'var(--foundry-text-muted)' }}>RPE {l.rpe || '—'} · {l.weight || '—'} lb{l.notes ? ` · ${l.notes}` : ''}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderSim = () => {
    const targetSoFar = SIM_SEGMENTS.slice(0, splits.length).reduce((a, s) => a + s.target, 0);
    const delta = simStarted && splits.length > 0 ? simSec - targetSoFar : null;
    return (
      <div>
        <div style={card}>
          <div style={eyebrow}>Sim Pacer — Sub 1:25</div>
          <div style={{ fontFamily: 'var(--foundry-font-display)', fontSize: 52, fontWeight: 700, letterSpacing: '-0.02em', color: simRunning ? 'var(--foundry-ember)' : 'var(--foundry-text)', lineHeight: 1, marginBottom: 4 }}>{formatTime(simSec)}</div>
          {delta !== null && (
            <div style={{ fontFamily: 'var(--foundry-font-body)', fontSize: 13, color: delta <= 0 ? 'var(--foundry-text-muted)' : 'var(--foundry-ember)', marginBottom: 12 }}>
              {delta <= 0 ? `${formatTime(Math.abs(delta))} ahead of pace` : `${formatTime(delta)} behind pace`}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            {!simStarted
              ? <IonButton onClick={simStart} style={{ '--background': 'var(--foundry-ember)', '--color': 'var(--foundry-bg)' } as React.CSSProperties}>Start</IonButton>
              : simRunning
                ? <IonButton onClick={simPause} style={{ '--background': 'var(--foundry-elevated)', '--color': 'var(--foundry-text)' } as React.CSSProperties}>Pause</IonButton>
                : <IonButton onClick={simResume} style={{ '--background': 'var(--foundry-ember)', '--color': 'var(--foundry-bg)' } as React.CSSProperties}>Resume</IonButton>
            }
            <IonButton fill="outline" onClick={simReset} style={{ '--color': 'var(--foundry-text-muted)', '--border-color': 'var(--foundry-border)' } as React.CSSProperties}>Reset</IonButton>
            {!simRunning && splits.length > 0 && (
              <IonButton fill="outline" onClick={saveSim} style={{ '--color': 'var(--foundry-ember)', '--border-color': 'var(--foundry-ember)' } as React.CSSProperties}>Save</IonButton>
            )}
          </div>
        </div>
        {SIM_SEGMENTS.map((seg, i) => {
          const isDone = splits.some(sp => sp.idx === i);
          const isActive = !isDone && simSegIdx === i && simStarted;
          const split = splits.find(sp => sp.idx === i);
          const segDelta = split ? split.seconds - seg.target : null;
          return (
            <div key={i} style={{ background: 'var(--foundry-card)', border: `1px solid ${isActive ? 'var(--foundry-ember)' : 'var(--foundry-border)'}`, borderRadius: 'var(--foundry-radius-md)', padding: '10px 12px', marginBottom: 6, display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 8, alignItems: 'center', opacity: isDone ? 0.6 : 1 }}>
              <div>
                <div style={{ fontFamily: 'var(--foundry-font-display)', fontSize: 15, fontWeight: 600, color: seg.type === 'run' ? 'var(--foundry-text)' : 'var(--foundry-ember)' }}>{seg.name}</div>
                <div style={{ fontFamily: 'var(--foundry-font-body)', fontSize: 11, color: 'var(--foundry-text-subtle)' }}>{formatTime(seg.target)} · {seg.note}</div>
              </div>
              <div style={{ fontFamily: 'var(--foundry-font-mono)', fontSize: 14, color: 'var(--foundry-text)', minWidth: 44, textAlign: 'right' as const }}>{split ? formatTime(split.seconds) : ''}</div>
              {segDelta !== null
                ? <div style={{ fontFamily: 'var(--foundry-font-mono)', fontSize: 12, color: segDelta <= 0 ? 'var(--foundry-text-muted)' : 'var(--foundry-ember)', minWidth: 44, textAlign: 'right' as const }}>{segDelta >= 0 ? '+' : ''}{formatTime(Math.abs(segDelta))}</div>
                : <div />
              }
              <IonButton size="small" disabled={!isActive && !isDone} onClick={() => recordSplit(i)}
                style={{ '--background': isDone ? 'var(--foundry-elevated)' : isActive ? 'var(--foundry-ember)' : 'var(--foundry-elevated)', '--color': isDone || !isActive ? 'var(--foundry-text-subtle)' : 'var(--foundry-bg)' } as React.CSSProperties}>
                {isDone ? 'Done' : isActive ? 'Split' : '—'}
              </IonButton>
            </div>
          );
        })}
        {value.simHistory.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <div style={eyebrow}>Sim History</div>
            {value.simHistory.slice(-5).reverse().map((h, hi) => (
              <div key={hi} style={card}>
                <div style={{ fontFamily: 'var(--foundry-font-display)', fontSize: 14, color: 'var(--foundry-text)', marginBottom: 4 }}>{h.date} · {h.totalTime}</div>
                <div style={{ fontFamily: 'var(--foundry-font-body)', fontSize: 12, color: 'var(--foundry-text-muted)' }}>{h.notes || 'No splits recorded.'}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: 16, maxWidth: 640, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={eyebrow}>HYROX Trainer</div>
        <div style={{ fontFamily: 'var(--foundry-font-display)', fontSize: 26, fontWeight: 700, color: 'var(--foundry-text)', letterSpacing: '-0.02em' }}>Andre · 6 ft 5 in</div>
      </div>
      <IonSegment value={tab} onIonChange={e => setTab(e.detail.value as 'workout' | 'sim')} style={{ marginBottom: 20 }}>
        <IonSegmentButton value="workout"><IonLabel>Workout</IonLabel></IonSegmentButton>
        <IonSegmentButton value="sim"><IonLabel>Sim Pacer</IonLabel></IonSegmentButton>
      </IonSegment>
      {tab === 'workout' ? renderWorkout() : renderSim()}
    </div>
  );
}
