import { useState } from 'react';

interface Breakfast { day: string; name: string; items: string[]; note: string; }
interface Lunch { day: string; name: string; items: string[]; note: string; }
interface Dinner { id: number; day: string; name: string; tag: string; protein: string; note: string; ingredients: string[]; steps: string[]; }

const breakfasts: Breakfast[] = [
  { day: 'Monday', name: 'Mush', items: ['Mush'], note: 'Ready to eat, no prep needed.' },
  { day: 'Tuesday', name: 'Mush', items: ['Mush'], note: 'Ready to eat, no prep needed.' },
  { day: 'Wednesday', name: 'Mush', items: ['Mush'], note: 'Ready to eat, no prep needed.' },
];

const lunches: Lunch[] = [
  { day: 'Monday', name: 'Leftover Chicken Salad', items: ['Greens', 'Leftover Sunday chicken thighs, sliced', 'Chickpeas', 'Lemon and olive oil dressing'], note: 'Uses up Sunday protein before it turns.' },
  { day: 'Tuesday', name: 'Taco Salad', items: ['Greens', 'Leftover taco beef from Monday', 'Black beans', 'Avocado', 'Salsa'], note: 'Repurposes Monday night taco meat — no extra cooking.' },
  { day: 'Wednesday', name: 'Chicken and Chickpea Salad', items: ['Greens', 'Leftover chicken thighs', 'Chickpeas', 'Lemon and olive oil dressing', 'Feta if available'], note: 'Same base as Monday — keep rotating the chicken through the week.' },
];

const dinners: Dinner[] = [
  { id: 1, day: 'Sunday', name: 'Mediterranean Herb-Roasted Chicken Thighs', tag: 'Chicken Night', protein: 'Bone-in chicken thighs', note: 'Sear in cast iron, finish in the oven. Sets up leftovers for Monday and Wednesday lunch.', ingredients: ['Bone-in chicken thighs', 'Lemon', 'Garlic cloves', 'Dried oregano', 'Olive oil', 'Chicken stock (for pan sauce)', 'Butter', 'Salt and pepper', 'Baby spinach', 'Chickpeas (roasted)'], steps: ['Pat thighs dry, season with salt, pepper, and oregano.', 'Sear skin-side down in cast iron over medium-high until crisp, about 6-7 minutes.', 'Flip, add smashed garlic and lemon slices, transfer pan to a 425F oven for 20-25 minutes until 165F internal.', 'Rest chicken. Deglaze pan with chicken stock and a squeeze of lemon, reduce, finish with a swirl of butter — no wine needed.', 'Saute spinach quickly in the same pan. Toss chickpeas with olive oil and roast alongside the chicken. Plate chicken over spinach with sauce spooned over, chickpeas on the side.'] },
  { id: 2, day: 'Monday', name: 'Ground Beef Taco Bar', tag: 'Small Group — Feeds a Crowd', protein: '1-1.5 lbs ground beef', note: 'Bringing this to small group at your friends house. Easy to transport, no last-minute plating.', ingredients: ['1-1.5 lbs ground beef', 'Taco seasoning', 'Tortillas', 'Shredded cheese', 'Lettuce, diced tomato, diced onion', 'Sour cream or Greek yogurt', 'Salsa', 'Lime wedges'], steps: ['Brown ground beef in a skillet over medium-high heat, breaking it up as it cooks.', 'Drain excess fat, stir in taco seasoning and a splash of water, simmer 3-4 minutes.', 'Transfer beef to a covered dish to keep warm for transport.', 'Pack tortillas and toppings separately so everything stays fresh until serving.', 'Set up the bar at their place — beef, tortillas, and toppings laid out for people to build their own.'] },
  { id: 3, day: 'Tuesday', name: 'Seared Steak with Roasted Quinoa and Grilled Asparagus', tag: 'Steak Night', protein: 'Steak of choice', note: 'Fast cast-iron cook after work. Keeps you on pace for your weekly beef and steak rotation.', ingredients: ['Steak of choice', 'Quinoa', 'Asparagus', 'Olive oil', 'Garlic', 'Salt and pepper', 'Butter', 'Lemon'], steps: ['Bring steak to room temperature, season generously with salt and pepper.', 'Cook quinoa according to package directions.', 'Sear steak in a screaming hot cast iron, 3-4 minutes per side depending on thickness, basting with butter and garlic near the end.', 'Rest steak 5-7 minutes before slicing.', 'Toss asparagus in olive oil, salt, and pepper, grill or sear until charred and tender, finish with a squeeze of lemon.', 'Plate sliced steak over quinoa with asparagus on the side.'] },
];

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday'];

const grocerySections = [
  { title: 'Proteins', items: ['Bone-in chicken thighs', 'Ground beef (1-1.5 lbs)', 'Steak of choice'] },
  { title: 'Produce', items: ['Baby spinach', 'Lemons', 'Garlic', 'Lettuce or mixed greens', 'Tomato', 'Onion', 'Asparagus', 'Avocado'] },
  { title: 'Pantry and Dairy', items: ['Chickpeas', 'Black beans', 'Quinoa', 'Feta (optional)', 'Taco seasoning', 'Tortillas', 'Shredded cheese', 'Salsa'] },
  { title: 'Already Have — Confirm Before Buying', items: ['Olive oil', 'Butter', 'Chicken stock', 'Dried oregano', 'Salt, pepper, and Maldon', 'Lime'] },
];

const T = {
  bg: 'var(--foundry-bg)',
  card: 'var(--foundry-card)',
  surface: 'var(--foundry-surface)',
  border: 'var(--foundry-border)',
  text: 'var(--foundry-text)',
  muted: 'var(--foundry-text-muted)',
  subtle: 'var(--foundry-text-subtle)',
  ember: 'var(--foundry-ember)',
  mono: 'var(--foundry-font-mono)',
  display: 'var(--foundry-font-display)',
  body: 'var(--foundry-font-body)',
  radMd: 'var(--foundry-radius-md)',
  radSm: 'var(--foundry-radius-sm)',
};

const eyebrow = { fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: T.subtle };
const cardBase = { background: T.card, border: `1px solid ${T.border}`, borderRadius: T.radMd };

export default function MealPlanApp() {
  const [mainTab, setMainTab] = useState<'meals' | 'grocery'>('meals');
  const [activeDay, setActiveDay] = useState('Sunday');
  const [mealType, setMealType] = useState<null | 'breakfast' | 'lunch' | 'dinner'>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const bfast = breakfasts.find(b => b.day === activeDay);
  const lunch = lunches.find(l => l.day === activeDay);
  const dinner = dinners.find(d => d.day === activeDay);
  const toggle = (key: string) => setChecked(prev => ({ ...prev, [key]: !prev[key] }));
  const goBack = () => setMealType(null);

  return (
    <div style={{ fontFamily: T.body, minHeight: '100vh', background: T.bg, color: T.text }}>

      <div style={{ ...cardBase, borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderTop: 'none', padding: '20px 20px 16px' }}>
        <div style={{ ...eyebrow, marginBottom: 4 }}>This Week</div>
        <div style={{ fontFamily: T.display, fontSize: 24, fontWeight: 700, color: T.text, letterSpacing: '-0.02em', lineHeight: 1.2 }}>Meal Plan</div>
        <div style={{ fontFamily: T.body, fontSize: 12, color: T.muted, marginTop: 3 }}>Sunday through Wednesday</div>
      </div>

      <div style={{ display: 'flex', background: T.card, borderBottom: `1px solid ${T.border}` }}>
        {(['meals', 'grocery'] as const).map(t => (
          <button key={t} onClick={() => { setMainTab(t); setMealType(null); }} style={{ flex: 1, padding: '12px 0', border: 'none', background: 'transparent', cursor: 'pointer', borderBottom: mainTab === t ? `2px solid ${T.ember}` : '2px solid transparent', color: mainTab === t ? T.ember : T.muted, fontFamily: T.body, fontSize: 13, fontWeight: mainTab === t ? 600 : 400 }}>
            {t === 'meals' ? 'Meals' : 'Grocery List'}
          </button>
        ))}
      </div>

      {mainTab === 'meals' && (
        <div>
          <div style={{ display: 'flex', background: T.surface, borderBottom: `1px solid ${T.border}`, overflowX: 'auto' as const }}>
            {DAYS.map(d => (
              <button key={d} onClick={() => { setActiveDay(d); setMealType(null); }} style={{ flex: 1, minWidth: 70, padding: '9px 4px', border: 'none', background: 'transparent', cursor: 'pointer', borderBottom: activeDay === d ? `2px solid ${T.ember}` : '2px solid transparent', color: activeDay === d ? T.text : T.subtle, fontFamily: T.mono, fontSize: 11, fontWeight: activeDay === d ? 600 : 400, letterSpacing: '0.08em' }}>
                {d.slice(0, 3).toUpperCase()}
              </button>
            ))}
          </div>

          <div style={{ padding: 16 }}>
            {!mealType ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {bfast && (
                  <button onClick={() => setMealType('breakfast')} style={{ ...cardBase, padding: '14px 16px', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div>
                      <div style={{ ...eyebrow, marginBottom: 4 }}>Breakfast</div>
                      <div style={{ fontFamily: T.body, fontSize: 15, fontWeight: 600, color: T.text }}>{bfast.name}</div>
                    </div>
                    <div style={{ color: T.subtle, fontSize: 20, lineHeight: 1 }}>{'\u203A'}</div>
                  </button>
                )}
                {lunch && (
                  <button onClick={() => setMealType('lunch')} style={{ ...cardBase, padding: '14px 16px', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div>
                      <div style={{ ...eyebrow, marginBottom: 4 }}>Lunch</div>
                      <div style={{ fontFamily: T.body, fontSize: 15, fontWeight: 600, color: T.text }}>{lunch.name}</div>
                    </div>
                    <div style={{ color: T.subtle, fontSize: 20, lineHeight: 1 }}>{'\u203A'}</div>
                  </button>
                )}
                {dinner && (
                  <button onClick={() => setMealType('dinner')} style={{ ...cardBase, borderLeft: `3px solid ${T.ember}`, padding: '14px 16px', textAlign: 'left', cursor: 'pointer', width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ ...eyebrow, color: T.ember, marginBottom: 4 }}>Dinner — Full Recipe</div>
                        <div style={{ fontFamily: T.body, fontSize: 15, fontWeight: 600, color: T.text }}>{dinner.name}</div>
                        <div style={{ fontFamily: T.body, fontSize: 12, color: T.muted, marginTop: 2 }}>{dinner.protein}</div>
                      </div>
                      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radSm, padding: '3px 8px', fontSize: 11, color: T.subtle, fontFamily: T.mono, marginLeft: 8, flexShrink: 0 }}>{dinner.tag}</div>
                    </div>
                    <div style={{ marginTop: 10, padding: '9px 11px', background: T.surface, borderRadius: T.radSm, borderLeft: `2px solid ${T.border}`, fontSize: 12, color: T.muted, fontFamily: T.body, lineHeight: 1.55 }}>{dinner.note}</div>
                  </button>
                )}
                {!bfast && !lunch && !dinner && (
                  <div style={{ ...cardBase, padding: '20px', textAlign: 'center', color: T.muted, fontSize: 13 }}>Nothing planned for this day yet.</div>
                )}
              </div>
            ) : mealType === 'breakfast' || mealType === 'lunch' ? (
              <div>
                <button onClick={goBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.ember, fontFamily: T.body, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 14, padding: 0 }}>{'\u2190'} Back</button>
                <div style={{ ...cardBase, overflow: 'hidden' }}>
                  <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: '16px 20px' }}>
                    <div style={{ ...eyebrow, marginBottom: 4 }}>{activeDay} — {mealType === 'breakfast' ? 'Breakfast' : 'Lunch'}</div>
                    <div style={{ fontFamily: T.display, fontSize: 19, fontWeight: 700, color: T.text }}>{mealType === 'breakfast' ? bfast?.name : lunch?.name}</div>
                  </div>
                  <div style={{ padding: '16px 20px' }}>
                    {(mealType === 'breakfast' ? bfast?.items : lunch?.items)?.map((item, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: T.ember, marginTop: 8, flexShrink: 0 }} />
                        <span style={{ fontSize: 14, fontFamily: T.body, color: T.text, lineHeight: 1.55 }}>{item}</span>
                      </div>
                    ))}
                    <div style={{ marginTop: 14, padding: '10px 12px', background: T.surface, borderRadius: T.radSm, borderLeft: `2px solid ${T.ember}`, fontSize: 12, color: T.muted, fontFamily: T.body, lineHeight: 1.6 }}>
                      {mealType === 'breakfast' ? bfast?.note : lunch?.note}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <button onClick={goBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.ember, fontFamily: T.body, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 14, padding: 0 }}>{'\u2190'} Back</button>
                <div style={{ ...cardBase, overflow: 'hidden' }}>
                  <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, borderTop: `3px solid ${T.ember}`, padding: '16px 20px' }}>
                    <div style={{ ...eyebrow, color: T.ember, marginBottom: 4 }}>{activeDay} — Dinner — {dinner?.tag}</div>
                    <div style={{ fontFamily: T.display, fontSize: 20, fontWeight: 700, color: T.text }}>{dinner?.name}</div>
                    <div style={{ fontSize: 12, color: T.muted, marginTop: 4, fontFamily: T.body, lineHeight: 1.5 }}>{dinner?.note}</div>
                  </div>
                  <div style={{ padding: '16px 20px' }}>
                    <div style={{ ...eyebrow, marginBottom: 10 }}>Ingredients</div>
                    <ul style={{ margin: 0, padding: '0 0 0 16px', marginBottom: 20 }}>
                      {dinner?.ingredients.map((ing, i) => (
                        <li key={i} style={{ fontSize: 14, color: T.text, marginBottom: 6, fontFamily: T.body, lineHeight: 1.5 }}>{ing}</li>
                      ))}
                    </ul>
                    <div style={{ ...eyebrow, marginBottom: 10 }}>Steps</div>
                    {dinner?.steps.map((step, i) => (
                      <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: T.ember, color: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, fontFamily: T.mono, flexShrink: 0 }}>{i + 1}</div>
                        <div style={{ fontSize: 14, color: T.text, fontFamily: T.body, lineHeight: 1.6, paddingTop: 3 }}>{step}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {mainTab === 'grocery' && (
        <div style={{ padding: 16 }}>
          {grocerySections.map(section => (
            <div key={section.title} style={{ marginBottom: 20 }}>
              <div style={{ ...eyebrow, marginBottom: 8 }}>{section.title}</div>
              {section.items.map(item => {
                const key = `${section.title}-${item}`;
                const on = checked[key];
                return (
                  <div key={key} onClick={() => toggle(key)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', marginBottom: 5, background: on ? T.surface : T.card, borderRadius: T.radSm, border: `1px solid ${on ? T.ember : T.border}`, cursor: 'pointer' }}>
                    <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${on ? T.ember : T.border}`, background: on ? T.ember : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {on && <span style={{ color: T.bg, fontSize: 11, fontWeight: 700 }}>{'\u2713'}</span>}
                    </div>
                    <span style={{ fontSize: 13, fontFamily: T.body, color: on ? T.subtle : T.text, textDecoration: on ? 'line-through' : 'none' }}>{item}</span>
                  </div>
                );
              })}
            </div>
          ))}
          <div style={{ height: 40 }} />
        </div>
      )}
    </div>
  );
}
