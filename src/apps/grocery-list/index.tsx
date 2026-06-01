/**
 * Grocery List — Foundry seed app.
 *
 * Conventions every Foundry app should follow:
 *   - Default export is a functional component with no required props.
 *   - Use IonContent-friendly markup (no <html>/<body>).
 *   - Persist state via `useAppData` so it survives reloads + devices.
 *   - Never hard-delete; archive instead (handled inside useAppData).
 */
import { useCallback, useMemo, useState } from 'react';
import {
  IonButton,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonReorder,
  IonReorderGroup,
  IonText,
  IonToolbar,
  type ItemReorderEventDetail,
} from '@ionic/react';
import { add, checkmarkCircle, ellipseOutline, trashOutline } from 'ionicons/icons';

import { useAppData } from '@/hooks/useAppData';

interface GroceryItem {
  id: string;
  text: string;
  checked: boolean;
  createdAt: number;
}

const APP_ID = 'grocery-list';
const DATA_KEY = 'items';

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function GroceryListApp() {
  const { value: items, setValue, ready, persistent } = useAppData<GroceryItem[]>(
    APP_ID,
    DATA_KEY,
    [],
  );
  const [draft, setDraft] = useState('');

  const checkedCount = useMemo(() => items.filter((i) => i.checked).length, [items]);

  const addItem = useCallback(async () => {
    const text = draft.trim();
    if (!text) return;
    const next: GroceryItem[] = [
      ...items,
      { id: uid(), text, checked: false, createdAt: Date.now() },
    ];
    setDraft('');
    await setValue(next);
  }, [draft, items, setValue]);

  const toggle = useCallback(
    async (id: string) => {
      await setValue(items.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)));
    },
    [items, setValue],
  );

  const clearChecked = useCallback(async () => {
    await setValue(items.filter((i) => !i.checked));
  }, [items, setValue]);

  const handleReorder = useCallback(
    async (e: CustomEvent<ItemReorderEventDetail>) => {
      const { from, to } = e.detail;
      const next = [...items];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      e.detail.complete();
      await setValue(next);
    },
    [items, setValue],
  );

  return (
    <div style={{ padding: '16px 0 32px' }}>
      <div style={{ padding: '0 16px 12px' }}>
        <IonToolbar
          style={{
            '--background': 'var(--foundry-bg-card)',
            borderRadius: 'var(--foundry-radius-md)',
            border: '1px solid var(--foundry-border)',
            padding: '4px 8px',
          }}
        >
          <IonInput
            value={draft}
            placeholder="Add item…"
            onIonInput={(e) => setDraft((e.target as HTMLIonInputElement).value as string)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void addItem();
            }}
            aria-label="New grocery item"
            style={{ '--padding-start': '4px' }}
          />
          <IonButton
            slot="end"
            fill="solid"
            color="primary"
            disabled={!draft.trim()}
            onClick={() => void addItem()}
            aria-label="Add"
          >
            <IonIcon slot="icon-only" icon={add} />
          </IonButton>
        </IonToolbar>
      </div>

      {!ready ? null : items.length === 0 ? (
        <div className="foundry-empty" style={{ margin: '24px 16px' }}>
          <p className="foundry-empty__eyebrow">Grocery List</p>
          <h2 className="foundry-empty__title">Nothing here.</h2>
          <p className="foundry-empty__body">Add an item above.</p>
        </div>
      ) : (
        <>
          <IonList inset>
            <IonReorderGroup disabled={false} onIonItemReorder={handleReorder}>
              {items.map((item) => (
                <IonItem key={item.id} button onClick={() => void toggle(item.id)}>
                  <IonIcon
                    slot="start"
                    icon={item.checked ? checkmarkCircle : ellipseOutline}
                    color={item.checked ? 'primary' : 'medium'}
                  />
                  <IonLabel>
                    <span
                      style={{
                        textDecoration: item.checked ? 'line-through' : 'none',
                        color: item.checked
                          ? 'var(--foundry-text-dim)'
                          : 'var(--foundry-text)',
                      }}
                    >
                      {item.text}
                    </span>
                  </IonLabel>
                  <IonReorder slot="end" />
                </IonItem>
              ))}
            </IonReorderGroup>
          </IonList>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 20px 0',
            }}
          >
            <IonNote>
              {checkedCount}/{items.length} checked
            </IonNote>
            <IonButton
              fill="clear"
              color="medium"
              disabled={checkedCount === 0}
              onClick={() => void clearChecked()}
              size="small"
            >
              <IonIcon slot="start" icon={trashOutline} />
              Clear checked
            </IonButton>
          </div>
        </>
      )}

      {!persistent && (
        <IonText color="warning">
          <p style={{ padding: '0 20px', fontSize: 12 }}>
            Supabase is not configured. Items remain only in this session.
          </p>
        </IonText>
      )}
    </div>
  );
}
