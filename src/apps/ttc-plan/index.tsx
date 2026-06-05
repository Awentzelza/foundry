
import { useState } from 'react';
import { IonSegment, IonSegmentButton, IonLabel, IonBadge } from '@ionic/react';
import s from './styles.module.css';

const months = [
  {
    number: 8,
    label: 'Month 8',
    theme: 'Foundation Reset',
    focus: 'Optimize supplements, clean up diet fully, use Mira Ultra4 to build your hormonal baseline.',
    her: {
      supplements: [
        { name: 'Perelel Fertility Support Pack', timing: 'AM with food', note: 'Continue — well formulated' },
        { name: 'Perelel Conception Support Pack', timing: 'As directed', note: 'Continue' },
        { name: 'Perelel Hormone Balance', timing: 'As directed', note: 'Continue' },
        { name: 'Whole Food Vitamin D', timing: 'With a fatty meal', note: 'Already taking — keep going' },
        { name: 'Magnesium glycinate', timing: 'Before bed', note: 'Already taking — supports progesterone, sleep, and stress' },
      ],
      diet: [
        'Switch to organic for Dirty Dozen produce',
        'Add daily spinach or kale for folate',
        'Full-fat dairy: Greek yogurt, whole milk',
        'Walnuts and pumpkin seeds as daily snacks',
        'Reduce refined carbs — swap white rice for quinoa',
        'Morning half-caf or decaf latte: approx 30-50mg caffeine, well under 200mg daily limit',
        'Afternoon matcha: approx 30-40mg caffeine, good antioxidant profile',
        'Total daily caffeine target: stay under 150-200mg — your current routine is well-calibrated',
        'Choose Swiss Water Process decaf for lowest chemical exposure',
        'Hydrate: 2-2.5L water daily for cervical mucus quality',
      ],
      tracking: [
        'Mira Ultra4: begin testing from CD6 to build your personal hormonal baseline',
        'Mira tracks FSH, LH, E3G, and PdG — use it across the full cycle',
        'Watch E3G rise (estrogen surge) — precedes LH peak by 1-2 days',
        'Confirm LH peak with Mira, then time intercourse: day before, day of, day after',
        'After ovulation: track PdG rise to confirm ovulation quality',
        'Note cervical mucus changes alongside Mira data',
      ],
      lifestyle: [
        'Moderate exercise only: yoga, walking, light weights',
        'Prioritize 7-9hrs sleep — magnesium at night will help',
        'Begin daily stress management: 10min meditation or breathwork',
        'Avoid hot tubs and excessive heat',
      ],
    },
    him: {
      supplements: [
        { name: "FullWell Men's Multivitamin", timing: '2 caps AM, 2 caps with lunch', note: 'Top pick — swap to this from Gorilla Mind' },
        { name: 'FullWell Fertility Booster', timing: '2 caps daily', note: 'Adds CoQ10, NAC, ALA, Ashwagandha for sperm DNA protection' },
        { name: '365 Whole Foods Fish Oil', timing: 'With dinner', note: 'Keep — good omega-3 source' },
        { name: 'Magnesium glycinate', timing: 'Before bed', note: 'Already taking — supports testosterone, sleep, and stress reduction' },
      ],
      diet: [
        '2-3 Brazil nuts daily — selenium for sperm DNA integrity',
        'Pumpkin seeds: zinc for testosterone and sperm count',
        'Fatty fish 3x/week: salmon, sardines, mackerel',
        'Eggs daily: choline, vitamin E, and protein',
        'Lycopene foods: cooked tomatoes, watermelon',
        'Reduce processed meats and fried foods',
        'Antioxidant smoothie: spinach, berries, flaxseed',
        '1-2 cups coffee per day is fine — keep total caffeine under 200mg',
      ],
      lifestyle: [
        'Switch to boxers to reduce scrotal heat',
        'No laptop directly on lap',
        'Avoid hot baths and hot tubs',
        'Regular sleep schedule — magnesium at night helps',
        'Moderate exercise — avoid excessive cycling',
        'Sperm quality drops under chronic stress — manage it actively',
      ],
    },
    together: [
      'Schedule intercourse every other day during the fertile window — use Mira to time precisely',
      'Use Conceive Plus or Pre-Seed lubricant (sperm-safe)',
      'Consider getting a semen analysis — Legacy or Fellow are HSA/FSA eligible with clinic-grade results',
      'Swap plastic containers for glass and filter tap water',
      'Your morning latte routine is well within safe caffeine limits — no need to change',
    ],
  },
  {
    number: 9,
    label: 'Month 9',
    theme: 'Optimize and Assess',
    focus: 'Deepen lifestyle habits, review your Mira hormonal data, consider at-home sperm test.',
    her: {
      supplements: [
        { name: 'Perelel full stack', timing: 'As directed', note: 'Continue all three' },
        { name: 'Whole Food Vitamin D', timing: 'With a fatty meal', note: 'Continue — get levels tested at OB visit if possible' },
        { name: 'Magnesium', timing: 'Before bed', note: 'Continue — supports progesterone, sleep, and cortisol' },
      ],
      diet: [
        'Mediterranean plate as default: olive oil, vegetables, lean protein, legumes',
        'Add lentils or chickpeas 4x/week for iron and folate',
        'Eat a wide variety of vegetables daily',
        'Prioritize wild-caught salmon over tuna (lower mercury)',
        'Pomegranate juice for antioxidants and uterine lining support',
        'Reduce sugar — swap for fruit',
        'Morning latte and afternoon matcha remain your ideal caffeine rhythm',
        'If going fully decaf, choose Swiss Water Process brands',
      ],
      tracking: [
        'Mira Ultra4: by now you have one full cycle of data — review your hormonal trends',
        'Check PdG levels 7-10 days post-ovulation — should show a clear rise',
        'Track FSH at cycle start (CD2-3) — rising FSH is worth sharing with your OB',
        'Note cycle length consistency — should be within 2 days each month',
        'Track luteal phase using PdG: aim for 12-14 days of elevated PdG post-ovulation',
        'Export your Mira app data to share with your OB',
      ],
      lifestyle: [
        'Add acupuncture if accessible — evidence supports fertility benefits',
        'Journaling or therapy to manage the emotional toll of TTC',
        'Avoid NSAIDs like ibuprofen around ovulation — may inhibit ovulation',
        'No castor oil packs or herbal teas not cleared by your OB',
      ],
    },
    him: {
      supplements: [
        { name: "FullWell Men's Multivitamin", timing: 'Continue', note: 'Month 2 — sperm quality improvements are building' },
        { name: 'FullWell Fertility Booster', timing: 'Continue', note: 'Sperm cycle is approx 74 days — stay consistent' },
        { name: 'Fish Oil omega-3', timing: 'With dinner', note: 'Consider upgrading to triglyceride form for better absorption' },
        { name: 'Magnesium', timing: 'Before bed', note: 'Continue — good for testosterone and sleep quality' },
      ],
      diet: [
        'Double down on antioxidant-rich foods',
        'Dark chocolate 70% or higher — flavonoids support blood flow',
        'Avocado: healthy fats, vitamin E, folate',
        'Beets: nitric oxide precursor for blood flow support',
        'Cut out or minimize ultra-processed snacks',
        'Limit large amounts of soy foods due to phytoestrogens',
        'Keep coffee to 1-2 cups per day',
      ],
      lifestyle: [
        'At-home sperm test this month: Legacy or Fellow — HSA/FSA eligible, CLIA-certified',
        'Legacy tests count, motility, and morphology — the most important metrics',
        'Track sleep: aim for 7-8hrs minimum',
        'Mindfulness or meditation to reduce cortisol',
      ],
    },
    together: [
      'Review your Mira app data together — compare this cycle to last month',
      'Maintain intercourse every other day in the 5-day fertile window — use E3G rise as your early cue',
      'Avoid commercial lubricants — use Pre-Seed or coconut oil',
      'Consider booking a preconception consult — bring your Mira data',
      'Check in emotionally with each other — TTC stress is real for both partners',
    ],
  },
  {
    number: 10,
    label: 'Month 10',
    theme: 'Medical Partnership',
    focus: 'Maximize natural efforts and loop in your OB — bring your Mira data as your evidence base.',
    her: {
      supplements: [
        { name: 'Perelel full stack', timing: 'Continue all', note: 'Maintain' },
        { name: 'Whole Food Vitamin D', timing: 'With fatty meal', note: 'Continue — ask OB to test serum levels' },
        { name: 'Magnesium', timing: 'Before bed', note: 'Continue — especially important for luteal phase support' },
        { name: 'Inositol Myo + D-Chiro blend', timing: 'As directed', note: 'Consider if Mira shows irregular FSH or luteal phase issues' },
      ],
      diet: [
        'Request blood work: ferritin, vitamin D, thyroid TSH, AMH, fasting glucose',
        'Eat anti-inflammatory: turmeric, ginger, berries, olive oil',
        'Maximize whole food folate sources',
        'Your latte and matcha routine remains balanced and sustainable',
        'Continue Mediterranean-style foundation',
      ],
      tracking: [
        'Mira Ultra4: export your 3-cycle hormonal report to share with your OB',
        'Highlight any cycles where PdG did not rise adequately in the luteal phase',
        'Confirm FSH trend from CD2-3 data across months 8-10',
        'Consider a day 3 FSH and estradiol blood draw if OB recommends — compare to your Mira FSH',
        'Progesterone blood draw at 7DPO to cross-validate your Mira PdG readings',
      ],
      lifestyle: [
        'Schedule an OB or REI appointment — you will hit 12 months in two more cycles',
        'Keep emotional wellness a priority — see a therapist if needed',
        'Reduce intense cardio — moderate is optimal for fertility',
        'Continue acupuncture if you started in Month 9',
      ],
    },
    him: {
      supplements: [
        { name: "FullWell Men's Multivitamin", timing: 'Continue', note: 'Month 3 — sperm quality improvements are now peaking' },
        { name: 'FullWell Fertility Booster', timing: 'Continue', note: '3-month mark is when CoQ10 shows measurable results in sperm' },
        { name: 'Fish Oil', timing: 'Continue', note: 'Maintain' },
        { name: 'Magnesium', timing: 'Before bed', note: 'Continue — supports overall hormonal health' },
        { name: 'L-Carnitine optional', timing: '500-1000mg daily', note: 'Evidence-backed for motility if sperm test showed low motility' },
      ],
      diet: [
        'Continue antioxidant-rich, Mediterranean approach',
        'Add maca root powder to smoothies for libido and sperm quality support',
        'Oysters once per week if possible: highest natural zinc source',
        'No processed deli meats — linked to poor morphology',
        'Coffee habit remains fine — no need to change',
      ],
      lifestyle: [
        'Repeat at-home sperm test or request formal semen analysis from urologist',
        'Share results with OB or REI — bring alongside her Mira data for full picture',
        'Aim to be in the best physical shape of the TTC journey',
        'Sleep, stress management, and heat avoidance all remain important',
      ],
    },
    together: [
      'At 12 months, seek formal fertility evaluation — both partners tested simultaneously',
      'His: semen analysis. Hers: bloodwork, ultrasound, and tubal check if needed',
      'Bring three months of Mira data — it gives your OB a real hormonal picture, not just one blood draw',
      'Continue all lifestyle and supplement habits through any evaluation',
      '80-85% of couples conceive within 12-18 months — you are doing everything right',
    ],
  },
];

type SectionKey = 'her' | 'him' | 'together';

export default function TTCPlan() {
  const [activeMonth, setActiveMonth] = useState(0);
  const [activeSection, setActiveSection] = useState<SectionKey>('her');
  const m = months[activeMonth];

  return (
    <div className={s.root}>
      <div className={s.monthBar}>
        {months.map((mo, i) => (
          <button
            key={i}
            className={i === activeMonth ? `${s.monthBtn} ${s.monthBtnActive}` : s.monthBtn}
            onClick={() => { setActiveMonth(i); setActiveSection('her'); }}
          >
            <span className={s.monthNum}>{mo.number}</span>
            <span className={s.monthTheme}>{mo.theme}</span>
          </button>
        ))}
      </div>

      <div className={s.focusCard}>
        <div className={s.focusEyebrow}>Month {m.number} Focus</div>
        <p className={s.focusText}>{m.focus}</p>
      </div>

      <IonSegment
        value={activeSection}
        onIonChange={e => setActiveSection(e.detail.value as SectionKey)}
        className={s.segment}
      >
        <IonSegmentButton value="her"><IonLabel>Her Plan</IonLabel></IonSegmentButton>
        <IonSegmentButton value="him"><IonLabel>His Plan</IonLabel></IonSegmentButton>
        <IonSegmentButton value="together"><IonLabel>Together</IonLabel></IonSegmentButton>
      </IonSegment>

      {activeSection === 'her' && (
        <div className={s.sections}>
          <Section title="Supplements">
            {m.her.supplements.map((sup, i) => (
              <SupRow key={i} name={sup.name} timing={sup.timing} note={sup.note} last={i === m.her.supplements.length - 1} />
            ))}
          </Section>
          <Section title="Diet and Nutrition"><BulletList items={m.her.diet} /></Section>
          <Section title="Cycle Tracking — Mira Ultra4"><BulletList items={m.her.tracking} /></Section>
          <Section title="Lifestyle"><BulletList items={m.her.lifestyle} /></Section>
        </div>
      )}

      {activeSection === 'him' && (
        <div className={s.sections}>
          <Section title="Supplements">
            {m.him.supplements.map((sup, i) => (
              <SupRow key={i} name={sup.name} timing={sup.timing} note={sup.note} last={i === m.him.supplements.length - 1} />
            ))}
          </Section>
          <Section title="Diet and Nutrition"><BulletList items={m.him.diet} /></Section>
          <Section title="Lifestyle"><BulletList items={m.him.lifestyle} /></Section>
        </div>
      )}

      {activeSection === 'together' && (
        <div className={s.sections}>
          <Section title="As a Couple This Month">
            {m.together.map((item, i) => (
              <div key={i} className={i < m.together.length - 1 ? `${s.togetherRow} ${s.togetherRowBorder}` : s.togetherRow}>
                <IonBadge className={s.togetherNum}>{i + 1}</IonBadge>
                <span className={s.togetherText}>{item}</span>
              </div>
            ))}
          </Section>
          <div className={s.closingCard}>
            <p className={s.closingTitle}>You are doing so much right.</p>
            <p className={s.closingBody}>
              At 27, with regular ovulation, the Mira Ultra4 for precision tracking, and both of you
              dialed into supplements and diet — the odds are genuinely in your favor. Most couples
              conceive within 12-18 months. The FullWell sperm benefits peak right at months 10-11.
              You are right on track.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={s.card}>
      <div className={s.cardTitle}>{title}</div>
      {children}
    </div>
  );
}

function SupRow({ name, timing, note, last }: { name: string; timing: string; note: string; last: boolean }) {
  return (
    <div className={last ? s.supRow : `${s.supRow} ${s.supRowBorder}`}>
      <div className={s.supTop}>
        <span className={s.supName}>{name}</span>
        <IonBadge className={s.timingBadge}>{timing}</IonBadge>
      </div>
      <span className={s.supNote}>{note}</span>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <div className={s.bulletList}>
      {items.map((item, i) => (
        <div key={i} className={s.bulletRow}>
          <div className={s.bullet} />
          <span className={s.bulletText}>{item}</span>
        </div>
      ))}
    </div>
  );
}
