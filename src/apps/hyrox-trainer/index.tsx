
import { useState, useCallback, useRef, useEffect } from 'react';
import { IonButton, IonSegment, IonSegmentButton, IonLabel, IonItem, IonInput, IonList } from '@ionic/react';
import { useAppData } from '@/hooks/useAppData';

// ── Types ────────────────────────────────────────────────────────
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
  blockLogs: Record<string, BlockLog[]>;
  lastWeight: string;
}

// ── Workout Data ─────────────────────────────────────────────────
type BlockDef = { id: string; name: string; detail: string; sets?: number; };
type GroupDef =
  | { type: 'single'; block: BlockDef }
  | { type: 'superset'; label: string; blocks: BlockDef[] }
  | { type: 'round'; rounds: number; deloadRounds?: number; restNote: string; blocks: BlockDef[] };

const WORKOUTS: Record<string, GroupDef[][]> = {
  BASE: [
    // MON
    [
      { type:'single', block:{ id:'base-mon-sq', name:'Front Squat', sets:4, detail:'6 reps @ 70-75% (~230 lb). Tempo 3-1-1. Rest 2:30 between sets.' }},
      { type:'single', block:{ id:'base-mon-dl', name:'Trap-Bar Deadlift', sets:4, detail:'6 reps @ 70% (~280 lb). Full reset each rep.' }},
      { type:'single', block:{ id:'base-mon-pu', name:'Weighted Pull-Up', sets:4, detail:'6 reps @ +15 lb. Controlled 3-second descent.' }},
      { type:'single', block:{ id:'base-mon-z2', name:'Z2 Run', detail:'30 min treadmill @ 1% incline. HR under 145.' }},
      { type:'single', block:{ id:'base-mon-ski', name:'SkiErg Intervals', sets:3, detail:'500m @ 2:20/500m. Rest 90s between sets.' }},
    ],
    // TUE
    [
      { type:'round', rounds:4, deloadRounds:2, restNote:'60s rest, then start next round',
        blocks:[
          { id:'base-tue-run', name:'500m Run', detail:'@ 5:18/km race pace. Straight onto the sled.' },
          { id:'base-tue-sled', name:'Sled Push 25m', detail:'@ ~75 kg. Forearms on bar, hips low, short fast steps.' },
        ]},
      { type:'single', block:{ id:'base-tue-mob', name:'Mobility Finish', detail:'10 min: couch stretch 60s/side, 90/90 hip switch, worlds greatest stretch x5/side.' }},
    ],
    // WED
    [
      { type:'single', block:{ id:'base-wed-z2', name:'Z2 Run', detail:'35 min treadmill @ 1% incline. HR 130-145.' }},
      { type:'superset', label:'Superset A — Push / Pull', blocks:[
        { id:'base-wed-bench', name:'Bench Press', sets:4, detail:'8 reps @ 185 lb.' },
        { id:'base-wed-row', name:'BB Row', sets:4, detail:'8 reps @ 165 lb. 1s hold at top.' },
      ]},
      { type:'superset', label:'Superset B — Shoulders / Rear Delt', blocks:[
        { id:'base-wed-ohp', name:'DB OHP', sets:3, detail:'10 reps @ 55 lb DBs.' },
        { id:'base-wed-fp', name:'Face Pulls', sets:3, detail:'15 reps. Light weight, quality reps.' },
      ]},
    ],
    // THU
    [
      { type:'single', block:{ id:'base-thu-wu', name:'Warm-Up Run', detail:'15 min easy Z2 before threshold work.' }},
      { type:'single', block:{ id:'base-thu-t1', name:'Threshold Interval 1', detail:'15 min @ 5:00/km. RPE 7-8.' }},
      { type:'single', block:{ id:'base-thu-rec', name:'Recovery Jog', detail:'3 min easy @ 6:30/km.' }},
      { type:'single', block:{ id:'base-thu-t2', name:'Threshold Interval 2', detail:'15 min @ 5:00/km. Match Interval 1.' }},
      { type:'single', block:{ id:'base-thu-sled', name:'Sled Push — Technique', sets:4, detail:'25m @ 100 kg. Technique only — not race pace.' }},
      { type:'single', block:{ id:'base-thu-wb', name:'Wall Balls — Technique', sets:3, detail:'25 reps @ 6 kg unbroken. Hips below knees each rep.' }},
    ],
    // FRI
    [
      { type:'single', block:{ id:'base-fri-ski', name:'SkiErg Intervals', sets:4, detail:'500m @ 2:15/500m. Rest 90s.' }},
      { type:'single', block:{ id:'base-fri-row', name:'Row Intervals', sets:4, detail:'500m @ 2:15/500m. Rest 90s. Damper 4.' }},
      { type:'single', block:{ id:'base-fri-bbj', name:'Burpee Broad Jumps', sets:4, detail:'20m. Step-up method. Target 2.0+ m per jump.' }},
      { type:'single', block:{ id:'base-fri-sb', name:'Sandbag Lunges', sets:2, detail:'50m @ 20 kg. Long step 1.0-1.1 m.' }},
    ],
    // SAT
    [
      { type:'single', block:{ id:'base-sat-z2', name:'Long Z2 Run', detail:'70 min treadmill/track @ 1-2% incline. HR under 148.' }},
      { type:'single', block:{ id:'base-sat-ins', name:'HYROX-Pace Inserts', sets:4, detail:'2 min @ 5:18/km in the final 20 min.' }},
    ],
    // SUN
    [
      { type:'single', block:{ id:'base-sun-rest', name:'Full Rest', detail:'No training. Foam roll 10-15 min. 20 min walk optional.' }},
    ],
  ],
  BUILD: [
    // MON
    [
      { type:'single', block:{ id:'build-mon-sq', name:'Front Squat', sets:5, detail:'3 reps @ 85% (~245 lb). Rest 3:00.' }},
      { type:'single', block:{ id:'build-mon-dl', name:'Trap-Bar Deadlift', sets:4, detail:'4 reps @ 335 lb. Reset grip each rep.' }},
      { type:'single', block:{ id:'build-mon-pu', name:'Weighted Pull-Up', sets:4, detail:'5 reps @ +25 lb. Dead hang start.' }},
      { type:'single', block:{ id:'build-mon-pp', name:'Push Press', sets:4, detail:'4 reps @ 155 lb.' }},
      { type:'single', block:{ id:'build-mon-vo2', name:'VO2max Interval — 4 min', sets:5, detail:'4 min @ 4:30/km. RPE 9. Rest 3 min walk-jog.' }},
    ],
    // TUE
    [
      { type:'round', rounds:4, deloadRounds:2, restNote:'60s rest — then straight into Round',
        blocks:[
          { id:'build-tue-run1', name:'500m Run', detail:'@ race pace. Straight into lunges.' },
          { id:'build-tue-lunge', name:'Walking Lunges 30m', detail:'@ 20 kg sandbag. Straight into second run.' },
          { id:'build-tue-run2', name:'500m Run (2nd)', detail:'@ race pace. Straight into farmers carry.' },
          { id:'build-tue-carry', name:'Farmers Carry 100m', detail:'@ 2x24 kg. End of round.' },
        ]},
    ],
    // WED
    [
      { type:'single', block:{ id:'build-wed-z2', name:'Z2 Run', detail:'30 min treadmill @ 1% incline.' }},
      { type:'superset', label:'Superset A — Push / Pull', blocks:[
        { id:'build-wed-bench', name:'Bench Press', sets:4, detail:'8 reps @ 195 lb.' },
        { id:'build-wed-row', name:'BB Row', sets:4, detail:'8 reps @ 165 lb.' },
      ]},
      { type:'single', block:{ id:'build-wed-bss', name:'Bulgarian Split Squat', sets:3, detail:'8 reps per side @ 60 lb DBs.' }},
      { type:'single', block:{ id:'build-wed-hlr', name:'Hanging Leg Raise', sets:3, detail:'12 reps. Controlled. No swing.' }},
    ],
    // THU
    [
      { type:'single', block:{ id:'build-thu-wu', name:'Warm-Up', detail:'15 min easy Z2 jog.' }},
      { type:'single', block:{ id:'build-thu-t1', name:'Threshold Interval 1', detail:'15 min @ 5:00/km. RPE 7-8.' }},
      { type:'single', block:{ id:'build-thu-rec', name:'Recovery Jog', detail:'3 min easy @ 6:30/km.' }},
      { type:'single', block:{ id:'build-thu-t2', name:'Threshold Interval 2', detail:'15 min @ 5:00/km.' }},
      { type:'single', block:{ id:'build-thu-slp', name:'Sled Pull', sets:4, detail:'25m @ 103 kg. Deadlift stance, hip-snap.' }},
      { type:'single', block:{ id:'build-thu-wb', name:'Wall Balls', sets:3, detail:'25 reps @ 6 kg unbroken.' }},
    ],
    // FRI — Half Sim
    [
      { type:'single', block:{ id:'build-fri-r1', name:'Run 1 — 1 km', detail:'@ race pace. Straight into SkiErg.' }},
      { type:'single', block:{ id:'build-fri-ski', name:'SkiErg — 1000m', detail:'@ race target. Straight into Run 2.' }},
      { type:'single', block:{ id:'build-fri-r2', name:'Run 2 — 1 km', detail:'@ race pace. Straight into Sled Push.' }},
      { type:'single', block:{ id:'build-fri-sled', name:'Sled Push — 50m', detail:'@ 152 kg. Straight into Run 3.' }},
      { type:'single', block:{ id:'build-fri-r3', name:'Run 3 — 1 km', detail:'@ race pace. Straight into Sled Pull.' }},
      { type:'single', block:{ id:'build-fri-slp', name:'Sled Pull — 50m', detail:'@ 103 kg. Straight into Run 4.' }},
      { type:'single', block:{ id:'build-fri-r4', name:'Run 4 — 1 km', detail:'@ race pace. Straight into BBJ.' }},
      { type:'single', block:{ id:'build-fri-bbj', name:'Burpee Broad Jumps — 80m', detail:'Step-up method. Chunk 4x20m. Target: sub-40 min total.' }},
    ],
    // SAT
    [
      { type:'single', block:{ id:'build-sat-z2', name:'Long Z2/3 Run', detail:'75 min. Mostly Z2, last 30 min introduce some Z3.' }},
      { type:'single', block:{ id:'build-sat-ins', name:'HYROX-Pace Inserts', sets:4, detail:'3 min @ 5:18/km in last 30 min.' }},
    ],
    // SUN
    [
      { type:'single', block:{ id:'build-sun-rest', name:'Full Rest', detail:'Full rest. HRV check.' }},
    ],
  ],
  PEAK: [
    // MON
    [
      { type:'single', block:{ id:'peak-mon-sq', name:'Squat', sets:3, detail:'3 reps @ 80% (~260 lb). Maintenance.' }},
      { type:'single', block:{ id:'peak-mon-dl', name:'Deadlift', sets:3, detail:'3 reps @ 80% (~320 lb).' }},
      { type:'single', block:{ id:'peak-mon-bench', name:'Bench', sets:3, detail:'5 reps @ 75% (~185 lb).' }},
      { type:'single', block:{ id:'peak-mon-vo2', name:'VO2max Interval — 4 min', sets:5, detail:'4 min @ 4:30/km. Rest 3 min. RPE 9.' }},
    ],
    // TUE
    [
      { type:'round', rounds:4, restNote:'60s rest — then straight into Round',
        blocks:[
          { id:'peak-tue-run1', name:'500m Run', detail:'@ race pace. Straight into lunges.' },
          { id:'peak-tue-lunge', name:'Walking Lunges 30m', detail:'@ 20 kg sandbag.' },
          { id:'peak-tue-run2', name:'500m Run (2nd)', detail:'@ race pace.' },
          { id:'peak-tue-carry', name:'Farmers Carry 100m', detail:'@ 2x24 kg.' },
        ]},
    ],
    // WED — Keystone
    [
      { type:'single', block:{ id:'peak-wed-wu', name:'Warm-Up + Drills', detail:'15 min easy Z2 + A-skips, high knees, 2 build strides.' }},
      { type:'single', block:{ id:'peak-wed-1k', name:'Keystone — 1000m @ Race Pace', sets:6, detail:'1000m @ 4:50/km. REST: 90s standing between sets.' }},
      { type:'superset', label:'Light Upper', blocks:[
        { id:'peak-wed-pu', name:'Pull-Ups', sets:3, detail:'6 reps bodyweight.' },
        { id:'peak-wed-pp', name:'Push Press', sets:3, detail:'5 reps @ 135 lb.' },
        { id:'peak-wed-fp', name:'Face Pulls', sets:3, detail:'15 reps.' },
      ]},
    ],
    // THU
    [
      { type:'single', block:{ id:'peak-thu-wu', name:'Warm-Up', detail:'15 min easy Z2.' }},
      { type:'single', block:{ id:'peak-thu-t1', name:'Threshold Interval 1', detail:'15 min @ 5:00/km.' }},
      { type:'single', block:{ id:'peak-thu-rec', name:'Recovery Jog', detail:'3 min easy.' }},
      { type:'single', block:{ id:'peak-thu-t2', name:'Threshold Interval 2', detail:'15 min @ 5:00/km.' }},
      { type:'single', block:{ id:'peak-thu-sled', name:'Sled Push', sets:4, detail:'25m @ 152 kg. Race-pace efforts.' }},
      { type:'single', block:{ id:'peak-thu-sb', name:'Sandbag Lunges', sets:2, detail:'100m @ 20 kg. Attack the distance.' }},
    ],
    // FRI
    [
      { type:'single', block:{ id:'peak-fri-r1', name:'Run 1 — 1 km', detail:'@ race pace. Straight into SkiErg.' }},
      { type:'single', block:{ id:'peak-fri-ski', name:'SkiErg — 1000m', detail:'@ race target.' }},
      { type:'single', block:{ id:'peak-fri-r2', name:'Run 2 — 1 km', detail:'@ race pace.' }},
      { type:'single', block:{ id:'peak-fri-sled', name:'Sled Push — 50m', detail:'@ 152 kg.' }},
      { type:'single', block:{ id:'peak-fri-r3', name:'Run 3 — 1 km', detail:'@ race pace.' }},
      { type:'single', block:{ id:'peak-fri-slp', name:'Sled Pull — 50m', detail:'@ 103 kg.' }},
      { type:'single', block:{ id:'peak-fri-r4', name:'Run 4 — 1 km', detail:'@ race pace.' }},
      { type:'single', block:{ id:'peak-fri-bbj', name:'Burpee BJ — 80m', detail:'Step-up method. Target: sub-40 min.' }},
    ],
    // SAT
    [
      { type:'single', block:{ id:'peak-sat-z2', name:'Long Run', detail:'70 min Z2 with pace inserts in last 25 min.' }},
      { type:'single', block:{ id:'peak-sat-ins', name:'HYROX-Pace Inserts', sets:5, detail:'2 min @ 5:18/km in last 25 min.' }},
    ],
    // SUN
    [
      { type:'single', block:{ id:'peak-sun-rest', name:'Full Rest', detail:'Full rest. HRV check. Sleep 8-9 hrs.' }},
    ],
  ],
  TAPER: [
    // MON
    [
      { type:'single', block:{ id:'taper-mon-sq', name:'Squat', sets:3, detail:'3 reps @ 60% (~195 lb). Feel only.' }},
      { type:'single', block:{ id:'taper-mon-dl', name:'Deadlift', sets:3, detail:'3 reps @ 60% (~240 lb).' }},
      { type:'single', block:{ id:'taper-mon-bench', name:'Bench', sets:3, detail:'5 reps @ 65% (~160 lb).' }},
      { type:'single', block:{ id:'taper-mon-sled', name:'Sled Push — Technique', sets:4, detail:'12.5m @ race weight. 80% effort. Motor pattern only.' }},
    ],
    // TUE
    [
      { type:'round', rounds:3, restNote:'90s rest — then next round',
        blocks:[
          { id:'taper-tue-run', name:'400m Run', detail:'@ race pace. Straight into sled.' },
          { id:'taper-tue-sled', name:'Sled Push 50m', detail:'@ 80% race weight (~120 kg). Straight into row.' },
          { id:'taper-tue-row', name:'Row 200m', detail:'@ moderate effort. End of round.' },
        ]},
    ],
    // WED
    [
      { type:'single', block:{ id:'taper-wed-z2', name:'Easy Z2 Run', detail:'25 min easy Z2. HR under 135.' }},
    ],
    // THU
    [
      { type:'single', block:{ id:'taper-thu-sim', name:'3-Station Light Sim', detail:'3 stations @ 70% effort, race weight, conservative pace. ~25 min total.' }},
    ],
    // FRI
    [
      { type:'single', block:{ id:'taper-fri-z2', name:'Easy Z2', detail:'30 min. HR under 140.' }},
    ],
    // SAT
    [
      { type:'single', block:{ id:'taper-sat-z2', name:'Z2 Run', detail:'45 min Z2. Comfortable.' }},
      { type:'single', block:{ id:'taper-sat-ins', name:'HYROX-Pace Strides', sets:3, detail:'2 min @ 5:18/km in final 15 min.' }},
    ],
    // SUN
    [
      { type:'single', block:{ id:'taper-sun-rest', name:'Full Rest', detail:'Full rest. Begin 5-day hydration ramp: +500 ml water + sodium.' }},
    ],
  ],
};

const DELOAD_OVERRIDES: Record<string, string> = {
  'base-mon-ski': 'Deload — 2x500m easy @ 2:30/500m only.',
  'base-thu-t2': 'Deload — skip second interval. 1x12 min @ 5:00/km only.',
  'base-sat-ins': 'Deload — skip pace inserts.',
  'build-mon-vo2': 'Deload — 3x4 min @ 4:40/km only.',
  'build-sat-ins': 'Deload — skip pace inserts.',
};

const DELOAD_WEEKS = [4, 7, 11, 14];

const SIM_SEGMENTS = [
  { name:'Run 1',         type:'run',     target:285, note:'1 km — restraint' },
  { name:'SkiErg',        type:'station', target:325, note:'1000m — hip-hinge, damper 5' },
  { name:'Run 2',         type:'run',     target:310, note:'1 km — arms cooked' },
  { name:'Sled Push',     type:'station', target:250, note:'50m @ 152 kg' },
  { name:'Run 3',         type:'run',     target:315, note:'1 km — short steps' },
  { name:'Sled Pull',     type:'station', target:340, note:'50m @ 103 kg' },
  { name:'Run 4',         type:'run',     target:320, note:'1 km — settle HR' },
  { name:'Burpee BJ',     type:'station', target:340, note:'80m — chunk 4x20m' },
  { name:'Run 5',         type:'run',     target:325, note:'1 km — biggest spike' },
  { name:'Row',           type:'station', target:330, note:'1000m — damper 4' },
  { name:'Run 6',         type:'run',     target:325, note:'1 km — legs fresh' },
  { name:'Farmers Carry', type:'station', target:190, note:'200m @ 2x24 kg' },
  { name:'Run 7',         type:'run',     target:330, note:'1 km — grip shot' },
  { name:'Sandbag Lunges',type:'station', target:340, note:'100m @ 20 kg — attack' },
  { name:'Run 8',         type:'run',     target:340, note:'1 km — survive 600m, empty last 400m' },
  { name:'Wall Balls',    type:'station', target:435, note:'100 reps @ 6 kg — 30/25/20/15/10' },
];

const DAY_NAMES = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const SESSION_TITLES: Record<string, string[]> = {
  BASE:  ['Heavy Lower + Engine','Compromised Brick','Z2 + Upper Strength','Threshold + Station Skill','Station Skill + Mixed Modal','Long Run','Rest'],
  BUILD: ['Strength + VO2max','Compromised Race Brick','Z2 + Upper Strength','Threshold + Stations','Half Sim','Long Run + HYROX Pace','Rest'],
  PEAK:  ['Maintenance Strength + VO2','Race-Specific Brick','Keystone 6x1000m','Threshold + Stations','Full / Half Sim','Long Run + HYROX Pace','Rest'],
  TAPER: ['Technique @ 80%','Light Brick','Easy Shakeout','Light Half Sim','Easy Z2','Short Long Run','Rest + Carb Load'],
};

function getCurrentWeek(): number {
  return Math.min(Math.max(Math.floor((Date.now() - new Date('2025-05-01').getTime()) / (7 * 864e5)) + 1, 1), 20);
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

const INITIAL_STATE: AppState = {
  workoutLogs: [],
  simHistory: [],
  blockLogs: {},
  lastWeight: '',
};

export default function HyroxTrainer() {
  const WEEK = getCurrentWeek();
  const PHASE = getPhase(WEEK);
  const DELOAD = DELOAD_WEEKS.includes(WEEK);

  const { value: stored, setValue: setStored, ready } = useAppData<AppState>('hyrox-trainer', 'state', INITIAL_STATE);

  const [tab, setTab] = useState<'workout'|'sim'>('workout');
  const [selectedDay, setSelectedDay] = useState<number>(() => {
    const d = new Date().getDay(); return d === 0 ? 6 : d - 1;
  });
  const [sessionLogs, setSessionLogs] = useState<Record<string, BlockLog[]>>({});
  const [rpe, setRpe] = useState<number | null>(null);
  const [weight, setWeight] = useState<string>('');
  const [roundsDone, setRoundsDone] = useState<Record<string, boolean>>({});
  const [timers, setTimers] = useState<Record<string, number>>({});
  const [runningTimers, setRunningTimers] = useState<Record<string, boolean>>({});
  const timerRefs = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  // Sim state
  const [simRunning, setSimRunning] = useState(false);
  const [simStarted, setSimStarted] = useState(false);
  const [simSeconds, setSimSeconds] = useState(0);
  const [simSegIdx, setSimSegIdx] = useState(0);
  const [simSegStart, setSimSegStart] = useState(0);
  const [simSplits, setSimSplits] = useState<SimSplit[]>([]);
  const simRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (ready && stored.lastWeight) setWeight(stored.lastWeight);
  }, [ready]);

  const saveState = useCallback((updates: Partial<AppState>) => {
    setStored({ ...stored, ...updates });
  }, [stored, setStored]);

  // ── Timer helpers ─────────────────────────────────────────────
  const toggleTimer = useCallback((id: string) => {
    if (runningTimers[id]) {
      clearInterval(timerRefs.current[id]);
      setRunningTimers(r => ({ ...r, [id]: false }));
    } else if ((timers[id] || 0) > 0) {
      setTimers(t => ({ ...t, [id]: 0 }));
    } else {
      timerRefs.current[id] = setInterval(() => {
        setTimers(t => ({ ...t, [id]: (t[id] || 0) + 1 }));
      }, 1000);
      setRunningTimers(r => ({ ...r, [id]: true }));
    }
  }, [timers, runningTimers]);

  // ── Block log helpers ─────────────────────────────────────────
  const logInputRefs = useRef<Record<string, { val: HTMLInputElement | null; note: HTMLInputElement | null }>>({});
  const saveBlockLog = useCallback((id: string) => {
    const refs = logInputRefs.current[id];
    if (!refs) return;
    const val = refs.val?.value?.trim() || '';
    if (!val) return;
    const note = refs.note?.value?.trim() || '';
    const entry: BlockLog = { val, note, ts: Date.now() };
    setSessionLogs(prev => ({ ...prev, [id]: [...(prev[id] || []), entry] }));
    if (refs.val) refs.val.value = '';
    if (refs.note) refs.note.value = '';
  }, []);

  const deleteBlockLog = useCallback((id: string, idx: number) => {
    setSessionLogs(prev => {
      const updated = [...(prev[id] || [])];
      updated.splice(idx, 1);
      return { ...prev, [id]: updated };
    });
  }, []);

  // ── Session save ──────────────────────────────────────────────
  const saveSession = useCallback(() => {
    const notes = Object.entries(sessionLogs)
      .filter(([, logs]) => logs.length > 0)
      .map(([id, logs]) => `${id}: ${logs.map(l => (l.note ? `${l.note}: ` : '') + l.val).join(', ')}`)
      .join(' | ');
    const record: SessionRecord = {
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      week: WEEK, phase: PHASE, dayIdx: selectedDay,
      rpe, weight, notes,
    };
    const updated = [...stored.workoutLogs, record];
    saveState({ workoutLogs: updated, lastWeight: weight });
    setSessionLogs({});
    setRpe(null);
    setRoundsDone({});
  }, [sessionLogs, rpe, weight, stored, saveState, WEEK, PHASE, selectedDay]);

  // ── Sim helpers ───────────────────────────────────────────────
  const simStart = useCallback(() => {
    setSimStarted(true);
    setSimRunning(true);
    simRef.current = setInterval(() => setSimSeconds(s => s + 1), 1000);
  }, []);

  const simPause = useCallback(() => {
    if (simRef.current) clearInterval(simRef.current);
    setSimRunning(false);
  }, []);

  const simResume = useCallback(() => {
    setSimRunning(true);
    simRef.current = setInterval(() => setSimSeconds(s => s + 1), 1000);
  }, []);

  const simReset = useCallback(() => {
    if (simRef.current) clearInterval(simRef.current);
    setSimRunning(false);
    setSimStarted(false);
    setSimSeconds(0);
    setSimSegIdx(0);
    setSimSegStart(0);
    setSimSplits([]);
  }, []);

  const recordSplit = useCallback((idx: number) => {
    if (!simRunning) return;
    setSimSplits(prev => [...prev, { idx, seconds: simSeconds - simSegStart, total: simSeconds }]);
    setSimSegStart(simSeconds);
    setSimSegIdx(idx + 1);
  }, [simRunning, simSeconds, simSegStart]);

  const saveSim = useCallback(() => {
    const notes = simSplits.map(sp => {
      const seg = SIM_SEGMENTS[sp.idx];
      const d = sp.seconds - seg.target;
      return `${seg.name}: ${formatTime(sp.seconds)} (${d >= 0 ? '+' : ''}${formatTime(Math.abs(d))})`;
    }).join(' | ');
    const record: SimRecord = {
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      week: WEEK,
      totalTime: formatTime(simSeconds),
      notes,
    };
    saveState({ simHistory: [...stored.simHistory, record] });
    simReset();
  }, [simSplits, simSeconds, stored, saveState, WEEK, simReset]);

  if (!ready) return null;

  // ── Render helpers ────────────────────────────────────────────
  const renderBlockItem = (b: BlockDef, setLabel?: string, showDetail = true) => {
    const id = b.id + (setLabel ? `-${setLabel.replace(' ','').toLowerCase()}` : '');
    const rawId = b.id;
    const detailText = DELOAD && DELOAD_OVERRIDES[rawId] ? DELOAD_OVERRIDES[rawId] : b.detail;
    const isDeloadOverride = DELOAD && DELOAD_OVERRIDES[rawId];
    const logs = sessionLogs[id] || [];
    const t = timers[id] || 0;
    const running = runningTimers[id] || false;
    if (!logInputRefs.current[id]) logInputRefs.current[id] = { val: null, note: null };

    return (
      <div key={id} style={{ borderBottom: '1px solid var(--foundry-border)', paddingBottom: 12, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--foundry-font-display)', fontSize: 16, color: 'var(--foundry-text)', fontWeight: 600 }}>{b.name}</span>
            {setLabel && (
              <span style={{ fontFamily: 'var(--foundry-font-mono)', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--foundry-text-subtle)', background: 'var(--foundry-elevated)', padding: '2px 6px', borderRadius: 'var(--foundry-radius-sm)' }}>{setLabel}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {t > 0 && <span style={{ fontFamily: 'var(--foundry-font-mono)', fontSize: 12, color: 'var(--foundry-ember)' }}>{formatTime(t)}</span>}
            <IonButton fill="outline" size="small" onClick={() => toggleTimer(id)}
              style={{ '--color': running ? 'var(--foundry-ember)' : 'var(--foundry-text-muted)', '--border-color': running ? 'var(--foundry-ember)' : 'var(--foundry-border)', fontSize: 11 } as React.CSSProperties}>
              {running ? 'Stop' : t > 0 ? 'Reset' : 'Start'}
            </IonButton>
          </div>
        </div>
        {showDetail && detailText && (
          <p style={{ fontFamily: 'var(--foundry-font-body)', fontSize: 13, color: isDeloadOverride ? 'var(--foundry-ember)' : 'var(--foundry-text-muted)', marginBottom: 8, lineHeight: 1.5 }}>
            {isDeloadOverride ? 'Deload — ' : ''}{detailText}
          </p>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 6, marginBottom: 4 }}>
          <input ref={el => { if (logInputRefs.current[id]) logInputRefs.current[id].val = el; }}
            placeholder="Wt / reps / time"
            style={{ background: 'var(--foundry-bg)', border: '1px solid var(--foundry-border)', borderRadius: 'var(--foundry-radius-sm)', padding: '6px 8px', color: 'var(--foundry-text)', fontFamily: 'var(--foundry-font-body)', fontSize: 13, width: '100%' }} />
          <input ref={el => { if (logInputRefs.current[id]) logInputRefs.current[id].note = el; }}
            placeholder="Note"
            style={{ background: 'var(--foundry-bg)', border: '1px solid var(--foundry-border)', borderRadius: 'var(--foundry-radius-sm)', padding: '6px 8px', color: 'var(--foundry-text)', fontFamily: 'var(--foundry-font-body)', fontSize: 13, width: '100%' }} />
          <IonButton size="small" onClick={() => saveBlockLog(id)}
            style={{ '--background': 'var(--foundry-ember)', '--color': 'var(--foundry-bg)', fontSize: 12 } as React.CSSProperties}>
            Log
          </IonButton>
        </div>
        {logs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {logs.map((l, li) => (
              <div key={li} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--foundry-font-body)', fontSize: 12, color: 'var(--foundry-text-muted)' }}>
                <span>{l.note ? <strong style={{ color: 'var(--foundry-text)' }}>{l.note}: </strong> : null}{l.val}</span>
                <button onClick={() => deleteBlockLog(id, li)} style={{ background: 'none', border: 'none', color: 'var(--foundry-text-subtle)', cursor: 'pointer', fontSize: 13 }}>x</button>
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
      if (sets === 1) return <div key={gi}>{renderBlockItem(g.block)}</div>;
      return (
        <div key={gi}>
          {Array.from({ length: sets }, (_, i) => renderBlockItem(g.block, `Set ${i + 1}`, i === 0))}
        </div>
      );
    }
    if (g.type === 'superset') {
      return (
        <div key={gi} style={{ border: '1px solid var(--foundry-border)', borderRadius: 'var(--foundry-radius-md)', marginBottom: 12, overflow: 'hidden' }}>
          <div style={{ background: 'var(--foundry-elevated)', padding: '6px 12px', fontFamily: 'var(--foundry-font-mono)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--foundry-text-subtle)' }}>
            {g.label}
          </div>
          <div style={{ padding: '12px 12px 0' }}>
            {g.blocks.map(b => {
              const sets = b.sets || 1;
              if (sets === 1) return renderBlockItem(b);
              return Array.from({ length: sets }, (_, i) => renderBlockItem(b, `Set ${i + 1}`, i === 0));
            })}
          </div>
        </div>
      );
    }
    if (g.type === 'round') {
      const totalRounds = DELOAD && g.deloadRounds ? g.deloadRounds : g.rounds;
      return (
        <div key={gi} style={{ marginBottom: 12 }}>
          {Array.from({ length: totalRounds }, (_, r) => {
            const key = `${PHASE}-${selectedDay}-${gi}-r${r}`;
            const done = roundsDone[key] || false;
            return (
              <div key={r} style={{ border: `1px solid ${done ? 'var(--foundry-border)' : 'var(--foundry-ember-dim)'}`, borderRadius: 'var(--foundry-radius-md)', marginBottom: 8, overflow: 'hidden' }}>
                <div style={{ background: done ? 'var(--foundry-elevated)' : 'var(--foundry-card)', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontFamily: 'var(--foundry-font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: done ? 'var(--foundry-text-subtle)' : 'var(--foundry-ember)' }}>
                      Round {r + 1} of {totalRounds}
                    </span>
                    <span style={{ fontFamily: 'var(--foundry-font-body)', fontSize: 12, color: 'var(--foundry-text-subtle)', marginLeft: 8 }}>
                      {g.blocks.map(b => b.name).join(' — ')}
                    </span>
                  </div>
                  <IonButton fill="outline" size="small"
                    onClick={() => setRoundsDone(prev => ({ ...prev, [key]: !prev[key] }))}
                    style={{ '--color': done ? 'var(--foundry-text-subtle)' : 'var(--foundry-ember)', '--border-color': done ? 'var(--foundry-border)' : 'var(--foundry-ember)', fontSize: 11 } as React.CSSProperties}>
                    {done ? 'Done' : 'Mark done'}
                  </IonButton>
                </div>
                {!done && (
                  <div style={{ padding: '12px 12px 0' }}>
                    {g.blocks.map(b => renderBlockItem(b, undefined, true))}
                  </div>
                )}
                {r < totalRounds - 1 && (
                  <div style={{ padding: '6px 12px', borderTop: '1px solid var(--foundry-border)', fontFamily: 'var(--foundry-font-body)', fontSize: 12, color: 'var(--foundry-text-subtle)' }}>
                    {g.restNote} {r + 2}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  // ── Workout tab ───────────────────────────────────────────────
  const renderWorkout = () => {
    const groups = WORKOUTS[PHASE][selectedDay];
    const todayLogs = stored.workoutLogs.filter(l => l.dayIdx === selectedDay).slice(-3).reverse();

    return (
      <div>
        {/* Day selector */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 16 }}>
          {DAY_NAMES.map((d, i) => (
            <button key={i} onClick={() => { setSelectedDay(i); setSessionLogs({}); setRoundsDone({}); }}
              style={{ padding: '8px 2px', border: `1px solid ${i === selectedDay ? 'var(--foundry-ember)' : 'var(--foundry-border)'}`, background: i === selectedDay ? 'transparent' : 'transparent', color: i === selectedDay ? 'var(--foundry-ember)' : 'var(--foundry-text-muted)', fontFamily: 'var(--foundry-font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 'var(--foundry-radius-sm)', textAlign: 'center' }}>
              {d}
            </button>
          ))}
        </div>

        {/* Session header */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--foundry-font-mono)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--foundry-text-subtle)', marginBottom: 4 }}>
            W{WEEK} · {PHASE}{DELOAD ? ' · Deload' : ''}
          </div>
          <div style={{ fontFamily: 'var(--foundry-font-display)', fontSize: 20, fontWeight: 600, color: 'var(--foundry-text)' }}>
            {SESSION_TITLES[PHASE][selectedDay]}
          </div>
        </div>

        {/* Blocks */}
        <div style={{ background: 'var(--foundry-card)', border: '1px solid var(--foundry-border)', borderRadius: 'var(--foundry-radius-md)', padding: 16, marginBottom: 16 }}>
          {groups.map((g, gi) => renderGroup(g, gi))}
        </div>

        {/* Session footer */}
        <div style={{ background: 'var(--foundry-card)', border: '1px solid var(--foundry-border)', borderRadius: 'var(--foundry-radius-md)', padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: 'var(--foundry-font-mono)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--foundry-text-subtle)', marginBottom: 8 }}>RPE</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {[6,7,8,9,10].map(r => (
                  <button key={r} onClick={() => setRpe(r)}
                    style={{ flex: 1, padding: '6px 2px', border: `1px solid ${rpe === r ? 'var(--foundry-ember)' : 'var(--foundry-border)'}`, background: rpe === r ? 'var(--foundry-ember)' : 'transparent', color: rpe === r ? 'var(--foundry-bg)' : 'var(--foundry-text-muted)', fontFamily: 'var(--foundry-font-mono)', fontSize: 13, cursor: 'pointer', borderRadius: 'var(--foundry-radius-sm)', textAlign: 'center' }}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--foundry-font-mono)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--foundry-text-subtle)', marginBottom: 8 }}>Bodyweight (lb)</div>
              <input value={weight} onChange={e => setWeight(e.target.value)} placeholder="e.g. 218"
                style={{ background: 'var(--foundry-bg)', border: '1px solid var(--foundry-border)', borderRadius: 'var(--foundry-radius-sm)', padding: '6px 8px', color: 'var(--foundry-text)', fontFamily: 'var(--foundry-font-body)', fontSize: 13, width: '100%' }} />
            </div>
          </div>
          <IonButton expand="block" onClick={saveSession}
            style={{ '--background': 'var(--foundry-ember)', '--color': 'var(--foundry-bg)', fontFamily: 'var(--foundry-font-mono)', letterSpacing: '0.12em' } as React.CSSProperties}>
            Save Session
          </IonButton>
        </div>

        {/* History */}
        {todayLogs.length > 0 && (
          <div>
            <div style={{ fontFamily: 'var(--foundry-font-mono)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--foundry-text-subtle)', marginBottom: 8 }}>
              Past Sessions — {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][selectedDay]}
            </div>
            {todayLogs.map((l, li) => (
              <div key={li} style={{ background: 'var(--foundry-card)', border: '1px solid var(--foundry-border)', borderRadius: 'var(--foundry-radius-md)', padding: 12, marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--foundry-font-display)', fontSize: 14, color: 'var(--foundry-text)', marginBottom: 4 }}>
                  <span>{l.date} · W{l.week}</span>
                </div>
                <div style={{ fontFamily: 'var(--foundry-font-body)', fontSize: 13, color: 'var(--foundry-text-muted)' }}>
                  RPE {l.rpe || '—'} · {l.weight || '—'} lb{l.notes ? ` · ${l.notes}` : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ── Sim tab ───────────────────────────────────────────────────
  const renderSim = () => {
    const deltaTarget = SIM_SEGMENTS.slice(0, simSplits.length).reduce((a, s) => a + s.target, 0);
    const delta = simStarted && simSplits.length > 0 ? simSeconds - deltaTarget : null;

    return (
      <div>
        <div style={{ background: 'var(--foundry-card)', border: '1px solid var(--foundry-border)', borderRadius: 'var(--foundry-radius-md)', padding: 20, marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--foundry-font-mono)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--foundry-text-subtle)', marginBottom: 4 }}>
            Sim Pacer — Sub 1:25
          </div>
          <div style={{ fontFamily: 'var(--foundry-font-display)', fontSize: 52, fontWeight: 700, letterSpacing: '-0.02em', color: simRunning ? 'var(--foundry-ember)' : 'var(--foundry-text)', lineHeight: 1, marginBottom: 4 }}>
            {formatTime(simSeconds)}
          </div>
          {delta !== null && (
            <div style={{ fontFamily: 'var(--foundry-font-body)', fontSize: 13, color: delta <= 0 ? 'var(--foundry-text-muted)' : 'var(--foundry-ember)', marginBottom: 12 }}>
              {delta <= 0 ? `${formatTime(Math.abs(delta))} ahead of pace` : `${formatTime(delta)} behind pace`}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            {!simStarted
              ? <IonButton onClick={simStart} style={{ '--background': 'var(--foundry-ember)', '--color': 'var(--foundry-bg)' } as React.CSSProperties}>Start</IonButton>
              : simRunning
                ? <IonButton onClick={simPause} style={{ '--background': 'var(--foundry-border)', '--color': 'var(--foundry-text)' } as React.CSSProperties}>Pause</IonButton>
                : <IonButton onClick={simResume} style={{ '--background': 'var(--foundry-ember)', '--color': 'var(--foundry-bg)' } as React.CSSProperties}>Resume</IonButton>
            }
            <IonButton fill="outline" onClick={simReset} style={{ '--color': 'var(--foundry-text-muted)', '--border-color': 'var(--foundry-border)' } as React.CSSProperties}>Reset</IonButton>
            {!simRunning && simSplits.length > 0 && (
              <IonButton fill="outline" onClick={saveSim} style={{ '--color': 'var(--foundry-ember)', '--border-color': 'var(--foundry-ember)' } as React.CSSProperties}>Save</IonButton>
            )}
          </div>
        </div>

        {SIM_SEGMENTS.map((seg, i) => {
          const isDone = simSplits.some(sp => sp.idx === i);
          const isActive = !isDone && simSegIdx === i && simStarted;
          const split = simSplits.find(sp => sp.idx === i);
          const segDelta = split ? split.seconds - seg.target : null;

          return (
            <div key={i} style={{ background: 'var(--foundry-card)', border: `1px solid ${isActive ? 'var(--foundry-ember)' : isDone ? 'var(--foundry-border)' : 'var(--foundry-border)'}`, borderRadius: 'var(--foundry-radius-md)', padding: '10px 12px', marginBottom: 6, display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 8, alignItems: 'center', opacity: isDone ? 0.6 : 1 }}>
              <div>
                <div style={{ fontFamily: 'var(--foundry-font-display)', fontSize: 15, fontWeight: 600, color: seg.type === 'run' ? 'var(--foundry-text)' : 'var(--foundry-ember)', marginBottom: 2 }}>{seg.name}</div>
                <div style={{ fontFamily: 'var(--foundry-font-body)', fontSize: 11, color: 'var(--foundry-text-subtle)' }}>{formatTime(seg.target)} · {seg.note}</div>
              </div>
              <div style={{ fontFamily: 'var(--foundry-font-mono)', fontSize: 14, color: 'var(--foundry-text)', minWidth: 48, textAlign: 'right' }}>
                {split ? formatTime(split.seconds) : ''}
              </div>
              {segDelta !== null && (
                <div style={{ fontFamily: 'var(--foundry-font-mono)', fontSize: 12, color: segDelta <= 0 ? 'var(--foundry-text-muted)' : 'var(--foundry-ember)', minWidth: 44, textAlign: 'right' }}>
                  {segDelta >= 0 ? '+' : ''}{formatTime(Math.abs(segDelta))}
                </div>
              )}
              <IonButton size="small" disabled={!isActive && !isDone} onClick={() => recordSplit(i)}
                style={{ '--background': isDone ? 'var(--foundry-elevated)' : isActive ? 'var(--foundry-ember)' : 'var(--foundry-elevated)', '--color': isDone ? 'var(--foundry-text-subtle)' : isActive ? 'var(--foundry-bg)' : 'var(--foundry-text-subtle)', fontSize: 11 } as React.CSSProperties}>
                {isDone ? 'Done' : isActive ? 'Split' : '—'}
              </IonButton>
            </div>
          );
        })}

        {stored.simHistory.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <div style={{ fontFamily: 'var(--foundry-font-mono)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--foundry-text-subtle)', marginBottom: 8 }}>Sim History</div>
            {stored.simHistory.slice(-5).reverse().map((h, hi) => (
              <div key={hi} style={{ background: 'var(--foundry-card)', border: '1px solid var(--foundry-border)', borderRadius: 'var(--foundry-radius-md)', padding: 12, marginBottom: 8 }}>
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
        <div style={{ fontFamily: 'var(--foundry-font-mono)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--foundry-text-subtle)', marginBottom: 4 }}>HYROX Trainer</div>
        <div style={{ fontFamily: 'var(--foundry-font-display)', fontSize: 28, fontWeight: 700, color: 'var(--foundry-text)', letterSpacing: '-0.02em' }}>Andre · 6 ft 5 in</div>
      </div>

      <IonSegment value={tab} onIonChange={e => setTab(e.detail.value as 'workout'|'sim')} style={{ marginBottom: 20 }}>
        <IonSegmentButton value="workout"><IonLabel>Workout</IonLabel></IonSegmentButton>
        <IonSegmentButton value="sim"><IonLabel>Sim Pacer</IonLabel></IonSegmentButton>
      </IonSegment>

      {tab === 'workout' ? renderWorkout() : renderSim()}
    </div>
  );
}
