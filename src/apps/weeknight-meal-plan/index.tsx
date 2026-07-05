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
    id: 'sun', day: 'Sunday', title: 'Seared Salmon, Lemon-Butter Pan Sauce, Herbed Quinoa',
    tag: 'Guest night', note: 'Same plate for everyone. Hits the omega-3 target from the fertility plan.',
    ingredients: [
      '3 salmon fillets, skin-on', '1 cup quinoa', '2 cups chicken or vegetable stock',
      '4 tbsp unsalted butter', '1 lemon, juiced and zested', '2 garlic cloves, minced',
      '1 tbsp capers', '2 tbsp fresh parsley, chopped', '2 tbsp olive oil',
      '5 oz arugula', '1 fennel bulb, shaved thin', '1 tsp salt', '1/2 tsp black pepper',
    ],
    steps: [
      { title: 'Cook quinoa', content: 'Rinse the quinoa, combine with stock in a pot, bring to a boil, cover, and simmer until absorbed, about 15 min.' },
      { title: 'Dry and season salmon', content: 'Pat salmon completely dry. Season both sides with salt and pepper. Let sit 10 min at room temp.' },
      { title: 'Sear skin-side down', content: 'Heat cast iron over medium-high with olive oil. Lay salmon skin-side down, press flat for the first 30 sec. Cook undisturbed until crisp, about 5 min.' },
      { title: 'Flip and finish', content: 'Flip salmon, cook 2-3 more minutes until just cooked through. Remove to a plate.' },
      { title: 'Build pan sauce', content: 'Lower heat, add butter to the pan. Once foaming, add garlic, cook 30 sec, then capers, lemon juice and zest. Swirl to combine.' },
      { title: 'Finish quinoa', content: 'Fluff quinoa, stir in parsley and remaining olive oil.' },
      { title: 'Toss salad', content: 'Toss arugula and shaved fennel with olive oil, lemon, and salt.' },
      { title: 'Plate', content: 'Spoon pan sauce over salmon, serve with quinoa and salad.' },
    ],
  },
  {
    id: 'mon', day: 'Monday', title: 'Pan-Seared Chicken Thighs, White Wine Pan Sauce, French Lentils',
    tag: 'Weeknight', note: 'Lentils replace rice, more fiber and protein.',
    ingredients: [
      '6 bone-in, skin-on chicken thighs', '1/2 cup dry white wine', '1/2 cup chicken stock',
      '3 tbsp unsalted butter', '1 shallot, minced', '2 garlic cloves, minced', '3 sprigs fresh thyme',
      '1 cup green or French lentils', '1 lb broccoli florets', '3 tbsp olive oil',
      '1 1/2 tsp salt', '1/2 tsp black pepper',
    ],
    steps: [
      { title: 'Cook lentils', content: 'Simmer lentils in salted water until tender but not mushy, about 25 min, then drain.' },
      { title: 'Roast broccoli', content: 'Toss broccoli with olive oil, salt, pepper. Roast at 425F until charred at the edges, about 20 min.' },
      { title: 'Sear chicken skin-side down', content: 'Pat thighs dry, season. Place skin-side down in a cold cast iron pan, turn heat to medium. Render slowly until crisp, about 10 min.' },
      { title: 'Flip and finish', content: 'Flip thighs, cook until internal temp hits 175F, about 8 min. Remove, tent with foil.' },
      { title: 'Build pan sauce', content: 'Pour off excess fat, leaving a thin layer. Add shallot, cook until soft, then garlic and thyme. Deglaze with wine, reduce by half.' },
      { title: 'Finish sauce', content: 'Add stock, simmer to reduce slightly, then swirl in butter off heat until glossy.' },
      { title: 'Plate', content: 'Serve chicken over lentils with broccoli, spoon pan sauce over the top.' },
    ],
  },
  {
    id: 'tue', day: 'Tuesday', title: 'Beef and Black Bean Skillet with Lime Crema',
    tag: 'Weeknight', note: 'Beans cut the saturated fat load per serving.',
    ingredients: [
      '1 lb ground beef (85/15)', '1 cup black beans, drained and rinsed', '1 yellow onion, diced',
      '1 bell pepper, diced', '3 garlic cloves, minced', '1 tbsp cumin', '1 tsp smoked paprika',
      '1 tsp chili powder', '1 lime, juiced', '1/3 cup plain full-fat Greek yogurt',
      '6 corn tortillas', '1 tbsp olive oil', '1 tsp salt', '2 tbsp fresh cilantro, chopped',
    ],
    steps: [
      { title: 'Saute aromatics', content: 'Heat olive oil in cast iron over medium. Add onion and bell pepper, cook until softened, about 5 min.' },
      { title: 'Brown beef', content: 'Add ground beef, breaking it up, cook until browned, about 7 min. Drain excess fat if needed.' },
      { title: 'Season and add beans', content: 'Stir in garlic, cumin, smoked paprika, chili powder, salt. Add black beans, cook until warmed through and slightly thickened.' },
      { title: 'Make lime crema', content: 'Whisk Greek yogurt with lime juice and a pinch of salt.' },
      { title: 'Warm tortillas', content: 'Char tortillas directly over a burner flame or in a dry skillet.' },
      { title: 'Serve', content: 'Spoon beef and bean mixture over tortillas, top with lime crema and cilantro.' },
    ],
  },
];

const shoppingList: { [category: string]: string[] } = {
  Produce: ['1 lemon', '1 lime', '1 fennel bulb', 'Fresh parsley', 'Fresh thyme', 'Fresh cilantro', '5 oz arugula', '1 shallot', '1 yellow onion', '1 bell pepper', '1 head garlic', '1 lb broccoli florets'],
  Protein: ['3 salmon fillets, skin-on', '6 bone-in, skin-on chicken thighs', '1 lb ground beef (85/15)'],
  'Pantry and Dairy': ['1 cup quinoa', '1 cup green or French lentils', '1 can black beans', 'Corn tortillas', 'Unsalted butter', 'Olive oil', 'Capers', 'Dry white wine', 'Chicken or vegetable stock', 'Cumin', 'Smoked paprika', 'Chili powder', 'Salt', 'Black pepper', 'Plain full-fat Greek yogurt'],
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
      }}>Dinners this week</div>
      <div style={{
        fontFamily: 'var(--foundry-font-display)', fontSize: 26, fontWeight: 700,
        color: 'var(--foundry-text)', letterSpacing: '-0.01em', marginBottom: 20,
      }}>Sunday, Monday, Tuesday</div>

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
            {'< All recipes'}
          </IonButton>

          <div style={{
            background: 'var(--foundry-card)', border: '1px solid var(--foundry-border)',
            borderRadius: 'var(--foundry-radius-md)', padding: 18, marginBottom: 16,
          }}>
            <div style={{ fontFamily: 'var(--foundry-font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--foundry-ember)', marginBottom: 6 }}>
              {activeRecipe.day}
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
