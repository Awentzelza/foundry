import { useCallback, useState } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { Redirect } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/session';

/**
 * Magic-link login. The calm gatehouse to the Foundry: enter an email, receive
 * a one-time link. No passwords. Brand voice — steward, not coach.
 */
export default function Login() {
  const { session, ready } = useSession();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const send = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = email.trim();
      if (!trimmed || !supabase) return;
      setState('sending');
      setMessage(null);
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) {
        setState('error');
        setMessage(error.message);
      } else {
        setState('sent');
      }
    },
    [email],
  );

  if (ready && session) return <Redirect to="/" />;

  return (
    <IonPage>
      <IonContent fullscreen>
        <div className="foundry-login">
          <div className="foundry-login__card">
            <span className="foundry-mark" aria-hidden>
              <span className="foundry-mark__f">F</span>
            </span>
            <p className="foundry-login__eyebrow">Private · Established 2026</p>
            <h1 className="foundry-login__title">Foundry</h1>

            {state === 'sent' ? (
              <p className="foundry-login__body">
                A sign-in link is on its way to {email.trim()}. Open it on this
                device to enter.
              </p>
            ) : (
              <>
                <p className="foundry-login__body">
                  Enter your email and a one-time link will be sent.
                </p>
                <form onSubmit={send} className="foundry-login__form">
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    required
                    placeholder="you@example.com"
                    className="foundry-input"
                    value={email}
                    onChange={(ev) => setEmail(ev.target.value)}
                    disabled={state === 'sending'}
                  />
                  <button
                    type="submit"
                    className="foundry-btn"
                    disabled={state === 'sending' || !email.trim()}
                  >
                    {state === 'sending' ? 'Sending' : 'Send link'}
                  </button>
                </form>
                {state === 'error' && message ? (
                  <p className="foundry-login__error">{message}</p>
                ) : null}
              </>
            )}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
