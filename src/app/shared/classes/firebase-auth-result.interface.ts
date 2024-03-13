export interface FirebaseAuthResult {
  user: {
    displayName: string;
    email: string;
    emailVerified: boolean;
    metadata: {
      createdAt: string;
      creationTime: string;
      lastLoginAt: string;
      lastSignInTime: string;
    }
    photoURL: string;
    providerData: {
      displayName: string;
      email: string;
      photoURL: string;
      providerId: string;
      uid: string;
    }[]
    providerId: string;
    refreshToken: string;
    uid: string;
  }
  credential: {
    accessToken: string;
    idToken: string;
    providerId: string;
    signInMethod: string;
  }
  additionalUserInfo: {
    isNewUser: boolean;
    profile: {
      email: string;
      family_name: string;
      given_name: string;
      id: string;
      locale: string;
      name: string;
      picture: string;
      verified_email: string;
    }
    providerId: string;
  }
}