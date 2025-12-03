import { AfterViewInit, Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AppConstants } from '../shared/constants/app.constants';
import { ApplicationService } from '../shared/services/application.service';
import { AuthenticationService } from '../shared/services/authentication.serivce';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: false
})
export class LoginComponent implements AfterViewInit {

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authenticationService: AuthenticationService,
    applicationService: ApplicationService
  ) {
    applicationService.loading.set(false);
  }

  ngAfterViewInit(): void {
    this.route.queryParams.subscribe(params => {
      const code: string = params['code'];
      if (code) {
        this.authenticationService.requestTokens(code).finally(() => this.router.navigate([sessionStorage.getItem(AppConstants.KEY_ACTIVE_APP_ID) ?? '']));
      }
    });
  }

  protected signIn() {
    this.authenticationService.startAuthentication();
  }

}
