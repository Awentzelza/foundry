import { useCallback } from 'react';
import { IonButton } from '@ionic/react';
import { useAppData } from '@/hooks/useAppData';
interface State { n: number }
export default function CounterApp() {
  const { value, setValue, ready } = useAppData<State>('counter', 'state', { n: 0 });
  const inc = useCallback(() => setValue({ n: value.n + 1 }), [value, setValue]);
  if (!ready) return null;
  return (
    <div style={{ padding: 32, textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--foundry-font-display)', fontSize: 72 }}>{value.n}</div>
      <IonButton onClick={inc}>+1</IonButton>
    </div>
  );
}