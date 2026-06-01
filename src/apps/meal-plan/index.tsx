import { useState, useCallback } from 'react';
import { IonButton } from '@ionic/react';
import { useAppData } from '@/hooks/useAppData';
import s from './styles.module.css';

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

  const totalNeeded = groceryCategories.reduce((sum, c) => sum + c.items.length, 0);
  const totalChecked = groceryCategories.reduce(
    (sum, c) => sum + c.items.filter((_, i) => checked[`${c.category}-${i}`]).length, 0
  );
  const pct = totalNeeded > 0 ? (totalChecked / totalNeeded) * 100 : 0;

  const recipe = activeRecipe !== null ? recipes.find(r => r.id === activeRecipe) : null;

  return (
    <div className={s.root}>
      <div className={s.header}>
        <div className={s.eyebrow}>Week of June 2</div>
        <div className={s.title}>Meal Plan</div>
        <div className={s.subtitle}>5 dinners · Mon–Fri lunches covered</div>
        <div className={s.tabs}>
          {(['meals', 'grocery'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setActiveRecipe(null); }}
              className={`${s.tab} ${tab === t ? s.tabActive : ''}`}
            >
              {t === 'meals' ? 'Recipes' : 'Grocery List'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'meals' && !recipe && (
        <div className={`${s.section} ${s.mealsList}`}>
          {recipes.map(r => (
            <button key={r.id} onClick={() => setActiveRecipe(r.id)} className={s.recipeCard}>
              <div className={s.recipeCardHead}>
                <div className={s.eyebrow}>{r.day}</div>
                <span className={s.tag}>{r.tag}</span>
              </div>
              <div className={s.recipeName}>{r.title}</div>
              <div className={s.meta}>
                <span>{r.protein}</span>
                <span>{r.time}</span>
              </div>
            </button>
          ))}
          <div className={s.lunchCard}>
            <div className={s.eyebrow}>Mon–Fri Lunches</div>
            <div className={s.lunchName}>Leftovers or Salad Bowls</div>
            <div className={s.lunchBody}>Rotate between leftover dinner portions and the salad bags with sliced chicken.</div>
          </div>
        </div>
      )}

      {tab === 'meals' && recipe && (
        <div className={s.section}>
          <IonButton className={s.backBtn} fill="clear" onClick={() => setActiveRecipe(null)}>Back to meals</IonButton>
          <div className={s.eyebrow}>{recipe.day}</div>
          <div className={s.detailName}>{recipe.title}</div>
          <div className={s.detailMeta}>
            <span>{recipe.protein}</span>
            <span>{recipe.time}</span>
            <span className={s.tagAccent}>{recipe.tag}</span>
          </div>
          <div className={s.blockLabel}>Ingredients</div>
          <div className={s.ingredientsCard}>
            {recipe.ingredients.map((ing, i) => (
              <div key={i} className={s.ingredientRow}>
                <span className={s.dash}>—</span>
                <span className={s.ingredientText}>{ing}</span>
              </div>
            ))}
          </div>
          <div className={s.blockLabel}>Steps</div>
          <div className={s.stepsList}>
            {recipe.steps.map((step, i) => (
              <div key={i} className={s.stepRow}>
                <div className={s.stepNum}>{i + 1}</div>
                <div className={s.stepText}>{step}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'grocery' && (
        <div className={s.section}>
          <div className={s.progressCard}>
            <div className={s.progressRow}>
              <span className={s.progressLabel}>Still need to grab</span>
              <span className={s.progressCount}>{totalChecked} / {totalNeeded}</span>
            </div>
            <div className={s.barTrack}>
              <div className={s.barFill} style={{ width: `${pct}%` }} />
            </div>
          </div>
          {groceryCategories.map(cat => (
            <div key={cat.category} className={s.catBlock}>
              <div className={s.catLabel}>{cat.category}</div>
              <div className={s.listFrame}>
                {cat.items.map((item, i) => {
                  const key = `${cat.category}-${i}`;
                  const isChecked = !!checked[key];
                  return (
                    <div key={i} onClick={() => toggleCheck(key)} className={s.itemRow}>
                      <div className={`${s.check} ${isChecked ? s.checkOn : ''}`}>
                        {isChecked && <span className={s.checkMark}>✓</span>}
                      </div>
                      <span className={isChecked ? s.itemTextDone : s.itemText}>{item}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div className={s.catBlock}>
            <div className={s.catLabel}>Already Have</div>
            <div className={s.listFrame}>
              {alreadyHave.map((item, i) => (
                <div key={i} className={s.haveRow}>
                  <div className={s.haveCheck}>
                    <span className={s.haveMark}>✓</span>
                  </div>
                  <span className={s.haveText}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
