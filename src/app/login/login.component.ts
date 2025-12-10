import { AfterViewInit, Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
    const code: string = this.route.snapshot.queryParams['code'];
    if (code) {
      await this.authenticationService.requestTokens(code);
      this.router.navigate(['']);
    } else {
      this.applicationService.loading.set(false);
    }
  }

}
