import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApplicationService } from '../shared/services/application.service';

@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss']
})
export class LandingComponent implements OnInit {

  constructor(
    private router: Router,
    protected applicationService: ApplicationService
  ) { }

  ngOnInit(): void {

  }

  navigate(value: string): void {
    sessionStorage.setItem('appId', value);
    this.router.navigate([value]);
  }

}
