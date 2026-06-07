import { useState } from 'react';

interface Breakfast { day: string; name: string; items: string[]; ttc: string; }
interface Lunch { day: string; name: string; items: string[]; ttc: string; }
interface Dinner { id: number; day: string; name: string; tag: string; protein: string; ttcNote: string; ingredients: string[]; steps: string[]; }

const breakfasts: Breakfast[] = [
  { day: 'Monday', name: 'Scrambled Eggs with Spinach and Yogurt', items: ['2-3 eggs scrambled with a handful of spinach', 'Full fat Greek yogurt on the side', '2-3 Brazil nuts and pumpkin seeds on yogurt', 'Half-caf or decaf latte'], ttc: 'Eggs provide choline and Vitamin E. Spinach delivers folate. Brazil nuts supply selenium for sperm DNA integrity. Yogurt supports hormone balance.' },
  { day: 'Tuesday', name: 'Overnight Oats with Yogurt', items: ['Overnight oats with protein powder', 'Berries stirred in', 'Full fat Greek yogurt on the side or mixed in', 'Pumpkin seeds on top'], ttc: 'Berries provide antioxidants for egg quality. Pumpkin seeds deliver zinc. Yogurt supports progesterone production.' },
  { day: 'Wednesday', name: 'Eggs with Spinach', items: ['2-3 fried or scrambled eggs', 'Handful of spinach cooked in', '2-3 Brazil nuts on the side'], ttc: 'Daily eggs are a cornerstone of the TTC plan. Spinach folate and iron are critical for Isabel.' },
  { day: 'Thursday', name: 'Overnight Oats with Nuts and Yogurt', items: ['Overnight oats with protein powder', 'Full fat Greek yogurt mixed in or on side', 'Berries and walnuts on top', 'Pumpkin seeds'], ttc: 'Walnuts provide omega-3s for sperm motility. Berries deliver antioxidant load for both.' },
  { day: 'Friday', name: 'Scrambled Eggs with Spinach', items: ['2-3 eggs scrambled with spinach', 'Full fat Greek yogurt', 'Brazil nuts and pumpkin seeds', 'Slice of bread with olive oil (optional)'], ttc: 'End the week strong. Olive oil on bread adds Mediterranean healthy fat.' },
];

const lunches: Lunch[] = [
  { day: 'Monday', name: 'Leftover Chicken Salad', items: ['Sliced leftover lemon herb chicken', 'Lettuce, cucumber, and green onion', 'Olive oil and lemon dressing', 'Feta crumbled on top (optional)'], ttc: 'Greens with olive oil reduce inflammation. Feta adds full fat dairy.' },
  { day: 'Tuesday', name: 'Leftover Beef Bowl Salad', items: ['Leftover ground beef over lettuce', 'Cucumber and cherry tomatoes', 'Olive oil, lemon, and salt', 'Greek yogurt as dressing'], ttc: 'Tomatoes provide lycopene for sperm DNA protection. Yogurt doubles as dressing and dairy hit.' },
  { day: 'Wednesday', name: 'Leftover Stir Fry Rice Bowl', items: ['Leftover chicken and stir fry veggies over rice', 'Cucumber slices on the side', 'Olive oil and lemon drizzle', 'Handful of spinach stirred in cold'], ttc: 'Colorful veggies deliver antioxidant variety. Cold spinach still provides folate.' },
  { day: 'Thursday', name: 'Mediterranean Salad with Chicken', items: ['Leftover roasted chicken over lettuce', 'Cherry tomatoes, cucumber, and kalamata olives', 'Olive oil, lemon, and oregano dressing', 'Feta on top'], ttc: 'Olives provide healthy fat. Tomatoes add lycopene again. Most TTC-optimized lunch of the week.' },
  { day: 'Friday', name: 'Simple Salad with Leftover Protein', items: ['Lettuce, cucumber, green onion, and cherry tomatoes', 'Any leftover protein from the week', 'Olive oil and lemon dressing', 'Pumpkin seeds on top'], ttc: 'Clean, anti-inflammatory close to the week. Pumpkin seeds add zinc.' },
];

const dinners: Dinner[] = [
  { id: 1, day: 'Monday', name: 'Lemon Herb Chicken over Couscous', tag: 'Folate + Zinc', protein: 'Thawed chicken breast', ttcNote: 'Couscous and broccoli deliver folate. Olive oil pan sauce provides hormone-healthy fat. Fire roasted tomatoes add lycopene.', ingredients: ['1 chicken breast (thawed)', '3/4 cup couscous', '1/2 cup chicken broth for couscous', '1 cup broccoli florets', '1/2 can Muir Glen fire roasted tomatoes', '1/2 yellow onion sliced', '2 tbsp olive oil', '2 garlic cloves minced', 'Juice of 1 lemon', '1 tsp oregano, 1/2 tsp cumin', 'Salt, pepper, Maldon to finish', 'Green onion for garnish'], steps: ['Pound chicken to even thickness. Season with oregano, cumin, salt, and pepper.', 'Sear in cast iron with olive oil — 4-5 min per side until golden. Rest 5 min, then slice.', 'In same pan: saute onion and garlic 2 min. Add fire roasted tomatoes, lemon juice, and splash of broth. Scrape bits. Simmer 2 min.', 'Cook couscous: bring 3/4 cup broth to boil, add couscous, cover, off heat 5 min. Fluff.', 'Steam or air fry broccoli. Plate couscous, top with sliced chicken and tomato pan sauce. Finish with Maldon and green onion.'] },
  { id: 2, day: 'Tuesday', name: 'Mediterranean Ground Beef Rice Bowls', tag: 'Iron + Zinc', protein: '1 lb ground beef', ttcNote: 'Beef provides zinc and iron for ovulation. Pumpkin seeds on top add zinc for Andre. Tomatoes and spinach round out the nutrients.', ingredients: ['1 lb ground beef', '1.5 cups rice cooked', '1/2 yellow onion diced', '2 garlic cloves', '1/2 can Muir Glen fire roasted tomatoes', '1 tsp cumin, 1 tsp smoked paprika, 1/2 tsp cinnamon', 'Salt and pepper', '1/2 cucumber diced', 'Green onion sliced', 'Handful of fresh spinach', 'Lemon squeeze and olive oil drizzle', 'Pumpkin seeds for topping', 'Full fat Greek yogurt as sauce'], steps: ['Cook rice. Brown ground beef in cast iron over medium-high. Drain most fat.', 'Add onion and garlic. Cook 3 min. Add cumin, paprika, cinnamon, and fire roasted tomatoes. Stir and cook 2 min.', 'Add handful of spinach right at end. Stir until wilted, about 30 seconds. Off heat.', 'Build bowls: rice base, beef and tomato mixture, fresh cucumber and green onion on top.', 'Finish with lemon, olive oil, and Maldon. Pumpkin seeds on top for Andre. Yogurt on the side as sauce.'] },
  { id: 3, day: 'Wednesday', name: 'Chicken and Veggie Stir Fry over Rice', tag: 'Antioxidants', protein: 'Chicken breast #2', ttcNote: 'Colorful stir fry veggies deliver antioxidant variety for egg and sperm quality. Coconut aminos over soy — less processed.', ingredients: ['1 chicken breast thin-sliced', '1 bag frozen stir fry veggies', 'Handful fresh spinach (add at end)', '1.5 cups rice cooked', '2 tbsp olive oil or avocado oil', '2 garlic cloves minced', '1 tbsp coconut aminos', '1 tsp sesame oil', '1/2 tsp ginger', 'Green onion and lemon squeeze', 'Pumpkin seeds to top'], steps: ['Slice chicken thin. Season with salt, pepper, and garlic powder.', 'Cook rice. Heat cast iron hot with olive oil. Sear chicken 3-4 min per side. Remove.', 'Add frozen veggies to hot pan. Stir fry 4-5 min — aim for char, not mush.', 'Add garlic, ginger, coconut aminos, and sesame oil. Toss 1 min. Add spinach last — 30 seconds until wilted.', 'Return chicken. Toss everything. Serve over rice. Top with green onion and pumpkin seeds.'] },
  { id: 4, day: 'Thursday', name: 'Sheet Pan Chicken with Roasted Carrots and Broccoli', tag: 'Beta Carotene', protein: 'Chicken breast #3', ttcNote: 'Carrots and broccoli roasted in olive oil form a beta carotene and folate powerhouse. Mediterranean salad kit rounds it out.', ingredients: ['1 chicken breast', '1 cup tri-color carrots sliced', '1 cup broccoli florets', 'Mediterranean salad kit', '3 tbsp olive oil', '1 tsp oregano, 1/2 tsp garlic powder, 1/2 tsp smoked paprika', 'Lemon juice', 'Salt, pepper, and Maldon', 'Feta to crumble over top', 'Kalamata olives on the side'], steps: ['Preheat oven to 425F. Toss carrots and broccoli in olive oil, oregano, paprika, salt, and pepper. Spread on sheet pan.', 'Season chicken with olive oil, garlic powder, oregano, and salt. Lay on same sheet pan.', 'Roast 22-25 min until chicken hits 165F and veggies are caramelized on edges.', 'While roasting, prep Mediterranean salad kit. Add kalamata olives.', 'Slice chicken. Plate over veggies. Crumble feta on top. Salad on the side. Finish with lemon and Maldon.'] },
  { id: 5, day: 'Friday', name: 'Nuggets with Sweet Potato Fries and Veggie Tray', tag: 'Easy Night', protein: 'Chicken nuggets', ttcNote: 'Sweet potato converts beta carotene to Vitamin A, critical for fertility. Friday is your rest night — keep it easy and clean.', ingredients: ['Chicken nuggets (full bag)', 'Sweet potato fries (frozen bag)', 'Tri-color carrots raw or steamed', 'Cucumber slices', 'Cherry tomatoes', 'Greek yogurt dip: plain yogurt, garlic, lemon, and salt', 'Lemon squeeze over veggies'], steps: ['Air fry nuggets at 375F for 10-12 min.', 'Air fry sweet potato fries per package in batches.', 'Arrange raw veggies — carrots, cucumber, and cherry tomatoes.', 'Make quick yogurt dip: Greek yogurt with minced garlic, lemon juice, and salt. Two minutes.', 'Plate family style. The yogurt dip keeps it TTC-aligned.'] },
];

const grocerySections = [
  { title: 'Proteins and Dairy', items: ['Eggs (1 dozen — daily use)', 'Full fat Greek yogurt (large tub)', 'Feta cheese (block or crumbled)'] },
  { title: 'Produce', items: ['Baby spinach (large bag)', 'Lemons (4-5)', 'Garlic (1 head or pre-minced)', 'Cherry tomatoes'] },
  { title: 'Pantry', items: ['Coconut aminos', 'Kalamata olives (jarred)', 'Sesame oil', 'Cumin (if low)', 'Smoked paprika (if low)', 'Oregano (if low)', 'Extra virgin olive oil (if low)'] },
  { title: 'TTC Daily Adds', items: ['Brazil nuts (2-3 per day for Andre — selenium)', 'Pumpkin seeds (zinc — goes on everything)', 'Walnuts (omega-3s for sperm motility)', 'Blueberries or strawberries (antioxidants)', 'Avocados (2-3)'] },
  { title: 'Already Have — Confirm Before Buying', items: ['Yellow onion', 'Cucumber', 'Green onion', 'Lettuce', 'Rice', 'Couscous', 'Chicken broth', 'Bread', 'Muir Glen fire roasted tomatoes', 'Sweet potato fries', 'Chicken nuggets', 'Broccoli florets', 'Tri-color carrots', 'Stir fry veggies', 'Mediterranean salad kit', 'Protein powder'] },
];

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday'];

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
  const [mainTab, setMainTab] = useState<'meals'|'grocery'>('meals');
  const [activeDay, setActiveDay] = useState('Monday');
  const [mealType, setMealType] = useState<null|'breakfast'|'lunch'|'dinner'>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const bfast = breakfasts.find(b => b.day === activeDay);
  const lunch = lunches.find(l => l.day === activeDay);
  const dinner = dinners.find(d => d.day === activeDay);
  const toggle = (key: string) => setChecked(prev => ({ ...prev, [key]: !prev[key] }));
  const goBack = () => setMealType(null);

  return (
    <div style={{ fontFamily: T.body, minHeight: '100vh', background: T.bg, color: T.text }}>

      {/* Header */}
      <div style={{ ...cardBase, borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderTop: 'none', padding: '20px 20px 16px' }}>
        <div style={{ ...eyebrow, marginBottom: 4 }}>Week of June 8 — TTC Aligned</div>
        <div style={{ fontFamily: T.display, fontSize: 24, fontWeight: 700, color: T.text, letterSpacing: '-0.02em', lineHeight: 1.2 }}>Mediterranean Meal Plan</div>
        <div style={{ fontFamily: T.body, fontSize: 12, color: T.muted, marginTop: 3 }}>Breakfast · Lunch · Dinner · 5 days</div>
        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' as const }}>
          {['Eggs daily','Olive oil','Spinach','Brazil nuts','Pumpkin seeds'].map(t => (
            <div key={t} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radSm, padding: '3px 9px', fontSize: 11, color: T.subtle, fontFamily: T.mono, letterSpacing: '0.05em' }}>{t}</div>
          ))}
        </div>
      </div>

      {/* Main tabs */}
      <div style={{ display: 'flex', background: T.card, borderBottom: `1px solid ${T.border}` }}>
        {(['meals','grocery'] as const).map(t => (
          <button key={t} onClick={() => { setMainTab(t); setMealType(null); }} style={{ flex: 1, padding: '12px 0', border: 'none', background: 'transparent', cursor: 'pointer', borderBottom: mainTab === t ? `2px solid ${T.ember}` : '2px solid transparent', color: mainTab === t ? T.ember : T.muted, fontFamily: T.body, fontSize: 13, fontWeight: mainTab === t ? 600 : 400 }}>
            {t === 'meals' ? 'Meals' : 'Grocery List'}
          </button>
        ))}
      </div>

      {mainTab === 'meals' && (
        <div>
          {/* Day tabs */}
          <div style={{ display: 'flex', background: T.surface, borderBottom: `1px solid ${T.border}`, overflowX: 'auto' as const }}>
            {DAYS.map(d => (
              <button key={d} onClick={() => { setActiveDay(d); setMealType(null); }} style={{ flex: 1, minWidth: 56, padding: '9px 4px', border: 'none', background: 'transparent', cursor: 'pointer', borderBottom: activeDay === d ? `2px solid ${T.ember}` : '2px solid transparent', color: activeDay === d ? T.text : T.subtle, fontFamily: T.mono, fontSize: 11, fontWeight: activeDay === d ? 600 : 400, letterSpacing: '0.08em' }}>
                {d.slice(0,3).toUpperCase()}
              </button>
            ))}
          </div>

          <div style={{ padding: 16 }}>
            {!mealType ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Breakfast */}
                <button onClick={() => setMealType('breakfast')} style={{ ...cardBase, padding: '14px 16px', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <div>
                    <div style={{ ...eyebrow, marginBottom: 4 }}>Breakfast</div>
                    <div style={{ fontFamily: T.body, fontSize: 15, fontWeight: 600, color: T.text }}>{bfast?.name}</div>
                  </div>
                  <div style={{ color: T.subtle, fontSize: 20, lineHeight: 1 }}>›</div>
                </button>
                {/* Lunch */}
                <button onClick={() => setMealType('lunch')} style={{ ...cardBase, padding: '14px 16px', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <div>
                    <div style={{ ...eyebrow, marginBottom: 4 }}>Lunch</div>
                    <div style={{ fontFamily: T.body, fontSize: 15, fontWeight: 600, color: T.text }}>{lunch?.name}</div>
                  </div>
                  <div style={{ color: T.subtle, fontSize: 20, lineHeight: 1 }}>›</div>
                </button>
                {/* Dinner */}
                <button onClick={() => setMealType('dinner')} style={{ ...cardBase, borderLeft: `3px solid ${T.ember}`, padding: '14px 16px', textAlign: 'left', cursor: 'pointer', width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ ...eyebrow, color: T.ember, marginBottom: 4 }}>Dinner — Full Recipe</div>
                      <div style={{ fontFamily: T.body, fontSize: 15, fontWeight: 600, color: T.text }}>{dinner?.name}</div>
                      <div style={{ fontFamily: T.body, fontSize: 12, color: T.muted, marginTop: 2 }}>{dinner?.protein}</div>
                    </div>
                    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radSm, padding: '3px 8px', fontSize: 11, color: T.subtle, fontFamily: T.mono, marginLeft: 8, flexShrink: 0 }}>{dinner?.tag}</div>
                  </div>
                  <div style={{ marginTop: 10, padding: '9px 11px', background: T.surface, borderRadius: T.radSm, borderLeft: `2px solid ${T.border}`, fontSize: 12, color: T.muted, fontFamily: T.body, lineHeight: 1.55 }}>{dinner?.ttcNote}</div>
                </button>
              </div>
            ) : mealType === 'breakfast' || mealType === 'lunch' ? (
              <div>
                <button onClick={goBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.ember, fontFamily: T.body, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 14, padding: 0 }}>← Back</button>
                <div style={{ ...cardBase, overflow: 'hidden' }}>
                  <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: '16px 20px' }}>
                    <div style={{ ...eyebrow, marginBottom: 4 }}>{activeDay} — {mealType === 'breakfast' ? 'Breakfast' : 'Lunch'}</div>
                    <div style={{ fontFamily: T.display, fontSize: 19, fontWeight: 700, color: T.text }}>{mealType === 'breakfast' ? bfast?.name : lunch?.name}</div>
                    {mealType === 'lunch' && <div style={{ fontSize: 12, color: T.muted, marginTop: 2, fontFamily: T.body }}>Mostly leftovers — keep it simple</div>}
                  </div>
                  <div style={{ padding: '16px 20px' }}>
                    {(mealType === 'breakfast' ? bfast?.items : lunch?.items)?.map((item, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: T.ember, marginTop: 8, flexShrink: 0 }} />
                        <span style={{ fontSize: 14, fontFamily: T.body, color: T.text, lineHeight: 1.55 }}>{item}</span>
                      </div>
                    ))}
                    <div style={{ marginTop: 14, padding: '10px 12px', background: T.surface, borderRadius: T.radSm, borderLeft: `2px solid ${T.ember}`, fontSize: 12, color: T.muted, fontFamily: T.body, lineHeight: 1.6 }}>
                      {mealType === 'breakfast' ? bfast?.ttc : lunch?.ttc}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <button onClick={goBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.ember, fontFamily: T.body, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 14, padding: 0 }}>← Back</button>
                <div style={{ ...cardBase, overflow: 'hidden' }}>
                  <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, borderTop: `3px solid ${T.ember}`, padding: '16px 20px' }}>
                    <div style={{ ...eyebrow, color: T.ember, marginBottom: 4 }}>{activeDay} — Dinner — {dinner?.tag}</div>
                    <div style={{ fontFamily: T.display, fontSize: 20, fontWeight: 700, color: T.text }}>{dinner?.name}</div>
                    <div style={{ fontSize: 12, color: T.muted, marginTop: 4, fontFamily: T.body, lineHeight: 1.5 }}>{dinner?.ttcNote}</div>
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
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radSm, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: T.muted, fontFamily: T.body, lineHeight: 1.5 }}>
            Estimated spend: $40-55. Proteins are covered. Mostly produce, dairy, and TTC boosts.
          </div>
          {grocerySections.map(section => (
            <div key={section.title} style={{ marginBottom: 20 }}>
              <div style={{ ...eyebrow, marginBottom: 8 }}>{section.title}</div>
              {section.items.map(item => {
                const key = `${section.title}-${item}`;
                const on = checked[key];
                return (
                  <div key={key} onClick={() => toggle(key)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', marginBottom: 5, background: on ? T.surface : T.card, borderRadius: T.radSm, border: `1px solid ${on ? T.ember : T.border}`, cursor: 'pointer' }}>
                    <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${on ? T.ember : T.border}`, background: on ? T.ember : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {on && <span style={{ color: T.bg, fontSize: 11, fontWeight: 700 }}>✓</span>}
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
