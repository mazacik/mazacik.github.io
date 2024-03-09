import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { environment } from "src/environments/environment";

@Injectable({
  providedIn: 'root',
})
export class AuthenticationService {

  private readonly CLIENT_ID: string = '692582629035-s6vftm7t7erhlblg9iekl0fhfhdskq25.apps.googleusercontent.com';
  private readonly CLIENT_SECRET: string = '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';

  private accessToken: string;
  private refreshToken: string;

  constructor(
    private http: HttpClient
  ) { }

  getAccessToken(): string {
    return this.accessToken;
  }

  startAuthentication(): void {
    const clientId: string = "692582629035-s6vftm7t7erhlblg9iekl0fhfhdskq25.apps.googleusercontent.com";
    const redirect_uri: string = environment.redirect_uri;
    const scope: string = "https://www.googleapis.com/auth/drive";
    const url: string = "https://accounts.google.com/o/oauth2/v2/auth?redirect_uri=" + redirect_uri
      + "&prompt=consent&response_type=code&client_id=" + clientId + "&scope=" + scope
      + "&access_type=offline";
    window.location = url as unknown as Location;
  }

  async requestTokens(code: string): Promise<void> {
    const url: string = 'https://accounts.google.com/o/oauth2/token';
    const body = {
      'content-type': 'form-data',
      'grant_type': 'authorization_code',
      'code': code,
      'client_id': this.CLIENT_ID,
      'client_secret': this.CLIENT_SECRET,
      'redirect_uri': environment.redirect_uri,
      'plugin_name': 'TagalleryWeb'
    };

    await firstValueFrom(this.http.post<{ access_token: string, refresh_token: string }>(url, body)).then(response => {
      if (response) {
        this.accessToken = response.access_token;
        this.refreshToken = response.refresh_token;
        window.localStorage.setItem('googleRefreshToken', this.refreshToken);
      }
    }).catch(error => error);
  }

  async requestAccessToken(): Promise<string> {
    const url: string = 'https://accounts.google.com/o/oauth2/token';
    const body = {
      'grant_type': 'refresh_token',
      'refresh_token': this.getRefreshToken(),
      'client_id': this.CLIENT_ID,
      'client_secret': this.CLIENT_SECRET
    };

    await firstValueFrom(this.http.post<{ access_token: string }>(url, body)).then(response => {
      if (response) {
        this.accessToken = response.access_token;
      }
    }).catch(error => error);

    return this.accessToken;
  }

  getRefreshToken(): string {
    if (!this.refreshToken) this.refreshToken = window.localStorage.getItem('googleRefreshToken');
    return this.refreshToken;
  }

}
