import { AfterViewInit, Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthenticationService } from '../shared/services/authentication.serivce';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements AfterViewInit {

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authenticationService: AuthenticationService
  ) { }

  ngAfterViewInit(): void {
    this.route.queryParams.subscribe(params => {
      const code: string = params['code'];
      if (code) {
        this.authenticationService.requestTokens(code).finally(() => {
          this.router.navigate([sessionStorage.getItem('appId') || '']);
        });
      }
    });
  }

  signIn() {
    this.authenticationService.startAuthentication();
  }

}
