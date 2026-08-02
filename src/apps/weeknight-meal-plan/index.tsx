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
    id: 'sun-dinner', day: 'Sunday', title: 'Greek Chicken Bowls', tag: 'Dinner',
    note: 'Marinated chicken over rice with a full Greek spread. Cook extra chicken for snacking.',
    ingredients: [
      '2 lb boneless chicken thighs or breasts', '3 tbsp olive oil', '2 lemons, juiced',
      '4 garlic cloves, minced', '1 tbsp dried oregano', '1 tsp salt', '1/2 tsp black pepper',
      '2 cups cooked rice or quinoa', '1 cucumber, diced', '1 cup cherry tomatoes, halved',
      '1/2 red onion, sliced thin', '1/2 cup kalamata olives', '3/4 cup feta, crumbled',
      '1 cup tzatziki',
    ],
    steps: [
      { title: 'Marinate', content: 'Whisk olive oil, lemon juice, garlic, oregano, salt, and pepper. Coat chicken and marinate 20 min minimum.' },
      { title: 'Cook chicken', content: 'Grill or sear over medium-high heat until internal temp hits 165F, about 6-7 min per side depending on thickness.' },
      { title: 'Rest and slice', content: 'Rest chicken 5 min, then slice.' },
      { title: 'Build bowls', content: 'Layer rice, sliced chicken, cucumber, tomatoes, red onion, and olives.' },
      { title: 'Finish', content: 'Top with feta and a generous spoon of tzatziki.' },
    ],
  },
  {
    id: 'mush-mon-tue', day: 'Monday - Tuesday', title: 'Mush', tag: 'Breakfast',
    note: 'Ready-to-eat, zero prep. Grab and go both mornings.',
    ingredients: ['2 servings Mush'],
    steps: [
      { title: 'Serve', content: 'No prep needed. Grab a Mush pouch each morning.' },
    ],
  },
  {
    id: 'mon-lunch', day: 'Monday', title: 'Co-op Salad Kit + Protein', tag: 'Lunch',
    note: 'Grab a salad kit from the Boise co-op, add leftover chicken or another protein on hand. No prep, no recipe needed.',
    ingredients: ['1 salad kit (Boise co-op)', 'Leftover chicken or protein of choice'],
    steps: [
      { title: 'Assemble', content: 'Toss the salad kit as directed on the package, add sliced protein on top.' },
    ],
  },
  {
    id: 'mon-dinner', day: 'Monday', title: 'Reverse-Seared Steak with Chimichurri', tag: 'Dinner',
    note: 'Sweet potato and sauteed kale on the side.',
    ingredients: [
      '2 steaks (ribeye or sirloin)', '2 sweet potatoes', '1 bunch kale, stemmed and chopped',
      '1 cup parsley, finely chopped', '3 garlic cloves, minced', '2 tbsp red wine vinegar',
      '1/2 cup olive oil', '1/2 tsp red pepper flakes', '1 tsp salt', '1/2 tsp black pepper',
    ],
    steps: [
      { title: 'Roast sweet potatoes', content: 'Cube sweet potatoes, toss with olive oil and salt, roast at 425F for 25-30 min.' },
      { title: 'Reverse sear', content: 'Season steaks, place in a 250F oven until internal temp hits 115F, about 25-30 min.' },
      { title: 'Sear', content: 'Heat cast iron until ripping hot, sear steaks 60-90 sec per side for a deep crust.' },
      { title: 'Make chimichurri', content: 'Combine parsley, garlic, red wine vinegar, olive oil, red pepper flakes, salt, and pepper.' },
      { title: 'Saute kale', content: 'Quick saute kale in the steak pan drippings, 2-3 min, until just wilted.' },
      { title: 'Plate', content: 'Rest steak 5 min, slice against the grain, top with chimichurri, serve with sweet potato and kale.' },
    ],
  },
  {
    id: 'tue-lunch', day: 'Tuesday', title: 'Co-op Salad Kit + Protein', tag: 'Lunch',
    note: 'Same approach as Monday. Grab a different kit for variety, add leftover steak or chicken.',
    ingredients: ['1 salad kit (Boise co-op)', 'Leftover steak or protein of choice'],
    steps: [
      { title: 'Assemble', content: 'Toss the salad kit as directed on the package, add sliced protein on top.' },
    ],
  },
  {
    id: 'tue-dinner', day: 'Tuesday', title: 'Chicken Thighs with Mustard-Herb Pan Sauce', tag: 'Dinner',
    note: 'Different prep from Sunday to keep the week from feeling repetitive.',
    ingredients: [
      '6 bone-in, skin-on chicken thighs', '2 tbsp dijon mustard', '3/4 cup chicken stock',
      '2 tbsp unsalted butter', '2 garlic cloves, minced', '1 tbsp fresh thyme or 1 tsp dried',
      '1 tsp salt', '1/2 tsp black pepper', '1 lb green beans or asparagus',
    ],
    steps: [
      { title: 'Season and sear', content: 'Pat thighs dry, season with salt and pepper. Sear skin-side down in cast iron over medium-high until crisp, about 8 min.' },
      { title: 'Oven finish', content: 'Flip thighs, transfer skillet to a 400F oven. Roast 15-18 min until internal temp hits 175F.' },
      { title: 'Pan sauce', content: 'Remove chicken to rest. Deglaze pan with stock and garlic, whisk in dijon and thyme, reduce slightly, finish with butter.' },
      { title: 'Cook vegetable', content: 'Saute or roast green beans or asparagus while the sauce reduces.' },
      { title: 'Plate', content: 'Serve chicken with pan sauce spooned over, alongside the vegetable.' },
    ],
  },
];

const shoppingList: { [category: string]: string[] } = {
  Produce: [
    '2 lemons', '5 garlic cloves', '1 cucumber', '1 cup cherry tomatoes', '1/2 red onion',
    '2 sweet potatoes', '1 bunch kale', '1 cup parsley', '1 lb green beans or asparagus',
  ],
  Protein: [
    '2 lb boneless chicken thighs or breasts', '2 steaks (ribeye or sirloin)',
    '6 bone-in, skin-on chicken thighs',
  ],
  'Boise Co-op': [
    '2 salad kits (variety for Mon and Tue)',
  ],
  'Pantry and Dairy': [
    '2 cups rice or quinoa', '1/2 cup kalamata olives', '1 cup feta', '1 cup tzatziki',
    'Dijon mustard', 'Chicken stock', 'Unsalted butter', 'Olive oil', 'Red wine vinegar',
    'Dried oregano', 'Fresh or dried thyme', 'Salt', 'Black pepper', 'Red pepper flakes',
    '2 servings Mush',
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
      }}>Sunday through Tuesday</div>

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
