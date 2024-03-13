import { Injectable, WritableSignal, signal } from "@angular/core";
import { Auth, GoogleAuthProvider, User, browserLocalPersistence, onAuthStateChanged } from "@angular/fire/auth";
import * as firebaseui from 'firebaseui';
import { FirebaseAuthResult } from "src/app/shared/classes/firebase-auth-result.interface";

@Injectable({
  providedIn: 'root',
})
export class FirebaseAuthService {

  private user: WritableSignal<User> = signal(null);

  constructor(
    private auth: Auth
  ) {
    this.auth.setPersistence(browserLocalPersistence);
    onAuthStateChanged(this.auth, user => this.user.set(user));
  }

  public logout(): void {
    localStorage.removeItem('firebase-user');
    this.auth.signOut();
  }

  public createButton(element: string | Element, redirectUrl?: string, onsuccess?: (result: FirebaseAuthResult) => void, onshow?: () => void): void {
    (firebaseui.auth.AuthUI.getInstance() || new firebaseui.auth.AuthUI(this.auth)).start(element, {
      callbacks: {
        uiShown: onshow,
        signInSuccessWithAuthResult: (result: FirebaseAuthResult) => {
          if (onsuccess) onsuccess(result);
          localStorage.setItem('firebase-user', result.user.uid);
          return redirectUrl ? true : false;
        }
      },
      signInFlow: 'popup',
      signInSuccessUrl: redirectUrl,
      signInOptions: [
        GoogleAuthProvider.PROVIDER_ID
      ]
    });
  }

  public hasLocalStorageEntry(): boolean {
    return localStorage.getItem('firebase-user') != null;
  }

  public getUser(): User {
    return this.user();
  }

  public getUserSignal(): WritableSignal<User> {
    return this.user;
  }

}
