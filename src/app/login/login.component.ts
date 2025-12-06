import { AfterViewInit, Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
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
    protected authenticationService: AuthenticationService,
    protected applicationService: ApplicationService
  ) {
    this.applicationService.loading.set(true);
  }

  public async ngAfterViewInit(): Promise<void> {
    const code: string = await firstValueFrom(this.route.queryParams)['code'];
    if (code) {
      await this.authenticationService.requestTokens(code);
      this.router.navigate([sessionStorage.getItem(AppConstants.KEY_ACTIVE_APP_ID) ?? '']);
    } else {
      this.applicationService.loading.set(false);
    }
  }

}
