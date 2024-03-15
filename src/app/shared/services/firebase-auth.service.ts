import { Injectable } from "@angular/core";
import { Auth, GoogleAuthProvider, User, browserLocalPersistence } from "@angular/fire/auth";
import * as firebaseui from 'firebaseui';
import { FirebaseAuthResult } from "src/app/shared/classes/firebase-auth-result.interface";

@Injectable({
  providedIn: 'root',
})
export class FirebaseAuthService {

  constructor(
    private auth: Auth
  ) {
    this.auth.setPersistence(browserLocalPersistence);
  }

  private isMessenger(): boolean {
    for (const userAgent of ['FB_IAB', 'FBAN', 'FBAV', 'FB4A', 'MESSENGER']) {
      if (navigator.userAgent.includes(userAgent)) {
        return true;
      }
    }
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
      signInFlow: this.isMessenger() ? 'redirect' : 'popup',
      signInSuccessUrl: redirectUrl,
      signInOptions: [
        GoogleAuthProvider.PROVIDER_ID
      ]
    });
  }

  public hasLocalStorageEntry(): boolean {
    return localStorage.getItem('firebase-user') != null;
  }

  public async awaitUser(): Promise<User> {
    await this.auth.authStateReady();
    return this.auth.currentUser;
  }

  public getUser(): User {
    return this.auth.currentUser;
  }

}
