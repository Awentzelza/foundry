import { useState } from 'react';
import { IonButton, IonCheckbox } from '@ionic/react';
import { useAppData } from '@/hooks/useAppData';

interface Step { title: string; content: string; }
interface Recipe {
  id: string; day: string; title: string; tag: string; note: string;
  ingredients: string[]; steps: Step[];
}
interface Checked { [key: string]: boolean; }

const recipes: Recipe[] = [
  {
    id: 'sun-dinner', day: 'Sunday', title: 'Mediterranean Herb-Roasted Chicken Thighs', tag: 'Dinner',
    note: 'Cook extra thighs. Shredded leftovers cover lunch salads through Wednesday.',
    ingredients: [
      '8 bone-in, skin-on chicken thighs', '2 lemons, juiced', '6 garlic cloves, minced',
      '2 tbsp dried oregano', '3 tbsp olive oil', '1 cup chicken stock', '2 tbsp unsalted butter',
      '5 oz baby spinach', '1 can chickpeas, drained', '1 tsp salt', '1/2 tsp black pepper',
    ],
    steps: [
      { title: 'Season', content: 'Pat thighs completely dry. Season both sides with salt, pepper, and half the oregano.' },
      { title: 'Sear', content: 'Heat olive oil in cast iron over medium-high. Place thighs skin-side down, render until crisp, about 8 min.' },
      { title: 'Oven finish', content: 'Flip thighs, transfer skillet to a 400F oven. Roast 15-18 min until internal temp hits 175F.' },
      { title: 'Pan sauce', content: 'Remove chicken to rest. Deglaze the pan with stock, lemon juice, and garlic. Reduce, then swirl in butter.' },
      { title: 'Wilt spinach', content: 'Quick saute the spinach in the same pan, 1-2 min, until just wilted.' },
      { title: 'Plate and reserve', content: 'Serve chicken over spinach and chickpeas with sauce spooned on top. Shred and refrigerate 4-5 extra thighs for the week.' },
    ],
  },
  {
    id: 'oats-batch', day: 'Mon - Tue - Wed', title: 'Overnight Oats', tag: 'Breakfast',
    note: 'One batch Sunday night covers all three mornings.',
    ingredients: [
      '3 cups rolled oats', '3 cups whole milk', '1 1/2 cups Greek yogurt',
      '3/4 cup walnuts, chopped', '1 1/2 cups mixed berries', '3 tbsp honey, optional', 'Pinch of salt',
    ],
    steps: [
      { title: 'Combine', content: 'Sunday night, whisk oats, milk, yogurt, and salt together in a large container.' },
      { title: 'Divide', content: 'Split the mixture evenly into three jars or containers.' },
      { title: 'Top', content: 'Add walnuts and berries to each. Drizzle with honey if using. Refrigerate overnight.' },
      { title: 'Serve', content: 'Grab and go each morning. Stir before eating.' },
    ],
  },
  {
    id: 'mon-lunch', day: 'Monday', title: 'Chicken and Chickpea Salad', tag: 'Lunch',
    note: 'Built on Sunday leftovers.',
    ingredients: [
      'Reserved chicken from Sunday', '1/2 cup chickpeas', '4 cups mixed greens',
      '1/4 cup crumbled feta', '1/2 cucumber, diced', '2 tbsp olive oil', '1 lemon, juiced',
    ],
    steps: [
      { title: 'Assemble', content: 'Combine greens, chicken, chickpeas, cucumber, and feta in a bowl.' },
      { title: 'Dress', content: 'Toss with olive oil and lemon juice. Season to taste.' },
    ],
  },
  {
    id: 'tue-lunch', day: 'Tuesday', title: 'Chicken Avocado Salad', tag: 'Lunch',
    note: 'Still working through Sunday leftovers.',
    ingredients: [
      'Reserved chicken from Sunday', '1 avocado, sliced', '4 cups mixed greens',
      '1 cup cherry tomatoes, halved', '2 tbsp olive oil', '1 tbsp red wine vinegar',
    ],
    steps: [
      { title: 'Assemble', content: 'Combine greens, chicken, avocado, and tomatoes in a bowl.' },
      { title: 'Dress', content: 'Toss with olive oil and red wine vinegar.' },
    ],
  },
  {
    id: 'tue-dinner', day: 'Tuesday', title: 'Seared Steak with Quinoa and Asparagus', tag: 'Dinner',
    note: 'Keeps the ground beef and steak count on pace for the week.',
    ingredients: [
      '2 steaks (ribeye or sirloin)', '1 cup quinoa', '2 cups chicken stock', '1 bunch asparagus, trimmed',
      '2 tbsp olive oil', '2 tbsp unsalted butter', '2 garlic cloves', '1 tsp salt', '1/2 tsp black pepper',
    ],
    steps: [
      { title: 'Cook quinoa', content: 'Rinse quinoa, combine with stock in a pot, bring to a boil, cover, and simmer until absorbed, about 15 min.' },
      { title: 'Season steak', content: 'Pat steaks dry, season generously with salt and pepper. Rest at room temperature 15 min.' },
      { title: 'Sear', content: 'Heat cast iron until ripping hot. Sear steaks 3-4 min per side for medium-rare, basting with butter and garlic in the final minute.' },
      { title: 'Roast asparagus', content: 'Toss asparagus with olive oil, salt, and pepper. Roast at 425F for 10-12 min, or sear in the same pan after the steak rests.' },
      { title: 'Rest and plate', content: 'Rest steak 5 min, slice against the grain, and serve over quinoa with asparagus.' },
    ],
  },
  {
    id: 'wed-lunch', day: 'Wednesday', title: 'Chicken Caesar-Style Salad', tag: 'Lunch',
    note: 'Closes out the Sunday chicken batch.',
    ingredients: [
      'Reserved chicken from Sunday', '1 head romaine, chopped', '1/3 cup shaved parmesan',
      '3 tbsp olive oil', '1 lemon, juiced', '1 tsp dijon mustard', '1 garlic clove, minced',
    ],
    steps: [
      { title: 'Assemble', content: 'Combine chopped romaine, chicken, and parmesan in a bowl.' },
      { title: 'Dress', content: 'Whisk olive oil, lemon juice, dijon, and garlic. Toss with the salad.' },
    ],
  },
];

const shoppingList: { [category: string]: string[] } = {
  Produce: [
    '2 lemons', '1 head garlic', '5 oz baby spinach', '8 cups mixed greens', '1/2 cucumber',
    '1 avocado', '1 cup cherry tomatoes', '1 head romaine', '1 bunch asparagus', '1 1/2 cups mixed berries',
  ],
  Protein: ['8 bone-in, skin-on chicken thighs', '2 steaks (ribeye or sirloin)'],
  'Pantry and Dairy': [
    '3 cups rolled oats', '3 cups whole milk', '1 1/2 cups Greek yogurt', '3/4 cup walnuts',
    'Honey', '1 can chickpeas', '1/4 cup feta', '1/3 cup parmesan', '1 cup quinoa',
    '3 cups chicken stock', 'Unsalted butter', 'Olive oil', 'Red wine vinegar', 'Dijon mustard',
    'Dried oregano', 'Salt', 'Black pepper',
  ],
};

interface PlanState { checked: Checked; }

export default function WeeknightMealPlan() {
  const { value, setValue, ready } = useAppData<PlanState>('weeknight-meal-plan', 'state', { checked: {} });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [showIngredients, setShowIngredients] = useState(true);

  if (ready === false) return null;

  const toggleCheck = (key: string) => {
    setValue({ checked: { ...value.checked, [key]: value.checked[key] === true ? false : true } });
  };

  const openRecipe = (id: string) => {
    setActiveId(id);
    setStepIndex(0);
    setShowIngredients(true);
  };

  const activeRecipe = recipes.find((r) => r.id === activeId) || null;

  return (
    <div style={{ padding: 20, maxWidth: 520, margin: '0 auto' }}>
      <div style={{
        fontFamily: 'var(--foundry-font-mono)', fontSize: 10, letterSpacing: '0.18em',
        textTransform: 'uppercase', color: 'var(--foundry-text-subtle)', marginBottom: 4,
      }}>Meals this week</div>
      <div style={{
        fontFamily: 'var(--foundry-font-display)', fontSize: 26, fontWeight: 700,
        color: 'var(--foundry-text)', letterSpacing: '-0.01em', marginBottom: 20,
      }}>Sunday through Wednesday</div>

      {activeRecipe === null && (
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
            {recipes.map((r) => (
              <button
                key={r.id}
                onClick={() => openRecipe(r.id)}
                style={{
                  textAlign: 'left', cursor: 'pointer',
                  background: 'var(--foundry-card)', border: '1px solid var(--foundry-border)',
                  borderRadius: 'var(--foundry-radius-md)', padding: 16,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                }}
              >
                <div>
                  <div style={{ fontFamily: 'var(--foundry-font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--foundry-ember)', marginBottom: 4 }}>
                    {r.day} - {r.tag}
                  </div>
                  <div style={{ fontFamily: 'var(--foundry-font-display)', fontSize: 16, fontWeight: 700, color: 'var(--foundry-text)', marginBottom: 4 }}>{r.title}</div>
                  <div style={{ fontFamily: 'var(--foundry-font-body)', fontSize: 13, color: 'var(--foundry-text-muted)' }}>{r.note}</div>
                </div>
                <span style={{ color: 'var(--foundry-text-subtle)', flexShrink: 0, fontSize: 20 }}>{'>'}</span>
              </button>
            ))}
          </div>

          <div style={{
            background: 'var(--foundry-card)', border: '1px solid var(--foundry-border)',
            borderRadius: 'var(--foundry-radius-md)', padding: 20,
          }}>
            <div style={{ fontFamily: 'var(--foundry-font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--foundry-text-subtle)', marginBottom: 14 }}>
              Shopping list
            </div>
            {Object.entries(shoppingList).map(([category, items]) => (
              <div key={category} style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: 'var(--foundry-font-body)', fontSize: 12, fontWeight: 700, color: 'var(--foundry-text-muted)', marginBottom: 8 }}>{category}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {items.map((item) => {
                    const key = category + '-' + item;
                    const isChecked = value.checked[key] === true;
                    return (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <IonCheckbox checked={isChecked} onIonChange={() => toggleCheck(key)} />
                        <span style={{
                          fontFamily: 'var(--foundry-font-body)', fontSize: 14,
                          color: isChecked ? 'var(--foundry-text-subtle)' : 'var(--foundry-text)',
                          textDecoration: isChecked ? 'line-through' : 'none',
                        }}>{item}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeRecipe && (
        <div>
          <IonButton fill="clear" onClick={() => setActiveId(null)} style={{ '--color': 'var(--foundry-ember)', marginLeft: -12 }}>
            {'< All meals'}
          </IonButton>

          <div style={{
            background: 'var(--foundry-card)', border: '1px solid var(--foundry-border)',
            borderRadius: 'var(--foundry-radius-md)', padding: 18, marginBottom: 16,
          }}>
            <div style={{ fontFamily: 'var(--foundry-font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--foundry-ember)', marginBottom: 6 }}>
              {activeRecipe.day} - {activeRecipe.tag}
            </div>
            <div style={{ fontFamily: 'var(--foundry-font-display)', fontSize: 18, fontWeight: 700, color: 'var(--foundry-text)' }}>
              {activeRecipe.title}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <IonButton
              expand="block" fill={showIngredients === true ? 'solid' : 'outline'}
              style={{ flex: 1, '--background': showIngredients === true ? 'var(--foundry-ember)' : 'transparent', '--color': showIngredients === true ? 'var(--foundry-bg)' : 'var(--foundry-ember)', '--border-color': 'var(--foundry-ember)' }}
              onClick={() => setShowIngredients(true)}
            >Ingredients</IonButton>
            <IonButton
              expand="block" fill={showIngredients === false ? 'solid' : 'outline'}
              style={{ flex: 1, '--background': showIngredients === false ? 'var(--foundry-ember)' : 'transparent', '--color': showIngredients === false ? 'var(--foundry-bg)' : 'var(--foundry-ember)', '--border-color': 'var(--foundry-ember)' }}
              onClick={() => setShowIngredients(false)}
            >{'Cook ' + (stepIndex + 1) + ' of ' + activeRecipe.steps.length}</IonButton>
          </div>

          {showIngredients === true && (
            <div style={{ background: 'var(--foundry-card)', border: '1px solid var(--foundry-border)', borderRadius: 'var(--foundry-radius-md)', padding: 18 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {activeRecipe.ingredients.map((item, i) => (
                  <div key={i} style={{ fontFamily: 'var(--foundry-font-body)', fontSize: 14, color: 'var(--foundry-text)' }}>
                    {'- ' + item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {showIngredients === false && (
            <div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 16, justifyContent: 'center' }}>
                {activeRecipe.steps.map((_, i) => (
                  <div key={i} style={{
                    width: i === stepIndex ? 18 : 8, height: 8, borderRadius: 4,
                    background: i <= stepIndex ? 'var(--foundry-ember)' : 'var(--foundry-border)',
                  }} />
                ))}
              </div>
              <div style={{
                background: 'var(--foundry-card)', border: '1px solid var(--foundry-border)',
                borderRadius: 'var(--foundry-radius-md)', padding: 24, minHeight: 140,
                display: 'flex', flexDirection: 'column', justifyContent: 'center', marginBottom: 16,
              }}>
                <div style={{ fontFamily: 'var(--foundry-font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--foundry-ember)', marginBottom: 8 }}>
                  {'Step ' + (stepIndex + 1) + ': ' + activeRecipe.steps[stepIndex].title}
                </div>
                <div style={{ fontFamily: 'var(--foundry-font-body)', fontSize: 16, color: 'var(--foundry-text)', lineHeight: 1.6 }}>
                  {activeRecipe.steps[stepIndex].content}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <IonButton fill="outline" style={{ flex: 1, '--border-color': 'var(--foundry-border)', '--color': 'var(--foundry-text)' }}
                  disabled={stepIndex === 0} onClick={() => setStepIndex(Math.max(0, stepIndex - 1))}>
                  {'< Back'}
                </IonButton>
                <IonButton style={{ flex: 1, '--background': 'var(--foundry-ember)', '--color': 'var(--foundry-bg)' }}
                  disabled={stepIndex === activeRecipe.steps.length - 1}
                  onClick={() => setStepIndex(Math.min(activeRecipe.steps.length - 1, stepIndex + 1))}>
                  {(stepIndex === activeRecipe.steps.length - 1 ? 'Done' : 'Next >')}
                </IonButton>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
