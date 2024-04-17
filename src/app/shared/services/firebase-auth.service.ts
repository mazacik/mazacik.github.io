import { Injectable, WritableSignal, signal } from "@angular/core";
import { Auth, GoogleAuthProvider, User, browserLocalPersistence } from "@angular/fire/auth";
import * as firebaseui from 'firebaseui';
import { FirebaseAuthResult } from "src/app/shared/classes/firebase-auth-result.interface";

@Injectable({
  providedIn: 'root',
})
export class FirebaseAuthService {

  private readonly localStorageKeyUser: string = 'firebase-user';

  public readonly userS: WritableSignal<User> = signal(JSON.parse(localStorage.getItem(this.localStorageKeyUser)));

  constructor(
    private auth: Auth
  ) {
    this.auth.setPersistence(browserLocalPersistence);
    this.auth.onAuthStateChanged(user => this.userS.set(user));
  }

  public logout(): void {
    localStorage.removeItem(this.localStorageKeyUser);
    this.auth.signOut();
  }

  public createButton(element: string | Element, redirectUrl?: string, onsuccess?: (result: FirebaseAuthResult) => void, onshow?: () => void): void {
    (firebaseui.auth.AuthUI.getInstance() || new firebaseui.auth.AuthUI(this.auth)).start(element, {
      callbacks: {
        uiShown: onshow,
        signInSuccessWithAuthResult: (result: FirebaseAuthResult) => {
          localStorage.setItem(this.localStorageKeyUser, JSON.stringify(result.user));
          if (onsuccess) onsuccess(result);
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

  public async awaitUser(): Promise<User> {
    await this.auth.authStateReady();
    return this.auth.currentUser;
  }

}
