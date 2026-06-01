import { useCallback } from 'react';
import { IonButton } from '@ionic/react';
import { useAppData } from '@/hooks/useAppData';
interface State { n: number }
export default function PingApp() {
  const { value, setValue, ready } = useAppData<State>('ping', 'state', { n: 0 });
  const ping = useCallback(() => setValue({ n: value.n + 1 }), [value, setValue]);
  if (!ready) return null;
  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--foundry-font-display)', fontSize: 64, color: 'var(--foundry-text)' }}>{value.n}</div>
      <IonButton onClick={ping}>ping</IonButton>
    </div>
  );
}