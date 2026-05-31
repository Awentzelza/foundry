import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react';

export default function NotFound() {
  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/" text="" />
          </IonButtons>
          <IonTitle>
            <span className="foundry-app-toolbar-title">Not found</span>
          </IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div className="foundry-empty">
          <h2 className="foundry-empty__title">Nothing here.</h2>
          <p className="foundry-empty__body">
            This tool hasn't been forged — or it's been archived.
          </p>
        </div>
      </IonContent>
    </IonPage>
  );
}
