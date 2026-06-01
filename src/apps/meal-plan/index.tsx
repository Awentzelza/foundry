import { useState, useCallback } from 'react';
import { IonButton } from '@ionic/react';
import { useAppData } from '@/hooks/useAppData';

interface CheckedState { [key: string]: boolean }

const recipes = [
  {
    id: 1, day: 'Monday', title: 'Sheet Pan Chicken & Sweet Potatoes',
    protein: 'Chicken', time: '40 min', tag: 'Clean',
    ingredients: [
      '2 boneless skinless chicken breasts',
      '2 sweet potatoes, cubed',
      '2 cups baby spinach or arugula',
      '3 tbsp olive oil',
      '4 cloves garlic, minced',
      '1 tsp paprika',
      '1 tsp garlic powder',
      '1 tsp onion powder',
      '1 tsp dried rosemary',
      'Salt and pepper to taste',
    ],
    steps: [
      'Preheat oven to 425 F.',
      'Cube sweet potatoes and toss with 1.5 tbsp olive oil, salt, pepper, and paprika. Spread on one side of a sheet pan.',
      'Roast sweet potatoes for 10 minutes while you prep the chicken.',
      'Mix remaining olive oil, garlic, garlic powder, onion powder, rosemary, salt and pepper. Coat chicken breasts.',
      'Add chicken to the other side of the sheet pan.',
      'Roast everything together for 25-28 minutes until chicken hits 165 F internal temp.',
      'In the last 5 minutes, scatter spinach or arugula over the sweet potatoes and let it wilt in the oven.',
      'Let chicken rest 5 minutes before slicing. Serve everything together.',
    ],
  },
  {
    id: 2, day: 'Tuesday', title: 'Taco Rice Bowls',
    protein: 'Ground Beef', time: '30 min', tag: 'Performance',
    ingredients: [
      '1 lb ground beef',
      '1 sweet onion, diced',
      '2 cups cooked white rice',
      '2 cups chopped romaine or spinach',
      '2 avocados, sliced',
      '1 cup shredded carrots',
      '1/2 cup shredded cheese',
      '2 tsp cumin',
      '1 tsp chili powder',
      '1 tsp garlic powder',
      'Salt and pepper to taste',
      'Lime juice (optional)',
    ],
    steps: [
      'Cook rice according to package instructions.',
      'Brown ground beef in a skillet over medium-high heat, breaking it up as it cooks.',
      'Drain excess fat. Add diced onion and cook 3-4 more minutes until softened.',
      'Season with cumin, chili powder, garlic powder, salt, and pepper. Stir well and cook 1 more minute.',
      'Build bowls: bed of chopped romaine or spinach then rice then beef mixture then sliced avocado then shredded carrots then cheese.',
      'Squeeze lime juice over the top if using.',
    ],
  },
  {
    id: 3, day: 'Wednesday', title: 'Creamy Tuscan Chicken over Banza Pasta',
    protein: 'Chicken', time: '35 min', tag: 'Performance',
    ingredients: [
      '2 boneless skinless chicken breasts',
      '2 cups Banza chickpea pasta',
      '4 cloves garlic, minced',
      '1/2 cup heavy whipping cream',
      '1/2 cup chicken broth',
      '1 cup baby spinach',
      '1/2 cup sun-dried tomatoes',
      '2 tbsp butter',
      '1 tsp Italian seasoning',
      'Salt, pepper, red pepper flakes',
      'Parmesan to finish (optional)',
    ],
    steps: [
      'Cook Banza pasta per package — slightly al dente. Reserve 1/4 cup pasta water. Drain.',
      'Season chicken with salt, pepper, and Italian seasoning. Sear in butter over medium-high heat 5-6 min per side until cooked through. Remove and slice.',
      'In the same pan, saute garlic 1 minute. Add sun-dried tomatoes.',
      'Pour in chicken broth and heavy cream. Stir and simmer 3-4 minutes until slightly thickened.',
      'Add spinach and stir until wilted. Season with red pepper flakes.',
      'Toss in pasta, add pasta water as needed to loosen sauce.',
      'Plate pasta, top with sliced chicken. Finish with parmesan if using.',
    ],
  },
  {
    id: 4, day: 'Thursday', title: 'Beef & Veggie Stir Fry over Rice',
    protein: 'Ground Beef', time: '25 min', tag: 'Clean',
    ingredients: [
      '1 lb ground beef (or sliced steak)',
      '2 cups cooked white rice',
      '2 cups baby spinach',
      '1 cup shredded carrots',
      '1/2 sweet onion, sliced',
      '3 cloves garlic, minced',
      '3 tbsp soy sauce or coconut aminos',
      '1 tbsp sesame oil',
      '1 tsp ginger (powder or fresh)',
      '1 tsp sriracha (optional)',
      'Green onions to garnish (optional)',
    ],
    steps: [
      'Cook rice. While rice cooks, prep veggies.',
      'Heat sesame oil in a large skillet or wok over high heat.',
      'Add beef, break apart and brown fully. Drain excess fat if using ground beef.',
      'Push meat to the side. Add onion and carrots, stir fry 3 minutes.',
      'Add garlic and ginger, cook 1 minute.',
      'Mix everything together. Add soy sauce and sriracha. Toss to coat.',
      'Add spinach and stir until just wilted, about 1 minute.',
      'Serve over rice. Garnish with green onions if using.',
    ],
  },
  {
    id: 5, day: 'Friday', title: 'Baked Chicken Pasta',
    protein: 'Chicken', time: '50 min', tag: 'Comfort',
    ingredients: [
      '2 boneless skinless chicken breasts, cubed',
      '12 oz spaghetti or linguine',
      '4 cloves garlic, minced',
      '1 cup heavy whipping cream',
      '1 cup chicken broth',
      '1 cup shredded cheese (mozzarella or mixed)',
      '2 tbsp butter',
      '1 tsp Italian seasoning',
      '1 tsp garlic powder',
      'Salt, pepper, red pepper flakes',
    ],
    steps: [
      'Preheat oven to 375 F.',
      'Cook pasta just under al dente (it will finish in the oven). Drain.',
      'Season and saute cubed chicken in butter until golden and cooked through. Remove.',
      'In the same pan, saute garlic 1 minute. Add broth and cream. Simmer 4-5 min.',
      'Season sauce with Italian seasoning, garlic powder, salt, pepper.',
      'Combine pasta, chicken, and sauce in a large baking dish. Toss to coat.',
      'Top with shredded cheese.',
      'Bake uncovered 20-25 minutes until bubbly and golden on top.',
      'Rest 5 minutes before serving.',
    ],
  },
];

const groceryCategories = [
  {
    category: 'Protein',
    items: [
      'Boneless skinless chicken breasts (2 more packs)',
      'Ground beef (2 lbs)',
      'Eggs (1 dozen)',
    ],
  },
  {
    category: 'Produce',
    items: [
      'Garlic (fresh bulb)',
      'Baby spinach (large bag)',
      'Romaine or arugula',
      'Green onions (optional)',
      'Lime (optional)',
    ],
  },
  {
    category: 'Pantry',
    items: [
      'Sun-dried tomatoes',
      'Soy sauce or coconut aminos',
      'Chicken broth (32 oz)',
      'Sesame oil',
      'Parmesan (optional)',
    ],
  },
  {
    category: 'Dairy',
    items: [
      'Milk',
      'Mozzarella or shredded cheese (extra)',
    ],
  },
];

const alreadyHave = [
  '1 pack chicken breasts', '1 lb ground beef', 'Sweet potatoes', 'White rice',
  'Banza pasta', 'Spaghetti or linguine', 'Shredded carrots', 'Sweet onion',
  'Avocados (2)', 'Heavy whipping cream', 'Butter', 'Cheese (some left)',
  '2 bags salad', 'Mayo', 'Seasonings and pantry basics',
];

export default function MealPlanApp() {
  const { value: checked, setValue: setChecked, ready } = useAppData<CheckedState>('meal-plan', 'grocery', {});
  const [tab, setTab] = useState<'meals' | 'grocery'>('meals');
  const [activeRecipe, setActiveRecipe] = useState<number | null>(null);

  const toggleCheck = useCallback((key: string) => {
    setChecked({ ...checked, [key]: !checked[key] });
  }, [checked, setChecked]);

  if (!ready) return null;

  const totalNeeded = groceryCategories.reduce((s, c) => s + c.items.length, 0);
  const totalChecked = groceryCategories.reduce(
    (s, c) => s + c.items.filter((_, i) => checked[`${c.category}-${i}`]).length, 0
  );

  const recipe = activeRecipe !== null ? recipes.find(r => r.id === activeRecipe) : null;

  return (
    <div style={{ fontFamily: 'var(--foundry-font-body)', color: 'var(--foundry-text)', maxWidth: 540, margin: '0 auto', padding: '0 0 40px' }}>

      <div style={{ padding: '24px 20px 0' }}>
        <div style={{ fontFamily: 'var(--foundry-font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--foundry-text-subtle)', marginBottom: 4 }}>
          Week of June 2
        </div>
        <div style={{ fontFamily: 'var(--foundry-font-display)', fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--foundry-text)' }}>
          Meal Plan
        </div>
        <div style={{ fontSize: 13, color: 'var(--foundry-text-muted)', marginTop: 4 }}>
          5 dinners · Mon–Fri lunches covered
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 20, borderBottom: '1px solid var(--foundry-border)' }}>
          {(['meals', 'grocery'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setActiveRecipe(null); }}
              style={{
                padding: '8px 16px', border: 'none',
                borderBottom: tab === t ? '2px solid var(--foundry-ember)' : '2px solid transparent',
                background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                color: tab === t ? 'var(--foundry-text)' : 'var(--foundry-text-muted)',
                fontFamily: 'var(--foundry-font-body)',
              }}
            >
              {t === 'meals' ? 'Recipes' : 'Grocery List'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'meals' && !recipe && (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {recipes.map(r => (
            <button
              key={r.id}
              onClick={() => setActiveRecipe(r.id)}
              style={{ background: 'var(--foundry-card)', border: '1px solid var(--foundry-border)', borderRadius: 'var(--foundry-radius-md)', padding: '16px 18px', textAlign: 'left', cursor: 'pointer', width: '100%' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div style={{ fontFamily: 'var(--foundry-font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--foundry-text-subtle)' }}>{r.day}</div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: 'var(--foundry-elevated)', color: 'var(--foundry-text-muted)' }}>{r.tag}</span>
              </div>
              <div style={{ fontFamily: 'var(--foundry-font-display)', fontSize: 16, fontWeight: 700, color: 'var(--foundry-text)', marginBottom: 8 }}>{r.title}</div>
              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--foundry-text-muted)' }}>
                <span>{r.protein}</span>
                <span>{r.time}</span>
              </div>
            </button>
          ))}
          <div style={{ background: 'var(--foundry-card)', border: '1px solid var(--foundry-border)', borderRadius: 'var(--foundry-radius-md)', padding: '16px 18px' }}>
            <div style={{ fontFamily: 'var(--foundry-font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--foundry-text-subtle)', marginBottom: 6 }}>Mon–Fri Lunches</div>
            <div style={{ fontFamily: 'var(--foundry-font-display)', fontSize: 15, fontWeight: 700, color: 'var(--foundry-text)', marginBottom: 4 }}>Leftovers or Salad Bowls</div>
            <div style={{ fontSize: 13, color: 'var(--foundry-text-muted)', lineHeight: 1.5 }}>Rotate between leftover dinner portions and the salad bags with sliced chicken.</div>
          </div>
        </div>
      )}

      {tab === 'meals' && recipe && (
        <div style={{ padding: '16px 20px' }}>
          <IonButton fill="clear" onClick={() => setActiveRecipe(null)} style={{ marginBottom: 12, marginLeft: -12 }}>Back to meals</IonButton>
          <div style={{ fontFamily: 'var(--foundry-font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--foundry-text-subtle)', marginBottom: 4 }}>{recipe.day}</div>
          <div style={{ fontFamily: 'var(--foundry-font-display)', fontSize: 22, fontWeight: 700, color: 'var(--foundry-text)', marginBottom: 8, lineHeight: 1.2 }}>{recipe.title}</div>
          <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--foundry-text-muted)', marginBottom: 24 }}>
            <span>{recipe.protein}</span>
            <span>{recipe.time}</span>
            <span style={{ fontWeight: 700, color: 'var(--foundry-ember)' }}>{recipe.tag}</span>
          </div>

          <div style={{ fontFamily: 'var(--foundry-font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--foundry-text-subtle)', marginBottom: 12 }}>Ingredients</div>
          <div style={{ background: 'var(--foundry-card)', border: '1px solid var(--foundry-border)', borderRadius: 'var(--foundry-radius-md)', padding: '4px 0', marginBottom: 24 }}>
            {recipe.ingredients.map((ing, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 16px', borderBottom: i < recipe.ingredients.length - 1 ? '1px solid var(--foundry-border)' : 'none' }}>
                <span style={{ color: 'var(--foundry-ember)', fontWeight: 700, flexShrink: 0 }}>—</span>
                <span style={{ fontSize: 14, color: 'var(--foundry-text)', lineHeight: 1.4 }}>{ing}</span>
              </div>
            ))}
          </div>

          <div style={{ fontFamily: 'var(--foundry-font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--foundry-text-subtle)', marginBottom: 12 }}>Steps</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {recipe.steps.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--foundry-ember)', color: 'var(--foundry-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{i + 1}</div>
                <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--foundry-text)', paddingTop: 3 }}>{step}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'grocery' && (
        <div style={{ padding: '16px 20px' }}>
          <div style={{ background: 'var(--foundry-card)', border: '1px solid var(--foundry-border)', borderRadius: 'var(--foundry-radius-md)', padding: '14px 16px', marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 10 }}>
              <span style={{ fontWeight: 700, color: 'var(--foundry-text)' }}>Still need to grab</span>
              <span style={{ color: 'var(--foundry-text-muted)' }}>{totalChecked} / {totalNeeded}</span>
            </div>
            <div style={{ background: 'var(--foundry-border)', borderRadius: 20, height: 6, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 20, background: 'var(--foundry-ember)', width: `${totalNeeded > 0 ? (totalChecked / totalNeeded) * 100 : 0}%`, transition: 'width 0.3s ease' }} />
            </div>
          </div>

          {groceryCategories.map(cat => (
            <div key={cat.category} style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: 'var(--foundry-font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--foundry-text-subtle)', marginBottom: 8, paddingLeft: 4 }}>{cat.category}</div>
              <div style={{ background: 'var(--foundry-card)', border: '1px solid var(--foundry-border)', borderRadius: 'var(--foundry-radius-md)', overflow: 'hidden' }}>
                {cat.items.map((item, i) => {
                  const key = `${cat.category}-${i}`;
                  const isChecked = !!checked[key];
                  return (
                    <div key={i} onClick={() => toggleCheck(key)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', borderBottom: i < cat.items.length - 1 ? '1px solid var(--foundry-border)' : 'none', cursor: 'pointer' }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, border: isChecked ? 'none' : '2px solid var(--foundry-border)', background: isChecked ? 'var(--foundry-ember)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                        {isChecked && <span style={{ color: 'var(--foundry-bg)', fontSize: 11, fontWeight: 800 }}>✓</span>}
                      </div>
                      <span style={{ fontSize: 14, color: isChecked ? 'var(--foundry-text-subtle)' : 'var(--foundry-text)', textDecoration: isChecked ? 'line-through' : 'none' }}>{item}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: 'var(--foundry-font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--foundry-text-subtle)', marginBottom: 8, paddingLeft: 4 }}>Already Have</div>
            <div style={{ background: 'var(--foundry-card)', border: '1px solid var(--foundry-border)', borderRadius: 'var(--foundry-radius-md)', overflow: 'hidden' }}>
              {alreadyHave.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 16px', borderBottom: i < alreadyHave.length - 1 ? '1px solid var(--foundry-border)' : 'none' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, background: 'var(--foundry-elevated)', border: '1px solid var(--foundry-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: 'var(--foundry-text-subtle)', fontSize: 11, fontWeight: 800 }}>✓</span>
                  </div>
                  <span style={{ fontSize: 14, color: 'var(--foundry-text-subtle)', textDecoration: 'line-through' }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
